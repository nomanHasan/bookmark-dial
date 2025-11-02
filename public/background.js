const FOLDER_TITLE = "Bookmark Dial";
const STORAGE_KEY = "speedDialFolderId";
const PREF_KEY = "dialPreferences";
const PREF_VERSION = 1;

async function ensureSpeedDialFolder() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) {
    const folder = await lookupFolderById(stored[STORAGE_KEY]);
    if (folder && folder.title === FOLDER_TITLE) {
      await seedDialPreferences(folder.id);
      return folder.id;
    }
  }

  const existing = await findFolderByTitle(FOLDER_TITLE);
  if (existing) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: existing.id });
    await seedDialPreferences(existing.id);
    return existing.id;
  }

  const created = await chrome.bookmarks.create({
    parentId: "1",
    title: FOLDER_TITLE,
  });
  await chrome.storage.sync.set({ [STORAGE_KEY]: created.id });
  await seedDialPreferences(created.id);
  return created.id;
}

async function lookupFolderById(id) {
  try {
    const nodes = await chrome.bookmarks.get(id);
    const node = nodes?.[0];
    if (node && !node.url) {
      return node;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function findFolderByTitle(title) {
  try {
    const tree = await chrome.bookmarks.getTree();
    const stack = [...tree];
    while (stack.length) {
      const node = stack.pop();
      if (node && !node.url && node.title === title) {
        return node;
      }
      if (node?.children?.length) {
        stack.push(...node.children);
      }
    }
  } catch (error) {
    console.warn("Bookmark Dial: searching folder failed", error);
  }
  return null;
}

async function handleRemovedFolder(id) {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY] || stored[STORAGE_KEY] !== id) {
    return;
  }
  await chrome.storage.sync.remove(STORAGE_KEY);
  await ensureSpeedDialFolder();
}

async function seedDialPreferences(folderId) {
  try {
    const stored = await chrome.storage.sync.get(PREF_KEY);
    const prefs = stored?.[PREF_KEY];
    const next = prefs && typeof prefs === "object" ? { ...prefs } : {};
    const selectedIds = Array.isArray(next.folderSelection?.selectedIds)
      ? [...next.folderSelection.selectedIds]
      : [];
    if (!selectedIds.includes(folderId)) {
      selectedIds.push(folderId);
    }
    const expandedIds = Array.isArray(next.folderSelection?.expandedIds)
      ? [...next.folderSelection.expandedIds]
      : [];
    next.folderSelection = {
      selectedIds,
      expandedIds,
    };
    if (!next.theme) {
      next.theme = "system";
    }
    if (!next.accent) {
      next.accent = "cobalt";
    }
    const fallbackBackground = { mode: "gradient", gradientId: "aurora" };
    if (!next.background) {
      next.background = fallbackBackground;
    } else {
      next.background = {
        mode: next.background.mode === "custom" ? "custom" : "gradient",
        gradientId: next.background.gradientId || fallbackBackground.gradientId,
      };
    }
    next.version = typeof next.version === "number" ? next.version : PREF_VERSION;
    await chrome.storage.sync.set({ [PREF_KEY]: next });
  } catch (error) {
    console.warn("Bookmark Dial: failed to seed dial preferences", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureSpeedDialFolder().catch((error) => {
    console.error("Bookmark Dial: failed to prepare folder on install", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureSpeedDialFolder().catch((error) => {
    console.error("Bookmark Dial: failed to prepare folder on startup", error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getFolderId") {
    ensureSpeedDialFolder()
      .then((folderId) => sendResponse({ folderId }))
      .catch((error) => {
        console.error("Bookmark Dial: getFolderId error", error);
        sendResponse({ error: error?.message || "Folder unavailable" });
      });
    return true;
  }
  if (message?.type === "resetFolderCache") {
    chrome.storage.sync.remove(STORAGE_KEY).then(() => {
      ensureSpeedDialFolder()
        .then((folderId) => sendResponse({ folderId }))
        .catch((error) => {
          console.error("Bookmark Dial: reset error", error);
          sendResponse({ error: error?.message || "Unable to reset" });
        });
    });
    return true;
  }
  return false;
});

chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  if (!removeInfo?.node || removeInfo.node.url) {
    return;
  }
  try {
    await handleRemovedFolder(id);
  } catch (error) {
    console.error("Bookmark Dial: handleRemovedFolder failed", error);
  }
});
