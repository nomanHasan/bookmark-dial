const STATUS_MESSAGES = {
  loading: "Loading Bookmarked Dial…",
  empty: "No bookmarks yet. Add shortcuts from this page or the bookmark manager.",
  error: "Bookmarked Dial folder is unavailable. Try reopening the tab or reinstalling the extension.",
};

const FAVICON_SIZE = 64;
const BACKGROUND_KEY = "customBackgroundImage";

const state = {
  folderId: null,
  bookmarks: [],
  bookmarkIdSet: new Set(),
  draggingId: null,
};

const gridEl = document.getElementById("dial-grid");
const statusEl = document.getElementById("status");
const backgroundLayer = document.getElementById("background-layer");
const editButton = document.getElementById("edit-background");
const dialog = document.getElementById("background-dialog");
const backgroundForm = document.getElementById("background-form");
const backgroundInput = document.getElementById("background-file");
const clearBackgroundButton = document.getElementById("clear-background");
const cancelBackgroundButton = document.getElementById("cancel-background");

const dialTileTemplate = document.getElementById("dial-tile-template");
const addTileTemplate = document.getElementById("add-tile-template");

gridEl.addEventListener("dragover", handleGridDragOver);
gridEl.addEventListener("drop", handleGridDrop);

initialize().catch((error) => {
  console.error("Bookmarked Dial: initialization failed", error);
  setStatus(STATUS_MESSAGES.error, "error");
});

async function initialize() {
  setStatus(STATUS_MESSAGES.loading);
  applyColorScheme();
  await loadBackground();
  setupBackgroundControls();

  state.folderId = await requestFolderId();
  subscribeBookmarkEvents();
  await refreshBookmarks();
}

function applyColorScheme() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  if (media.matches) {
    document.body.classList.add("dark");
  }
  media.addEventListener("change", (event) => {
    document.body.classList.toggle("dark", event.matches);
  });
}

async function requestFolderId() {
  const response = await chrome.runtime.sendMessage({ type: "getFolderId" });
  if (!response?.folderId) {
    throw new Error(response?.error || "Missing folder");
  }
  return response.folderId;
}

function subscribeBookmarkEvents() {
  const debouncedRefresh = debounce(refreshBookmarks, 150);

  chrome.bookmarks.onCreated.addListener((_id, info) => {
    if (info.parentId === state.folderId) {
      debouncedRefresh();
    }
  });

  chrome.bookmarks.onChanged.addListener((id) => {
    if (state.bookmarkIdSet.has(id)) {
      debouncedRefresh();
    }
  });

  chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
    if (moveInfo.parentId === state.folderId || state.bookmarkIdSet.has(id)) {
      debouncedRefresh();
    }
  });

  chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    if (removeInfo.parentId === state.folderId || state.bookmarkIdSet.has(id)) {
      state.bookmarkIdSet.delete(id);
      debouncedRefresh();
    } else if (id === state.folderId) {
      handleMissingFolder();
    }
  });

  chrome.bookmarks.onImportEnded?.addListener(() => debouncedRefresh());
  chrome.bookmarks.onImportBegan?.addListener(() => setStatus("Importing bookmarks…"));
}

async function handleMissingFolder() {
  setStatus("Bookmarked Dial folder was removed. Recreating…");
  try {
    const response = await chrome.runtime.sendMessage({ type: "resetFolderCache" });
    if (response?.folderId) {
      state.folderId = response.folderId;
      await refreshBookmarks();
      setStatus("Bookmarked Dial folder restored.");
    } else {
      throw new Error(response?.error || "Unable to recreate folder");
    }
  } catch (error) {
    console.error("Bookmarked Dial: missing folder recovery failed", error);
    setStatus(STATUS_MESSAGES.error, "error");
  }
}

async function refreshBookmarks() {
  if (!state.folderId) {
    return;
  }
  try {
    const nodes = await chrome.bookmarks.getChildren(state.folderId);
    const bookmarks = nodes.filter((node) => Boolean(node.url));
    updateBookmarkState(bookmarks);
    renderBookmarks();
    if (bookmarks.length === 0) {
      setStatus(STATUS_MESSAGES.empty);
    } else {
      setStatus("");
    }
  } catch (error) {
    console.error("Bookmarked Dial: failed to load bookmarks", error);
    setStatus(STATUS_MESSAGES.error, "error");
  }
}

function updateBookmarkState(bookmarks) {
  state.bookmarks = bookmarks;
  state.bookmarkIdSet = new Set(bookmarks.map((bookmark) => bookmark.id));
}

function renderBookmarks() {
  gridEl.textContent = "";

  const fragment = document.createDocumentFragment();
  for (const bookmark of state.bookmarks) {
    fragment.appendChild(renderBookmarkTile(bookmark));
  }
  fragment.appendChild(renderAddTile());

  gridEl.appendChild(fragment);
}

