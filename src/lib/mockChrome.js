/**
 * Bookmark Dial - Mock Chrome APIs
 *
 * Mock implementation of Chrome extension APIs for development/testing.
 * This allows the extension to run in a regular browser context.
 */

import {
  SYNC_SETTINGS_KEY,
  STORAGE_VERSION,
  DEFAULT_SETTINGS,
} from './constants.js';
import { developerTools } from '../data/mock.js';
import { literatureLinks } from '../data/literature.js';

export function createMockChrome() {
  console.info("Bookmark Dial: using mock Chrome APIs for development");
  let mockFolderId = "mock-folder";
  let counter = 1;

  const listeners = {
    onCreated: new Set(),
    onChanged: new Set(),
    onMoved: new Set(),
    onRemoved: new Set(),
    onImportBegan: new Set(),
    onImportEnded: new Set(),
  };

  const storageListeners = new Set();
  const mockStorageLocal = new Map();
  const mockStorageSync = new Map([
    ["speedDialFolderId", mockFolderId],
    [
      SYNC_SETTINGS_KEY,
      {
        version: STORAGE_VERSION,
        theme: DEFAULT_SETTINGS.theme,
        accent: DEFAULT_SETTINGS.accent,
        titleBackdrop: DEFAULT_SETTINGS.titleBackdrop,
        mergeAllBookmarks: DEFAULT_SETTINGS.mergeAllBookmarks,
        background: { ...DEFAULT_SETTINGS.background },
        folderSelection: { selectedIds: [mockFolderId], expandedIds: [] },
      },
    ],
  ]);

  const nodesById = new Map();

  function emit(event, ...args) {
    const set = listeners[event];
    if (!set) {
      return;
    }
    set.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Mock chrome ${event} handler failed`, error);
      }
    });
  }

  function emitStorageChange(area, changes) {
    if (!changes || Object.keys(changes).length === 0) {
      return;
    }
    storageListeners.forEach((handler) => {
      try {
        handler(changes, area);
      } catch (error) {
        console.error("Mock chrome storage listener failed", error);
      }
    });
  }

  function cloneSerializable(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function storageGet(store, key) {
    if (Array.isArray(key)) {
      const result = {};
      key.forEach((k) => (result[k] = store.get(k)));
      return result;
    }
    if (typeof key === "object" && key !== null) {
      const result = { ...key };
      for (const k of Object.keys(key)) {
        if (store.has(k)) {
          result[k] = store.get(k);
        }
      }
      return result;
    }
    return { [key]: store.get(key) };
  }

  function storageSet(store, area, items) {
    const changes = {};
    Object.entries(items || {}).forEach(([key, value]) => {
      const oldValue = store.get(key);
      store.set(key, value);
      changes[key] = {
        oldValue: cloneSerializable(oldValue),
        newValue: cloneSerializable(value),
      };
    });
    emitStorageChange(area, changes);
  }

  function storageRemove(store, area, key) {
    const keys = Array.isArray(key) ? key : [key];
    const changes = {};
    keys.forEach((entry) => {
      if (!store.has(entry)) {
        return;
      }
      const oldValue = store.get(entry);
      store.delete(entry);
      changes[entry] = {
        oldValue: cloneSerializable(oldValue),
        newValue: undefined,
      };
    });
    emitStorageChange(area, changes);
  }

  function reindexChildren(parent) {
    if (!parent?.children) {
      return;
    }
    parent.children.forEach((child, index) => {
      child.index = index;
    });
    parent.hasChildren = parent.children.some((child) => !child.url);
  }

  function attachChild(parentId, node, index) {
    const parent = nodesById.get(parentId);
    if (!parent) {
      throw new Error(`Parent ${parentId} not found`);
    }
    if (!Array.isArray(parent.children)) {
      parent.children = [];
    }
    const insertIndex = typeof index === "number" ? Math.max(0, Math.min(index, parent.children.length)) : parent.children.length;
    parent.children.splice(insertIndex, 0, node);
    node.parentId = parentId;
    reindexChildren(parent);
  }

  function detachChild(parentId, nodeId) {
    const parent = nodesById.get(parentId);
    if (!parent?.children) {
      return;
    }
    const idx = parent.children.findIndex((child) => child.id === nodeId);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
      reindexChildren(parent);
    }
  }

  function createFolderNode({ id, parentId = null, title = "Untitled folder", index }) {
    const nodeId = id ?? `mock-folder-${counter++}`;
    const node = {
      id: nodeId,
      parentId,
      title,
      index: typeof index === "number" ? index : 0,
      children: [],
    };
    nodesById.set(nodeId, node);
    if (parentId) {
      attachChild(parentId, node, index);
    }
    return node;
  }

  function createBookmarkNode({ id, parentId, title, url, index }) {
    if (!parentId) {
      throw new Error("Bookmarks require a parent folder");
    }
    const nodeId = id ?? `mock-bookmark-${counter++}`;
    const node = {
      id: nodeId,
      parentId,
      title: title ?? url ?? "Untitled",
      url,
      index: typeof index === "number" ? index : 0,
    };
    nodesById.set(nodeId, node);
    attachChild(parentId, node, index);
    return node;
  }

  function cloneNode(node, includeChildren = false) {
    if (!node) {
      return null;
    }
    const base = {
      id: node.id,
      parentId: node.parentId ?? undefined,
      title: node.title,
      index: node.index,
    };
    if (node.url) {
      base.url = node.url;
    }
    if (includeChildren && Array.isArray(node.children)) {
      base.children = node.children.map((child) => cloneNode(child, true));
    }
    return base;
  }

  function deleteBranch(node) {
    if (!node) {
      return;
    }
    if (Array.isArray(node.children)) {
      [...node.children].forEach((child) => deleteBranch(child));
    }
    nodesById.delete(node.id);
  }

  const root = createFolderNode({ id: "0", parentId: null, title: "" });
  const bookmarksBar = createFolderNode({ id: "1", parentId: root.id, title: "Bookmarks Bar" });
  createFolderNode({ id: "2", parentId: root.id, title: "Other Bookmarks" });
  createFolderNode({ id: "3", parentId: root.id, title: "Mobile Bookmarks" });
  const readingListFolder = createFolderNode({ id: "1-reading", parentId: "1", title: "Reading List" });
  const inspirationFolder = createFolderNode({ id: "2-inspiration", parentId: "2", title: "Inspiration" });

  function populateDialFolder(folderId) {
    const baseBookmarks = [
      { title: "Svelte", url: "https://svelte.dev" },
      { title: "MDN Web Docs", url: "https://developer.mozilla.org" },
      { title: "GitHub", url: "https://github.com" },
      { title: "Stack Overflow", url: "https://stackoverflow.com" },
      { title: "Vite", url: "https://vitejs.dev" },
    ];
    baseBookmarks.forEach((item, index) => {
      createBookmarkNode({ parentId: folderId, title: item.title, url: item.url, index });
    });

    const frameworksFolder = createFolderNode({ id: `${folderId}-frameworks`, parentId: folderId, title: "Frameworks" });
    [
      { title: "React", url: "https://react.dev" },
      { title: "Vue.js", url: "https://vuejs.org" },
      { title: "Angular", url: "https://angular.io" },
      { title: "Ember.js", url: "https://emberjs.com" },
      { title: "Lit", url: "https://lit.dev" },
      { title: "Solid", url: "https://www.solidjs.com" },
      { title: "Alpine.js", url: "https://alpinejs.dev" },
      { title: "Preact", url: "https://preact.dev" },
      { title: "Backbone.js", url: "https://backbonejs.org" },
      { title: "jQuery", url: "https://jquery.com" },
      { title: "Next.js", url: "https://nextjs.org" },
      { title: "Nuxt.js", url: "https://nuxt.com" },
    ].forEach((item, index) => {
      createBookmarkNode({ parentId: frameworksFolder.id, title: item.title, url: item.url, index });
    });
  }

  createFolderNode({ id: mockFolderId, parentId: bookmarksBar.id, title: "Bookmark Dial" });
  populateDialFolder(mockFolderId);

  // Create Developer Tools folder in Bookmarks Bar (top level)
  const toolingFolder = createFolderNode({ id: "bookmarks-bar-tooling", parentId: bookmarksBar.id, title: "Developer Tools" });
  developerTools.forEach((item, index) => {
    createBookmarkNode({ parentId: toolingFolder.id, title: item.title, url: item.url, index });
  });

  // Populate intricate Reading List with 3 layers of nested folders
  // Layer 1: Fiction
  const fictionFolder = createFolderNode({ id: "reading-fiction", parentId: readingListFolder.id, title: "Fiction" });

  // Layer 2: Fiction - Classic Novels
  const classicNovelsFolder = createFolderNode({ id: "reading-fiction-classic", parentId: fictionFolder.id, title: "Classic Novels" });
  literatureLinks.fiction.classicNovels.forEach((item, index) => {
    createBookmarkNode({ parentId: classicNovelsFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Fiction - Modern Fiction
  const modernFictionFolder = createFolderNode({ id: "reading-fiction-modern", parentId: fictionFolder.id, title: "Modern Fiction" });
  literatureLinks.fiction.modernFiction.forEach((item, index) => {
    createBookmarkNode({ parentId: modernFictionFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Fiction - Short Stories
  const shortStoriesFolder = createFolderNode({ id: "reading-fiction-short", parentId: fictionFolder.id, title: "Short Stories" });
  literatureLinks.fiction.shortStories.forEach((item, index) => {
    createBookmarkNode({ parentId: shortStoriesFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 1: Non-Fiction
  const nonFictionFolder = createFolderNode({ id: "reading-nonfiction", parentId: readingListFolder.id, title: "Non-Fiction" });

  // Layer 2: Non-Fiction - Essays
  const essaysFolder = createFolderNode({ id: "reading-nonfiction-essays", parentId: nonFictionFolder.id, title: "Essays" });
  literatureLinks.nonFiction.essays.forEach((item, index) => {
    createBookmarkNode({ parentId: essaysFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Non-Fiction - Biography
  const biographyFolder = createFolderNode({ id: "reading-nonfiction-bio", parentId: nonFictionFolder.id, title: "Biography" });
  literatureLinks.nonFiction.biography.forEach((item, index) => {
    createBookmarkNode({ parentId: biographyFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Non-Fiction - History
  const historyFolder = createFolderNode({ id: "reading-nonfiction-history", parentId: nonFictionFolder.id, title: "History" });
  literatureLinks.nonFiction.history.forEach((item, index) => {
    createBookmarkNode({ parentId: historyFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 1: Poetry
  const poetryFolder = createFolderNode({ id: "reading-poetry", parentId: readingListFolder.id, title: "Poetry" });

  // Layer 2: Poetry - Classic Poetry
  const classicPoetryFolder = createFolderNode({ id: "reading-poetry-classic", parentId: poetryFolder.id, title: "Classic Poetry" });
  literatureLinks.poetry.classicPoetry.forEach((item, index) => {
    createBookmarkNode({ parentId: classicPoetryFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Poetry - Contemporary Poetry
  const contemporaryPoetryFolder = createFolderNode({ id: "reading-poetry-contemporary", parentId: poetryFolder.id, title: "Contemporary Poetry" });
  literatureLinks.poetry.contemporaryPoetry.forEach((item, index) => {
    createBookmarkNode({ parentId: contemporaryPoetryFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Poetry - Spoken Word
  const spokenWordFolder = createFolderNode({ id: "reading-poetry-spoken", parentId: poetryFolder.id, title: "Spoken Word" });
  literatureLinks.poetry.spokenWord.forEach((item, index) => {
    createBookmarkNode({ parentId: spokenWordFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 1: Academic
  const academicFolder = createFolderNode({ id: "reading-academic", parentId: readingListFolder.id, title: "Academic" });

  // Layer 2: Academic - Literary Criticism
  const literaryCriticismFolder = createFolderNode({ id: "reading-academic-criticism", parentId: academicFolder.id, title: "Literary Criticism" });
  literatureLinks.academic.literaryCriticism.forEach((item, index) => {
    createBookmarkNode({ parentId: literaryCriticismFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Academic - Literary Theory
  const literaryTheoryFolder = createFolderNode({ id: "reading-academic-theory", parentId: academicFolder.id, title: "Literary Theory" });
  literatureLinks.academic.literaryTheory.forEach((item, index) => {
    createBookmarkNode({ parentId: literaryTheoryFolder.id, title: item.title, url: item.url, index });
  });

  // Layer 2: Academic - Journals
  const journalsFolder = createFolderNode({ id: "reading-academic-journals", parentId: academicFolder.id, title: "Academic Journals" });
  literatureLinks.academic.journals.forEach((item, index) => {
    createBookmarkNode({ parentId: journalsFolder.id, title: item.title, url: item.url, index });
  });

  [
    { title: "Muz.li", url: "https://muz.li" },
    { title: "Awwwards", url: "https://www.awwwards.com" },
    { title: "Dribbble", url: "https://dribbble.com" },
  ].forEach((item, index) => {
    createBookmarkNode({ parentId: inspirationFolder.id, title: item.title, url: item.url, index });
  });

  function makeEvent(name) {
    const set = listeners[name];
    return {
      addListener: (fn) => set.add(fn),
      removeListener: (fn) => set.delete(fn),
    };
  }

  return {
    runtime: {
      sendMessage: async (message) => {
        if (message?.type === "getFolderId") {
          return { folderId: mockFolderId };
        }
        if (message?.type === "resetFolderCache") {
          const newFolderId = `mock-folder-${Date.now().toString(36)}`;
          const existing = nodesById.get(mockFolderId);
          if (existing) {
            const parentId = existing.parentId;
            if (parentId) {
              detachChild(parentId, existing.id);
            }
            deleteBranch(existing);
          }
          mockFolderId = newFolderId;
          const recreated = createFolderNode({ id: mockFolderId, parentId: "1", title: "Bookmark Dial" });
          populateDialFolder(recreated.id);
          storageSet(mockStorageSync, "sync", {
            speedDialFolderId: mockFolderId,
            [SYNC_SETTINGS_KEY]: {
              version: STORAGE_VERSION,
              theme: DEFAULT_SETTINGS.theme,
              accent: DEFAULT_SETTINGS.accent,
              titleBackdrop: DEFAULT_SETTINGS.titleBackdrop,
              mergeAllBookmarks: DEFAULT_SETTINGS.mergeAllBookmarks,
              background: { ...DEFAULT_SETTINGS.background },
              folderSelection: { selectedIds: [mockFolderId], expandedIds: [] },
            },
          });
          return { folderId: mockFolderId };
        }
        return {};
      },
    },
    bookmarks: {
      onCreated: makeEvent("onCreated"),
      onChanged: makeEvent("onChanged"),
      onMoved: makeEvent("onMoved"),
      onRemoved: makeEvent("onRemoved"),
      onImportBegan: makeEvent("onImportBegan"),
      onImportEnded: makeEvent("onImportEnded"),
      async getTree() {
        return [cloneNode(nodesById.get("0"), true)];
      },
      async getChildren(id) {
        const parent = nodesById.get(id);
        if (!parent?.children) {
          return [];
        }
        return parent.children.map((child) => cloneNode(child, false));
      },
      async getSubTree(id) {
        const node = nodesById.get(id);
        return node ? [cloneNode(node, true)] : [];
      },
      async search(info) {
        const query = String(info?.query ?? "").trim().toLowerCase();
        if (!query) {
          return [];
        }
        return Array.from(nodesById.values())
          .filter((node) => !node.url && (node.title || "").toLowerCase().includes(query))
          .map((node) => cloneNode(node, false));
      },
      async create({ parentId, title, url }) {
        const node = url
          ? createBookmarkNode({ parentId, title, url })
          : createFolderNode({ parentId, title });
        emit("onCreated", node.id, cloneNode(node, true));
        return cloneNode(node, true);
      },
      async update(id, changes = {}) {
        const node = nodesById.get(id);
        if (!node) {
          throw new Error("Bookmark not found");
        }
        const changeInfo = {};
        if (typeof changes.title === "string") {
          node.title = changes.title;
          changeInfo.title = changes.title;
        }
        if (typeof changes.url === "string") {
          node.url = changes.url;
          changeInfo.url = changes.url;
        }
        emit("onChanged", id, changeInfo);
        return cloneNode(node, false);
      },
      async remove(id) {
        const node = nodesById.get(id);
        if (!node) {
          throw new Error("Bookmark not found");
        }
        const snapshot = cloneNode(node, true);
        if (node.parentId) {
          detachChild(node.parentId, id);
        }
        deleteBranch(node);
        emit("onRemoved", id, { parentId: snapshot.parentId ?? null, node: snapshot });
      },
      async move(id, { parentId, index }) {
        const node = nodesById.get(id);
        if (!node) {
          throw new Error("Bookmark not found");
        }
        const oldParentId = node.parentId ?? null;
        if (oldParentId) {
          detachChild(oldParentId, id);
        }
        attachChild(parentId, node, index);
        emit("onMoved", id, { parentId, oldParentId, index });
        return cloneNode(node, false);
      },
      async get(id) {
        const node = nodesById.get(id);
        return node ? [cloneNode(node, false)] : [];
      },
    },
    storage: {
      local: {
        async get(key) {
          return storageGet(mockStorageLocal, key);
        },
        async set(items) {
          storageSet(mockStorageLocal, "local", items);
        },
        async remove(key) {
          storageRemove(mockStorageLocal, "local", key);
        },
      },
      sync: {
        async get(key) {
          return storageGet(mockStorageSync, key);
        },
        async set(items) {
          storageSet(mockStorageSync, "sync", items);
        },
        async remove(key) {
          storageRemove(mockStorageSync, "sync", key);
        },
      },
      onChanged: {
        addListener(fn) {
          storageListeners.add(fn);
        },
        removeListener(fn) {
          storageListeners.delete(fn);
        },
      },
    },
    topSites: {
      async get() {
        // Mock top sites for development
        return [
          { title: "Google", url: "https://www.google.com" },
          { title: "YouTube", url: "https://www.youtube.com" },
          { title: "Facebook", url: "https://www.facebook.com" },
          { title: "Twitter", url: "https://twitter.com" },
          { title: "Reddit", url: "https://www.reddit.com" },
          { title: "Wikipedia", url: "https://www.wikipedia.org" },
          { title: "Amazon", url: "https://www.amazon.com" },
          { title: "Netflix", url: "https://www.netflix.com" },
        ];
      },
    },
  };
}
