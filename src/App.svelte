<script>
  import { onDestroy, onMount } from "svelte";

  const STATUS_MESSAGES = {
    loading: "Loading Bookmarked Dial…",
    empty: "No bookmarks yet. Add shortcuts from this page or the bookmark manager.",
    error: "Bookmarked Dial folder is unavailable. Try reopening the tab or reinstalling the extension.",
  };

  const FAVICON_SIZE = 64;
  const BACKGROUND_KEY = "customBackgroundImage";
  const MAX_BACKGROUND_BYTES = 4 * 1024 * 1024;

  const realChrome = typeof chrome !== "undefined" ? chrome : null;
  const chromeApi = realChrome?.runtime?.sendMessage ? realChrome : createMockChrome();

  let statusMessage = STATUS_MESSAGES.loading;
  let statusTone = "info";
  let bookmarks = [];
  let bookmarkIdSet = new Set();
  let folderId = null;
  let draggingId = null;
  let backgroundUrl = "";
  let backgroundDialog;
  let backgroundInput;

  const cleanupFns = [];

  onMount(() => {
    applyColorScheme();
    loadBackground();
    initialize();

    return () => {
      cleanupFns.forEach((fn) => fn?.());
    };
  });

  async function initialize() {
    try {
      folderId = await requestFolderId();
      subscribeBookmarkEvents();
      await refreshBookmarks();
    } catch (error) {
      console.error("Bookmarked Dial: initialization failed", error);
      setStatus(STATUS_MESSAGES.error, "error");
    }
  }

  function applyColorScheme() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    document.body.classList.toggle("dark", media.matches);
    const handler = (event) => {
      document.body.classList.toggle("dark", event.matches);
    };
    media.addEventListener("change", handler);
    cleanupFns.push(() => media.removeEventListener("change", handler));
  }

  async function requestFolderId() {
    const response = await chromeApi.runtime.sendMessage({ type: "getFolderId" });
    if (!response?.folderId) {
      throw new Error(response?.error || "Missing folder");
    }
    return response.folderId;
  }

  function subscribeBookmarkEvents() {
    const debouncedRefresh = debounce(refreshBookmarks, 150);

    const onCreated = (_id, info) => {
      if (info.parentId === folderId) {
        debouncedRefresh();
      }
    };
    chromeApi.bookmarks.onCreated.addListener(onCreated);

    const onChanged = (id) => {
      if (bookmarkIdSet.has(id)) {
        debouncedRefresh();
      }
    };
    chromeApi.bookmarks.onChanged.addListener(onChanged);

    const onMoved = (id, moveInfo) => {
      if (moveInfo.parentId === folderId || bookmarkIdSet.has(id)) {
        debouncedRefresh();
      }
    };
    chromeApi.bookmarks.onMoved.addListener(onMoved);

    const onRemoved = (id, removeInfo) => {
      if (removeInfo.parentId === folderId || bookmarkIdSet.has(id)) {
        bookmarkIdSet.delete(id);
        debouncedRefresh();
      } else if (id === folderId) {
        handleMissingFolder();
      }
    };
    chromeApi.bookmarks.onRemoved.addListener(onRemoved);

    const onImportEnded = () => debouncedRefresh();
    const onImportBegan = () => setStatus("Importing bookmarks…");

    chromeApi.bookmarks.onImportEnded?.addListener(onImportEnded);
    chromeApi.bookmarks.onImportBegan?.addListener(onImportBegan);

    cleanupFns.push(() => {
      chromeApi.bookmarks.onCreated.removeListener(onCreated);
      chromeApi.bookmarks.onChanged.removeListener(onChanged);
      chromeApi.bookmarks.onMoved.removeListener(onMoved);
      chromeApi.bookmarks.onRemoved.removeListener(onRemoved);
      chromeApi.bookmarks.onImportEnded?.removeListener(onImportEnded);
      chromeApi.bookmarks.onImportBegan?.removeListener(onImportBegan);
    });
  }

  async function handleMissingFolder() {
    setStatus("Bookmarked Dial folder was removed. Recreating…");
    try {
      const response = await chromeApi.runtime.sendMessage({ type: "resetFolderCache" });
      if (response?.folderId) {
        folderId = response.folderId;
        await refreshBookmarks();
        setStatus("Bookmarked Dial folder restored.", "success");
      } else {
        throw new Error(response?.error || "Unable to recreate folder");
      }
    } catch (error) {
      console.error("Bookmarked Dial: missing folder recovery failed", error);
      setStatus(STATUS_MESSAGES.error, "error");
    }
  }

  async function refreshBookmarks() {
    if (!folderId) {
      return;
    }
    try {
      const nodes = await chromeApi.bookmarks.getChildren(folderId);
      const filtered = nodes.filter((node) => Boolean(node.url));
      updateBookmarkState(filtered);
      if (filtered.length === 0) {
        setStatus(STATUS_MESSAGES.empty);
      } else {
        setStatus("", "info");
      }
    } catch (error) {
      console.error("Bookmarked Dial: failed to load bookmarks", error);
      setStatus(STATUS_MESSAGES.error, "error");
    }
  }

  function updateBookmarkState(list) {
    bookmarkIdSet = new Set(list.map((bookmark) => bookmark.id));
    bookmarks = list.map((bookmark) => ({
      ...bookmark,
      displayTitle: bookmark.title || bookmark.url,
      initials: deriveInitials(bookmark.title || bookmark.url),
      palette: generateDialPalette(bookmark.title || bookmark.url),
      fallback: false,
    }));
  }

  function showFallback(bookmarkId) {
    const index = bookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);
    if (index === -1) {
      return;
    }
    const updated = [...bookmarks];
    updated[index] = {
      ...updated[index],
      fallback: true,
    };
    bookmarks = updated;
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
      await chromeApi.bookmarks.create({
        parentId: folderId,
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
      await chromeApi.bookmarks.remove(id);
    } catch (error) {
      console.error("Bookmarked Dial: failed to remove bookmark", error);
      alert("Unable to remove shortcut.");
    }
  }

  function handleDragStart(event, bookmark) {
    draggingId = bookmark.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", bookmark.id);
    requestAnimationFrame(() => {
      event.currentTarget.classList.add("dragging");
    });
  }

  function handleDragEnd(event) {
    draggingId = null;
    event.currentTarget.classList.remove("dragging");
    removeDragIndicators();
  }

  function handleDragOver(event, bookmark) {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    applyDragIndicator(event.currentTarget, event);
  }

  function handleDrop(event, targetBookmark) {
    event.preventDefault();
    removeDragIndicators();
    const draggedId = draggingId || event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetBookmark.id) {
      return;
    }

    const draggedIndex = bookmarks.findIndex((bookmark) => bookmark.id === draggedId);
    const targetIndex = bookmarks.findIndex((bookmark) => bookmark.id === targetBookmark.id);
    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const dropIndex = computeDropIndex(event.currentTarget, event, targetIndex, draggedIndex);
    moveBookmark(draggedId, dropIndex).catch((error) => {
      console.error("Bookmarked Dial: failed to reorder bookmark", error);
      setStatus("Reorder failed. Try again.", "error");
      refreshBookmarks();
    });
  }

  function handleGridDragOver(event) {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleGridDrop(event) {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    removeDragIndicators();
    const draggedId = draggingId || event.dataTransfer.getData("text/plain");
    const draggedIndex = bookmarks.findIndex((bookmark) => bookmark.id === draggedId);
    if (draggedIndex === -1) {
      return;
    }
    moveBookmark(draggedId, bookmarks.length).catch((error) => {
      console.error("Bookmarked Dial: failed to move bookmark to end", error);
      setStatus("Reorder failed. Try again.", "error");
      refreshBookmarks();
    });
  }

  async function moveBookmark(bookmarkId, index) {
    await chromeApi.bookmarks.move(bookmarkId, {
      parentId: folderId,
      index,
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
    document.querySelectorAll(".tile.drop-before, .tile.drop-after").forEach((tile) => {
      tile.classList.remove("drop-before", "drop-after");
    });
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

  function openBackgroundDialog() {
    if (backgroundInput) {
      backgroundInput.value = "";
    }
    backgroundDialog?.showModal();
  }

  async function handleBackgroundSubmit(event) {
    event.preventDefault();
    const file = backgroundInput?.files?.[0];
    if (!file) {
      backgroundDialog?.close();
      return;
    }
    if (!isSupportedImage(file)) {
      alert("Please choose a JPEG or PNG image under 4 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file, MAX_BACKGROUND_BYTES);
      await chromeApi.storage.local.set({ [BACKGROUND_KEY]: dataUrl });
      applyBackground(dataUrl);
      backgroundDialog?.close();
    } catch (error) {
      console.error("Bookmarked Dial: failed to save background", error);
      alert("Unable to store the background image. Try a smaller file.");
    }
  }

  async function clearBackground() {
    await chromeApi.storage.local.remove(BACKGROUND_KEY);
    applyBackground(null);
    backgroundDialog?.close();
  }

  function cancelBackground() {
    backgroundDialog?.close();
  }

  async function loadBackground() {
    try {
      const stored = await chromeApi.storage.local.get(BACKGROUND_KEY);
      applyBackground(stored[BACKGROUND_KEY]);
    } catch (error) {
      console.error("Bookmarked Dial: failed to load background", error);
    }
  }

  function applyBackground(dataUrl) {
    backgroundUrl = dataUrl || "";
  }

  function setStatus(message, tone = "info") {
    statusMessage = message;
    statusTone = tone;
  }

  function normalizeUrl(input) {
    try {
      const url = new URL(input);
      return url.href;
    } catch (error) {
      try {
        const url = new URL(`https://${input}`);
        return url.href;
      } catch {
        return null;
      }
    }
  }

  function tryExtractHostname(urlString) {
    try {
      const url = new URL(urlString);
      return url.hostname.replace(/^www\./i, "");
    } catch {
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
    const hueSpread = positiveModulo(satSeed, 36) - 18;
    const accentHue = positiveModulo(baseHue + 24 + hueSpread, 360);

    const baseSaturation = 52 + (Math.abs(satSeed) % 30);
    const baseLightness = 42 + (Math.abs(lightSeed) % 20);
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

  function isSupportedImage(file) {
    const validTypes = ["image/jpeg", "image/png"];
    return validTypes.includes(file.type) && file.size <= MAX_BACKGROUND_BYTES;
  }

  function fileToDataUrl(file, maxBytes) {
    return new Promise((resolve, reject) => {
      if (file.size > maxBytes) {
        reject(new Error("File exceeds size limit"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function createMockChrome() {
    console.info("Bookmarked Dial: using mock Chrome APIs for development");
    let mockFolderId = "mock-folder";
    let counter = 0;
    const listeners = {
      onCreated: new Set(),
      onChanged: new Set(),
      onMoved: new Set(),
      onRemoved: new Set(),
      onImportBegan: new Set(),
      onImportEnded: new Set(),
    };

    const mockStorageLocal = new Map();
    const mockStorageSync = new Map([["speedDialFolderId", mockFolderId]]);

    const mockBookmarks = [
      {
        id: "mock-1",
        parentId: mockFolderId,
        title: "Svelte",
        url: "https://svelte.dev",
        index: 0,
      },
      {
        id: "mock-2",
        parentId: mockFolderId,
        title: "MDN Web Docs",
        url: "https://developer.mozilla.org",
        index: 1,
      },
      {
        id: "mock-3",
        parentId: mockFolderId,
        title: "GitHub",
        url: "https://github.com",
        index: 2,
      },
      {
        id: "mock-4",
        parentId: mockFolderId,
        title: "Stack Overflow",
        url: "https://stackoverflow.com",
        index: 3,
      },
      {
        id: "mock-5",
        parentId: mockFolderId,
        title: "Visual Studio Code",
        url: "https://code.visualstudio.com",
        index: 4,
      },
      {
        id: "mock-6",
        parentId: mockFolderId,
        title: "Node.js",
        url: "https://nodejs.org",
        index: 5,
      },
      {
        id: "mock-7",
        parentId: mockFolderId,
        title: "npm",
        url: "https://npmjs.com",
        index: 6,
      },
      {
        id: "mock-8",
        parentId: mockFolderId,
        title: "CSS-Tricks",
        url: "https://css-tricks.com",
        index: 7,
      },
      {
        id: "mock-9",
        parentId: mockFolderId,
        title: "Can I Use",
        url: "https://caniuse.com",
        index: 8,
      },
      {
        id: "mock-10",
        parentId: mockFolderId,
        title: "Vite",
        url: "https://vitejs.dev",
        index: 9,
      },
      {
        id: "mock-11",
        parentId: mockFolderId,
        title: "TypeScript",
        url: "https://typescriptlang.org",
        index: 10,
      },
      {
        id: "mock-12",
        parentId: mockFolderId,
        title: "Tailwind CSS",
        url: "https://tailwindcss.com",
        index: 11,
      },
    ];

    function emit(event, ...args) {
      listeners[event].forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Mock chrome ${event} handler failed`, error);
        }
      });
    }

    const onProxy = {
      addListener(fn) {
        this._listeners.add(fn);
      },
      removeListener(fn) {
        this._listeners.delete(fn);
      },
    };

    function makeEvent(name) {
      const set = listeners[name];
      return {
        addListener: (fn) => set.add(fn),
        removeListener: (fn) => set.delete(fn),
      };
    }

    function getFolderId() {
      return mockFolderId;
    }

    return {
      runtime: {
        sendMessage: async (message) => {
          if (message?.type === "getFolderId") {
            return { folderId: getFolderId() };
          }
          if (message?.type === "resetFolderCache") {
            mockFolderId = "mock-folder";
            mockStorageSync.set("speedDialFolderId", mockFolderId);
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
        async getChildren(id) {
          return mockBookmarks.filter((bookmark) => bookmark.parentId === id).sort((a, b) => a.index - b.index);
        },
        async create({ parentId, title, url }) {
          const id = `mock-${Date.now()}-${counter++}`;
          const bookmark = {
            id,
            parentId,
            title,
            url,
            index: mockBookmarks.filter((item) => item.parentId === parentId).length,
          };
          mockBookmarks.push(bookmark);
          emit("onCreated", id, bookmark);
          return bookmark;
        },
        async remove(id) {
          const index = mockBookmarks.findIndex((bookmark) => bookmark.id === id);
          if (index === -1) {
            throw new Error("Bookmark not found");
          }
          const [removed] = mockBookmarks.splice(index, 1);
          emit("onRemoved", id, { parentId: removed.parentId, node: removed });
        },
        async move(id, { parentId, index }) {
          const currentIndex = mockBookmarks.findIndex((bookmark) => bookmark.id === id);
          if (currentIndex === -1) {
            throw new Error("Bookmark not found");
          }
          const [bookmark] = mockBookmarks.splice(currentIndex, 1);
          bookmark.parentId = parentId;
          const siblings = mockBookmarks.filter((item) => item.parentId === parentId);
          siblings.splice(index, 0, bookmark);
          siblings.forEach((item, idx) => {
            item.index = idx;
          });
          emit("onMoved", id, { parentId });
          return bookmark;
        },
      },
      storage: {
        local: {
          async get(key) {
            if (Array.isArray(key)) {
              const result = {};
              key.forEach((k) => (result[k] = mockStorageLocal.get(k)));
              return result;
            }
            if (typeof key === "object") {
              const result = { ...key };
              for (const k of Object.keys(key)) {
                if (mockStorageLocal.has(k)) {
                  result[k] = mockStorageLocal.get(k);
                }
              }
              return result;
            }
            return { [key]: mockStorageLocal.get(key) };
          },
          async set(items) {
            Object.entries(items).forEach(([k, v]) => mockStorageLocal.set(k, v));
          },
          async remove(key) {
            if (Array.isArray(key)) {
              key.forEach((k) => mockStorageLocal.delete(k));
            } else {
              mockStorageLocal.delete(key);
            }
          },
        },
        sync: {
          async get(key) {
            if (Array.isArray(key)) {
              const result = {};
              key.forEach((k) => (result[k] = mockStorageSync.get(k)));
              return result;
            }
            if (typeof key === "object") {
              const result = { ...key };
              for (const k of Object.keys(key)) {
                if (mockStorageSync.has(k)) {
                  result[k] = mockStorageSync.get(k);
                }
              }
              return result;
            }
            return { [key]: mockStorageSync.get(key) };
          },
          async set(items) {
            Object.entries(items).forEach(([k, v]) => mockStorageSync.set(k, v));
          },
          async remove(key) {
            if (Array.isArray(key)) {
              key.forEach((k) => mockStorageSync.delete(k));
            } else {
              mockStorageSync.delete(key);
            }
          },
        },
      },
    };
  }
</script>

<div
  id="background-layer"
  class:visible={Boolean(backgroundUrl)}
  style:background-image={backgroundUrl ? `url(${backgroundUrl})` : null}
></div>

<div class="page">
  <button
    class="icon-button"
    type="button"
    title="Change background"
    aria-label="Change background"
    on:click={openBackgroundDialog}
  >
    <img src="/icons/pencil.svg" alt="" />
  </button>

  <main>
    <section id="status" role="status" aria-live="polite" data-tone={statusMessage ? statusTone : null}>
      {statusMessage}
    </section>

    <section
      id="dial-grid"
      class="grid"
      aria-label="Bookmarked Dial links"
      on:dragover={handleGridDragOver}
      on:drop={handleGridDrop}
    >
      {#each bookmarks as bookmark (bookmark.id)}
        <article
          class="tile"
          draggable="true"
          on:dragstart={(event) => handleDragStart(event, bookmark)}
          on:dragend={handleDragEnd}
          on:dragover={(event) => handleDragOver(event, bookmark)}
          on:drop={(event) => handleDrop(event, bookmark)}
        >
          <a
            class="tile-link"
            href={bookmark.url}
            title={bookmark.title || bookmark.url}
            draggable="false"
          >
            <div
              class="tile-icon"
              style={`--dial-color: ${bookmark.palette.background}; --dial-text: ${bookmark.palette.text};`}
              aria-hidden="true"
            >
              {#if bookmark.fallback}
                {bookmark.initials}
              {:else}
                <img
                  src={`chrome://favicon/size/${FAVICON_SIZE}@2x/${encodeURIComponent(bookmark.url)}`}
                  alt=""
                  loading="lazy"
                  on:error={() => showFallback(bookmark.id)}
                />
              {/if}
            </div>
            <div class="tile-title">{bookmark.displayTitle}</div>
          </a>
          <button
            class="remove-button"
            type="button"
            aria-label="Remove bookmark"
            on:click={(event) => {
              event.preventDefault();
              event.stopPropagation();
              removeBookmark(bookmark.id);
            }}
          >
            &times;
          </button>
        </article>
      {/each}

      <article class="tile add-tile" draggable="false">
        <button class="add-button" type="button" on:click={handleAddBookmark}>
          <span aria-hidden="true">+</span>
          <div>Add shortcut</div>
        </button>
      </article>
    </section>
  </main>
</div>

<dialog bind:this={backgroundDialog}>
  <form id="background-form" method="dialog" on:submit={handleBackgroundSubmit}>
    <header>
      <h2>Custom background</h2>
    </header>
    <div class="dialog-body">
      <label class="file-picker">
        <span>Choose an image (JPEG/PNG, up to 4&nbsp;MB)</span>
        <input bind:this={backgroundInput} type="file" accept="image/png,image/jpeg,image/jpg" />
      </label>
      <p class="hint">The selected image is stored locally on this device only.</p>
    </div>
    <footer class="dialog-footer">
      <button type="button" id="clear-background" class="ghost-button" on:click|preventDefault={clearBackground}>
        Remove
      </button>
      <span class="spacer"></span>
      <button type="button" id="cancel-background" on:click|preventDefault={cancelBackground}>
        Cancel
      </button>
      <button type="submit" id="save-background">Save</button>
    </footer>
  </form>
</dialog>