function renderBookmarkTile(bookmark) {
  const element = dialTileTemplate.content.firstElementChild.cloneNode(true);
  element.dataset.id = bookmark.id;
  element.dataset.url = bookmark.url;

  const link = element.querySelector(".tile-link");
  link.href = bookmark.url;
  link.title = bookmark.title;
  link.draggable = false;

  const titleEl = element.querySelector(".tile-title");
  titleEl.textContent = bookmark.title || bookmark.url;

  const iconEl = element.querySelector(".tile-icon");
  const favicon = document.createElement("img");
  favicon.loading = "lazy";
  favicon.alt = "";
  favicon.src = `chrome://favicon/size/${FAVICON_SIZE}@2x/${encodeURIComponent(bookmark.url)}`;
  favicon.addEventListener("error", () => {
    favicon.remove();
    iconEl.textContent = deriveInitials(titleEl.textContent);
  });
  iconEl.textContent = "";
  const palette = generateDialPalette(titleEl.textContent);
  iconEl.style.background = palette.background;
  iconEl.style.color = palette.text;
  iconEl.appendChild(favicon);

  element.addEventListener("dragstart", (event) => handleDragStart(event, bookmark.id));
  element.addEventListener("dragend", handleDragEnd);
  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("drop", (event) => handleDrop(event, bookmark.id));

  const removeButton = element.querySelector(".remove-button");
  removeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeBookmark(bookmark.id);
  });

  return element;
}

function renderAddTile() {
  const element = addTileTemplate.content.firstElementChild.cloneNode(true);
  const button = element.querySelector(".add-button");
  button.addEventListener("click", handleAddBookmark);
  return element;
}

async function handleAddBookmark() {
  const urlInput = prompt("Enter the URL for the new shortcut:");
  if (!urlInput) {
    return;
  }
  const normalizedUrl = normalizeUrl(urlInput.trim());
  if (!normalizedUrl) {
    alert("That does not appear to be a valid URL.");
    return;
  }

  const defaultTitle = tryExtractHostname(normalizedUrl);
  const titleInput = prompt("Enter a title for the shortcut:", defaultTitle);
  const title = titleInput ? titleInput.trim() : defaultTitle;

  try {
    await chrome.bookmarks.create({
      parentId: state.folderId,
      title,
      url: normalizedUrl,
    });
  } catch (error) {
    console.error("Bookmarked Dial: failed to create bookmark", error);
    alert("Unable to add shortcut. Please try again.");
  }
}

async function removeBookmark(id) {
  if (!confirm("Remove this shortcut?")) {
    return;
  }
  try {
    await chrome.bookmarks.remove(id);
  } catch (error) {
    console.error("Bookmarked Dial: failed to remove bookmark", error);
    alert("Unable to remove shortcut.");
  }
}

function handleDragStart(event, bookmarkId) {
  state.draggingId = bookmarkId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", bookmarkId);
  requestAnimationFrame(() => {
    event.target.classList.add("dragging");
  });
}

function handleDragEnd(event) {
  state.draggingId = null;
  event.target.classList.remove("dragging");
  removeDragIndicators();
}

function handleDragOver(event) {
  if (!state.draggingId) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const tile = event.currentTarget;
  applyDragIndicator(tile, event);
}

function handleDrop(event, targetId) {
  event.preventDefault();
  removeDragIndicators();
  const draggedId = state.draggingId || event.dataTransfer.getData("text/plain");
  if (!draggedId || draggedId === targetId) {
    return;
  }

  const draggedIndex = state.bookmarks.findIndex((bookmark) => bookmark.id === draggedId);
  const targetIndex = state.bookmarks.findIndex((bookmark) => bookmark.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }

  const tile = event.currentTarget;
  const dropIndex = computeDropIndex(tile, event, targetIndex, draggedIndex);
  moveBookmark(draggedId, dropIndex).catch((error) => {
    console.error("Bookmarked Dial: failed to reorder bookmark", error);
    setStatus("Reorder failed. Try again.", "error");
    refreshBookmarks();
  });
}

function applyDragIndicator(tile, event) {
  const rect = tile.getBoundingClientRect();
  const horizontal = rect.width >= rect.height;
  const midpoint = horizontal ? rect.width / 2 : rect.height / 2;
  const offset = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
  const before = offset < midpoint;
  tile.classList.toggle("drop-before", before);
  tile.classList.toggle("drop-after", !before);
}

function removeDragIndicators() {
  for (const tile of gridEl.querySelectorAll(".tile")) {
    tile.classList.remove("drop-before", "drop-after");
  }
}

function computeDropIndex(tile, event, targetIndex, draggedIndex) {
  const rect = tile.getBoundingClientRect();
  const horizontal = rect.width >= rect.height;
  const midpoint = horizontal ? rect.width / 2 : rect.height / 2;
  const offset = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
  const insertAfter = offset >= midpoint;
  let index = targetIndex + (insertAfter ? 1 : 0);
  if (draggedIndex < index && insertAfter) {
    index -= 1;
  }
  return index;
}

async function moveBookmark(bookmarkId, index) {
  await chrome.bookmarks.move(bookmarkId, {
    parentId: state.folderId,
    index,
  });
}

function handleGridDragOver(event) {
  if (!state.draggingId) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleGridDrop(event) {
  if (!state.draggingId) {
    return;
  }
  event.preventDefault();
  removeDragIndicators();
  const draggedId = state.draggingId || event.dataTransfer.getData("text/plain");
  const draggedIndex = state.bookmarks.findIndex((bookmark) => bookmark.id === draggedId);
  if (draggedIndex === -1) {
    return;
  }
  moveBookmark(draggedId, state.bookmarks.length).catch((error) => {
    console.error("Bookmarked Dial: failed to move bookmark to end", error);
    setStatus("Reorder failed. Try again.", "error");
    refreshBookmarks();
  });
}

function setStatus(message, tone = "info") {
  statusEl.textContent = message;
  if (message) {
    statusEl.dataset.tone = tone;
  } else {
    delete statusEl.dataset.tone;
  }
}

function normalizeUrl(input) {
  try {
    const url = new URL(input);
    return url.href;
  } catch (error) {
    try {
      const url = new URL(`https://${input}`);
      return url.href;
    } catch (_secondaryError) {
      return null;
    }
  }
}

function tryExtractHostname(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname.replace(/^www\./i, "");
  } catch (error) {
    return urlString;
  }
}

function deriveInitials(text) {
  if (!text) {
    return "•";
  }
  const firstWord = text.trim().split(/\s+/)[0];
  return firstWord.slice(0, 2).toUpperCase();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function generateDialPalette(input) {
  const text = (input || "").trim().toLowerCase();
  if (!text) {
    return {
      background: "linear-gradient(145deg, #fde68a, #fbbf24)",
      text: "rgba(15, 23, 42, 0.85)",
    };
  }

  let hueSeed = 0;
  let satSeed = 0;
  let lightSeed = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const weight = i + 1;
    hueSeed += code * weight;
    satSeed += code * (weight + 1.5);
    lightSeed += code * (weight + 2.5);
  }

  const baseHue = positiveModulo(hueSeed, 360);
  const hueSpread = positiveModulo(satSeed, 36) - 18; // -18 to +17
  const accentHue = positiveModulo(baseHue + 24 + hueSpread, 360);

  const baseSaturation = 52 + (Math.abs(satSeed) % 30); // 52 - 81
  const baseLightness = 42 + (Math.abs(lightSeed) % 20); // 42 - 61
  const accentSaturation = Math.min(96, baseSaturation + 8);
  const accentLightness = Math.min(78, baseLightness + 12);

  const primary = `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`;
  const secondary = `hsl(${accentHue}, ${accentSaturation}%, ${accentLightness}%)`;
  const textColor = baseLightness > 54 ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.88)";

  return {
    background: `linear-gradient(140deg, ${primary}, ${secondary})`,
    text: textColor,
  };
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function setupBackgroundControls() {
  editButton.addEventListener("click", () => {
    backgroundInput.value = "";
    dialog.showModal();
  });

  backgroundForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = backgroundInput.files?.[0];
    if (!file) {
      dialog.close();
      return;
    }
    if (!isSupportedImage(file)) {
      alert("Please choose a JPEG or PNG image under 4 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file, 4 * 1024 * 1024);
      await chrome.storage.local.set({ [BACKGROUND_KEY]: dataUrl });
      applyBackground(dataUrl);
      dialog.close();
    } catch (error) {
      console.error("Bookmarked Dial: failed to save background", error);
      alert("Unable to store the background image. Try a smaller file.");
    }
  });

  clearBackgroundButton.addEventListener("click", async () => {
    await chrome.storage.local.remove(BACKGROUND_KEY);
    applyBackground(null);
    dialog.close();
  });

  cancelBackgroundButton.addEventListener("click", () => {
    dialog.close();
  });
}

async function loadBackground() {
  const stored = await chrome.storage.local.get(BACKGROUND_KEY);
  const dataUrl = stored[BACKGROUND_KEY];
  if (dataUrl) {
    applyBackground(dataUrl);
  } else {
    applyBackground(null);
  }
}

function applyBackground(dataUrl) {
  if (dataUrl) {
    backgroundLayer.style.backgroundImage = `url(${dataUrl})`;
    backgroundLayer.classList.add("visible");
  } else {
    backgroundLayer.style.backgroundImage = "";
    backgroundLayer.classList.remove("visible");
  }
}

function isSupportedImage(file) {
  const validTypes = ["image/jpeg", "image/png"];
  const maxBytes = 4 * 1024 * 1024;
  return validTypes.includes(file.type) && file.size <= maxBytes;
}

function fileToDataUrl(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error("File exceeds size limit"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(reader.error || new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
