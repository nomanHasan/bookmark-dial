<script>
  import { onMount, tick } from "svelte";
  import FolderSelectionModal from "./components/FolderSelectionModal.svelte";
  import AddShortcutModal from "./components/AddShortcutModal.svelte";
  import BookmarkTile from "./components/BookmarkTile.svelte";
  import ToastNotification from "./components/ToastNotification.svelte";
  import WelcomeModal from "./components/WelcomeModal.svelte";
  import ContextMenu from "./components/ContextMenu.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import SettingsDrawer from "./components/SettingsDrawer.svelte";
  import BookmarkGrid from "./components/BookmarkGrid.svelte";
  import FolderGroupList from "./components/FolderGroupList.svelte";
  import BackgroundPickerDialog from "./components/BackgroundPickerDialog.svelte";
  import {
    bookmarkCache,
    bootstrapBookmarkCache,
    loadEntireFolderTree,
    ensureChildrenLoaded as ensureCacheChildrenLoaded,
    loadSubtree as loadCacheSubtree,
    getBookmarkCacheState,
    getNodeById,
    getDescendantFolderIds,
    getFolderPath,
    applyCreatedNode,
    applyChangedNode,
    applyMovedNode,
    applyRemovedNode,
    buildSearchIndex,
  } from "./lib/bookmarkCache";
  import {
    STATUS_MESSAGES,
    FAVICON_SIZE,
    BACKGROUND_KEY,
    SETTINGS_KEY,
    SYNC_SETTINGS_KEY,
    STORAGE_VERSION,
    WELCOME_KEY,
    DEFAULT_FOLDER_SELECTION,
    MAX_BACKGROUND_BYTES,
    MAX_TOASTS,
    INDEXEDDB_NAME,
    INDEXEDDB_STORE,
    INDEXEDDB_KEY,
    THEME_OPTIONS,
    ACCENT_OPTIONS,
    GRADIENT_OPTIONS,
    DEFAULT_GRADIENT,
    DEFAULT_ACCENT_ID,
    DEFAULT_SETTINGS,
    DEFAULT_SYNC_PREFERENCES,
    GRADIENT_PREVIEW_COUNT,
    ACCENT_PREVIEW_COUNT,
    TILE_SIZE_OPTIONS,
    TILE_BG_LIGHTNESS_OPTIONS,
    TILE_TEXT_CONTRAST_OPTIONS,
    DEFAULT_TILE_SETTINGS,
    IMMERSIVE_OPACITY_OPTIONS,
    DEFAULT_IMMERSIVE_SETTINGS,
  } from "./lib/constants.js";
  import {
    normalizeUrl,
    tryExtractHostname,
    deriveInitials,
    debounce,
    generateDialPalette,
    positiveModulo,
    isSupportedImage,
    fileToDataUrl,
    arraysEqual,
    setsEqual,
    blobToObjectUrl,
  } from "./lib/utils.js";
  import {
    chromeApi,
    isExtensionContext,
    shouldPersistPreferences,
    shouldSyncPreferences,
  } from "@/chromeApi";

  let statusMessage = "";
  let statusTone = "info";
  let isLoading = true;
  let bookmarks = [];
  let folderBookmarkGroups = [];
  let bookmarkIdSet = new Set();
  let defaultFolderId = null;
  let selectedFolderIds = new Set();
  let expandedFolderIds = new Set();
  let loadingFolderIds = new Set();
  let hasHydratedSelection = false;
  let folderModalOpen = false;
  let addShortcutModalOpen = false;
  let addShortcutTargetFolderId = null;
  let shortcutFolderOptions = [];
  let defaultShortcutFolderId = null;
  let folderSearchQuery = "";
  let folderSearchMatches = new Set();
  let visibleFolderIds = null;
  let folderSummary = [];
  let folderBookmarkCounts = new Map();
  let combinedBookmarkCount = 0;
  let draftSelectedFolderIds = null;
  let draftExpandedFolderIds = null;
  let draftFolderSummary = [];
  let draftBookmarkCounts = new Map();
  let draftCombinedBookmarkCount = 0;
  let selectionNeedsPersist = false;
  let effectiveExpandedFolderIds = new Set();
  let refreshNonce = 0;
  let draftPreviewNonce = 0;
  let openMenuId = null;
  let backgroundUrl = "";
  let backgroundDialogRef;
  let settingsButton;
  let settings = createDefaultSettings();
  let settingsOpen = false;
  let loadingSettings = true;
  let hasHydratedSettings = false;
  let needsInitialPersist = false;
  let showAllGradients = false;
  let showAllAccents = false;
  let accentOptionsOrdered = [...ACCENT_OPTIONS];
  let gradientOptionsOrdered = [...GRADIENT_OPTIONS];

  // Toast notifications
  let toasts = [];
  let toastIdCounter = 0;

  // Welcome modal
  let showWelcome = false;

  // Context menu
  let contextMenuVisible = false;
  let contextMenuPosition = { x: 0, y: 0 };
  let contextMenuBookmark = null;

  // Bookmark search
  let bookmarkSearchQuery = "";
  let bookmarkSearchVisible = false;

  // Top Sites
  let topSites = [];
  let topSitesLoaded = false;

  // Keyboard navigation
  let focusedBookmarkIndex = -1;
  let gridRef = null;
  let cachedGridColumns = 4;
  let resizeObserver = null;

  // Drag and drop
  let draggedBookmark = null;
  let dragOverBookmark = null;
  let dragSourceFolderId = null;

  // AbortController for cancelling in-flight subtree loads
  let subtreeLoadController = null;

  // Memoization for folder summary
  let lastSummarySelectionKey = "";
  let lastSummaryCountsKey = "";
  let cachedFolderSummary = [];

  // Bookmark state optimization - keyed by id for stable references
  let bookmarkById = new Map();

  let persistSettingsHandle = null;
  let mediaQuery = null;
  let removeSystemThemeListener = null;

  // Track current background object URL for cleanup
  let currentBackgroundObjectUrl = null;

  const cleanupFns = [];

  onMount(() => {
    (async () => {
      try {
        await loadSettings();
      } catch (error) {
        console.error("Bookmark Dial: failed to load settings", error);
        settings = createDefaultSettings();
        needsInitialPersist = shouldPersistPreferences;
        applyTheme(settings.theme);
        applyAccent(settings.accent);
        applyGradient(settings.background.gradientId);
      }

      try {
        await loadBackground();
      } catch (error) {
        console.error("Bookmark Dial: failed to load background", error);
      }

      loadingSettings = false;
      await checkWelcome();
      initialize();
    })();

    if (typeof window !== "undefined") {
      const keydownHandler = (event) => {
        // Skip if user is typing in an input/textarea
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          return;
        }

        // Handle context menu close
        if (contextMenuVisible && event.key === "Escape") {
          closeContextMenu();
          event.stopPropagation();
          return;
        }

        if (event.key === "Escape") {
          // Clear keyboard focus first
          if (focusedBookmarkIndex >= 0) {
            focusedBookmarkIndex = -1;
            event.stopPropagation();
            return;
          }
          if (openMenuId !== null) {
            openMenuId = null;
            event.stopPropagation();
            return;
          }
          if (bookmarkSearchVisible) {
            closeBookmarkSearch();
            event.stopPropagation();
            return;
          }
          if (settingsOpen) {
            closeSettings();
            return;
          }
          // Immersive mode: Esc opens settings as escape hatch
          if (settings.immersive?.enabled && !settingsOpen) {
            settingsOpen = true;
            event.stopPropagation();
            return;
          }
          return;
        }

        // Global keyboard shortcut for search
        if (event.key === "/" && settings.enableBookmarkSearch && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          bookmarkSearchVisible = true;
          return;
        }

        // Keyboard shortcut to toggle immersive mode (I key)
        if (event.key === "i" && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          toggleImmersiveMode();
          return;
        }

        // Grid navigation (only in merged view, not when overlays open)
        if (settings.mergeAllBookmarks && !settingsOpen && !bookmarkSearchVisible && !showWelcome) {
          handleGridNavigation(event);
        }
      };
      const pointerdownHandler = (event) => {
        // Close context menu on click outside
        if (contextMenuVisible) {
          const target = event.target;
          if (target instanceof Element && !target.closest(".context-menu")) {
            closeContextMenu();
          }
        }
        if (openMenuId === null) {
          return;
        }
        const target = event.target;
        if (target instanceof Element && target.closest(".tile-actions")) {
          return;
        }
        openMenuId = null;
      };
      window.addEventListener("keydown", keydownHandler);
      window.addEventListener("pointerdown", pointerdownHandler);
      cleanupFns.push(() => window.removeEventListener("keydown", keydownHandler));
      cleanupFns.push(() => window.removeEventListener("pointerdown", pointerdownHandler));
    }

    if (chromeApi?.storage?.onChanged?.addListener) {
      const storageListener = (changes, areaName) => {
        if (areaName !== "sync" && areaName !== "local") {
          return;
        }
        const key = areaName === "sync" ? SYNC_SETTINGS_KEY : SETTINGS_KEY;
        const changedEntry = changes[key];
        if (!changedEntry || !changedEntry.newValue) {
          return;
        }
        handleExternalPreferences(changedEntry.newValue);
      };
      chromeApi.storage.onChanged.addListener(storageListener);
      cleanupFns.push(() => chromeApi.storage.onChanged.removeListener(storageListener));
    }

    return () => {
      if (persistSettingsHandle) {
        clearTimeout(persistSettingsHandle);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (subtreeLoadController) {
        subtreeLoadController.abort();
        subtreeLoadController = null;
      }
      // Clean up background object URL
      if (currentBackgroundObjectUrl) {
        URL.revokeObjectURL(currentBackgroundObjectUrl);
        currentBackgroundObjectUrl = null;
      }
      if (typeof document !== "undefined") {
        document.body.classList.remove("settings-open");
        document.body.classList.remove("immersive");
      }
      cleanupFns.forEach((fn) => fn?.());
    };
  });

  function createDefaultSettings() {
    return {
      theme: DEFAULT_SETTINGS.theme,
      accent: DEFAULT_SETTINGS.accent,
      background: { ...DEFAULT_SETTINGS.background },
      titleBackdrop: DEFAULT_SETTINGS.titleBackdrop,
      mergeAllBookmarks: DEFAULT_SETTINGS.mergeAllBookmarks,
      folderColumnWidth: DEFAULT_SETTINGS.folderColumnWidth,
      compactFolderHeader: DEFAULT_SETTINGS.compactFolderHeader,
      enableBookmarkSearch: DEFAULT_SETTINGS.enableBookmarkSearch,
      enableTopSites: DEFAULT_SETTINGS.enableTopSites,
      lastShortcutFolderId: DEFAULT_SETTINGS.lastShortcutFolderId,
      tile: { ...DEFAULT_TILE_SETTINGS },
      immersive: { ...DEFAULT_IMMERSIVE_SETTINGS },
    };
  }

  function createDefaultFolderSelection() {
    return {
      selectedIds: [...DEFAULT_FOLDER_SELECTION.selectedIds],
      expandedIds: [...DEFAULT_FOLDER_SELECTION.expandedIds],
    };
  }

  function normalizeTheme(theme) {
    return THEME_OPTIONS.some((option) => option.id === theme) ? theme : DEFAULT_SETTINGS.theme;
  }

  function normalizeAccent(accent) {
    return ACCENT_OPTIONS.some((option) => option.id === accent) ? accent : DEFAULT_SETTINGS.accent;
  }

  function normalizeGradient(gradientId) {
    return GRADIENT_OPTIONS.some((option) => option.id === gradientId)
      ? gradientId
      : DEFAULT_SETTINGS.background.gradientId;
  }

  function normalizeFolderSelection(selection = {}) {
    const selected = Array.isArray(selection.selectedIds) ? selection.selectedIds.filter(Boolean) : [];
    const expanded = Array.isArray(selection.expandedIds) ? selection.expandedIds.filter(Boolean) : [];
    return {
      selectedIds: Array.from(new Set(selected)),
      expandedIds: Array.from(new Set(expanded)),
    };
  }

  function mergeStoredPreferences(stored = {}) {
    const theme = normalizeTheme(stored.theme);
    const accent = normalizeAccent(stored.accent);
    const background = stored.background ?? {};
    const mode = background.mode === "custom" ? "custom" : "gradient";
    const gradientId = normalizeGradient(background.gradientId);
    const hasTitleBackdrop = typeof stored.titleBackdrop === "boolean";
    const titleBackdrop = hasTitleBackdrop ? stored.titleBackdrop : DEFAULT_SETTINGS.titleBackdrop;
    const hasMergePreference = typeof stored.mergeAllBookmarks === "boolean" || typeof stored.groupFoldersTogether === "boolean";
    const mergeAllBookmarks = hasMergePreference
      ? (stored.mergeAllBookmarks ?? stored.groupFoldersTogether)
      : DEFAULT_SETTINGS.mergeAllBookmarks;
    const folderColumnWidth =
      typeof stored.folderColumnWidth === "number"
        ? stored.folderColumnWidth
        : DEFAULT_SETTINGS.folderColumnWidth;
    const compactFolderHeader =
      typeof stored.compactFolderHeader === "boolean"
        ? stored.compactFolderHeader
        : DEFAULT_SETTINGS.compactFolderHeader;
    const enableBookmarkSearch =
      typeof stored.enableBookmarkSearch === "boolean"
        ? stored.enableBookmarkSearch
        : DEFAULT_SETTINGS.enableBookmarkSearch;
    const enableTopSites =
      typeof stored.enableTopSites === "boolean"
        ? stored.enableTopSites
        : DEFAULT_SETTINGS.enableTopSites;
    const lastShortcutFolderId = stored.lastShortcutFolderId ?? DEFAULT_SETTINGS.lastShortcutFolderId;

    // Merge tile settings with defaults for migration
    const storedTile = stored.tile ?? {};
    const tile = {
      size: storedTile.size ?? DEFAULT_TILE_SETTINGS.size,
      iconShape: storedTile.iconShape ?? DEFAULT_TILE_SETTINGS.iconShape,
      fontWeight: typeof storedTile.fontWeight === "number" ? storedTile.fontWeight : DEFAULT_TILE_SETTINGS.fontWeight,
      fontSize: storedTile.fontSize ?? DEFAULT_TILE_SETTINGS.fontSize,
      padding: storedTile.padding ?? DEFAULT_TILE_SETTINGS.padding,
      blur: typeof storedTile.blur === "number" ? storedTile.blur : DEFAULT_TILE_SETTINGS.blur,
      textContrast: storedTile.textContrast ?? DEFAULT_TILE_SETTINGS.textContrast,
      bgLightness: typeof storedTile.bgLightness === "number" ? storedTile.bgLightness : DEFAULT_TILE_SETTINGS.bgLightness,
      showTitle: typeof storedTile.showTitle === "boolean" ? storedTile.showTitle : DEFAULT_TILE_SETTINGS.showTitle,
    };
    const hasTileSettings = stored.tile !== undefined;

    // Merge immersive mode settings with defaults for migration
    const storedImmersive = stored.immersive ?? {};
    const immersive = {
      enabled: typeof storedImmersive.enabled === "boolean" ? storedImmersive.enabled : DEFAULT_IMMERSIVE_SETTINGS.enabled,
      opacity: typeof storedImmersive.opacity === "number" ? storedImmersive.opacity : DEFAULT_IMMERSIVE_SETTINGS.opacity,
    };
    const hasImmersiveSettings = stored.immersive !== undefined;

    const folderSelection = normalizeFolderSelection(stored.folderSelection);
    const selectionChanged =
      !arraysEqual(folderSelection.selectedIds, stored.folderSelection?.selectedIds ?? []) ||
      !arraysEqual(folderSelection.expandedIds, stored.folderSelection?.expandedIds ?? []);
    const preferenceChanged =
      theme !== stored.theme ||
      accent !== stored.accent ||
      mode !== (stored.background?.mode ?? DEFAULT_SETTINGS.background.mode) ||
      gradientId !== (stored.background?.gradientId ?? DEFAULT_SETTINGS.background.gradientId) ||
      !hasTitleBackdrop ||
      !hasMergePreference ||
      !hasTileSettings ||
      !hasImmersiveSettings ||
      folderColumnWidth !== stored.folderColumnWidth ||
      compactFolderHeader !== stored.compactFolderHeader ||
      enableBookmarkSearch !== stored.enableBookmarkSearch ||
      enableTopSites !== stored.enableTopSites ||
      lastShortcutFolderId !== stored.lastShortcutFolderId;

    return {
      settings: {
        theme,
        accent,
        background: {
          mode,
          gradientId,
        },
        titleBackdrop,
        mergeAllBookmarks,
        folderColumnWidth,
        compactFolderHeader,
        enableBookmarkSearch,
        enableTopSites,
        lastShortcutFolderId,
        tile,
        immersive,
      },
      folderSelection,
      changed: preferenceChanged || selectionChanged || (stored.version ?? STORAGE_VERSION) !== STORAGE_VERSION,
    };
  }

  function getAccent(accentId) {
    return ACCENT_OPTIONS.find((option) => option.id === accentId) ?? ACCENT_OPTIONS[0];
  }

  function getGradient(gradientId) {
    return GRADIENT_OPTIONS.find((option) => option.id === gradientId) ?? GRADIENT_OPTIONS[0];
  }

  function prioritizeOnCollapse(options, selectedId) {
    const base = [...options];
    if (!selectedId) {
      return base;
    }
    const index = base.findIndex((option) => option.id === selectedId);
    if (index <= 0) {
      return base;
    }
    const [selected] = base.splice(index, 1);
    return [selected, ...base];
  }

  function collapseAccentOptions() {
    accentOptionsOrdered = prioritizeOnCollapse(ACCENT_OPTIONS, settings?.accent);
    showAllAccents = false;
  }

  function expandAccentOptions() {
    showAllAccents = true;
  }

  function toggleAccentOptions() {
    if (showAllAccents) {
      collapseAccentOptions();
    } else {
      expandAccentOptions();
    }
  }

  function collapseGradientOptions() {
    gradientOptionsOrdered = prioritizeOnCollapse(
      GRADIENT_OPTIONS,
      settings?.background?.mode === "gradient" ? settings?.background?.gradientId : null
    );
    showAllGradients = false;
  }

  function expandGradientOptions() {
    showAllGradients = true;
  }

  function toggleGradientOptions() {
    if (showAllGradients) {
      collapseGradientOptions();
    } else {
      expandGradientOptions();
    }
  }

  $: gradientPreviewSet = new Set(
    gradientOptionsOrdered.slice(0, GRADIENT_PREVIEW_COUNT).map((option) => option.id)
  );
  $: accentPreviewSet = new Set(
    accentOptionsOrdered.slice(0, ACCENT_PREVIEW_COUNT).map((option) => option.id)
  );

  $: visibleGradientOptions = showAllGradients
    ? gradientOptionsOrdered
    : gradientOptionsOrdered.slice(0, GRADIENT_PREVIEW_COUNT);

  $: visibleAccentOptions = showAllAccents
    ? accentOptionsOrdered
    : accentOptionsOrdered.slice(0, ACCENT_PREVIEW_COUNT);

  $: if (!showAllAccents && settings.accent && !accentPreviewSet.has(settings.accent)) {
    showAllAccents = true;
  }

  $: if (
    !showAllGradients &&
    settings.background.mode === "gradient" &&
    settings.background.gradientId &&
    !gradientPreviewSet.has(settings.background.gradientId)
  ) {
    showAllGradients = true;
  }

  function ensureMediaQuery() {
    if (!mediaQuery && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    }
    return mediaQuery;
  }

  function applyTheme(themeChoice) {
    if (typeof document === "undefined") {
      return;
    }
    const normalized = normalizeTheme(themeChoice);
    const media = ensureMediaQuery();

    if (normalized === "system" && media) {
      document.body.classList.toggle("dark", media.matches);
      // Re-apply tile colors after theme change
      if (settings?.tile) {
        applyTileColors(settings.tile.textContrast, settings.tile.bgLightness);
      }
      if (!removeSystemThemeListener) {
        const handler = (event) => {
          document.body.classList.toggle("dark", event.matches);
          // Re-apply tile colors when system theme changes
          if (settings?.tile) {
            applyTileColors(settings.tile.textContrast, settings.tile.bgLightness);
          }
        };
        if (typeof media.addEventListener === "function") {
          media.addEventListener("change", handler);
          removeSystemThemeListener = () => media.removeEventListener("change", handler);
        } else if (typeof media.addListener === "function") {
          media.addListener(handler);
          removeSystemThemeListener = () => media.removeListener(handler);
        } else {
          removeSystemThemeListener = null;
        }
        if (removeSystemThemeListener) {
          cleanupFns.push(removeSystemThemeListener);
        }
      }
    } else {
      if (removeSystemThemeListener) {
        removeSystemThemeListener();
        removeSystemThemeListener = null;
      }
      document.body.classList.toggle("dark", normalized === "dark");
      // Re-apply tile colors after theme change
      if (settings?.tile) {
        applyTileColors(settings.tile.textContrast, settings.tile.bgLightness);
      }
    }

    document.body.dataset.theme = normalized;
  }

  function applyAccent(accentId) {
    if (typeof document === "undefined") {
      return;
    }
    const accent = getAccent(accentId);
    const root = document.documentElement;
    root.style.setProperty("--accent-color", accent.colors.base);
    root.style.setProperty("--accent-color-contrast", accent.colors.contrast);
    root.style.setProperty("--accent-color-soft", accent.colors.soft);
    root.style.setProperty("--accent-color-border", accent.colors.border);
  }

  function applyGradient(gradientId) {
    if (typeof document === "undefined") {
      return;
    }
    const gradient = getGradient(gradientId);
    const root = document.documentElement;
    root.style.setProperty("--page-background-light", gradient.gradients.light);
    root.style.setProperty("--page-background-dark", gradient.gradients.dark);
  }

  function applyTileSettings(tileSettings) {
    if (typeof document === "undefined" || !tileSettings) {
      return;
    }
    const root = document.documentElement;

    // Tile size
    const sizeOption = TILE_SIZE_OPTIONS.find((opt) => opt.value === tileSettings.size);
    if (sizeOption) {
      root.style.setProperty("--tile-width", `${sizeOption.width}px`);
      root.style.setProperty("--tile-grid-min", `${sizeOption.gridMin}px`);
    }

    // Icon shape (border-radius)
    root.style.setProperty("--tile-icon-radius", tileSettings.iconShape);

    // Font weight
    root.style.setProperty("--tile-font-weight", String(tileSettings.fontWeight));

    // Font size
    root.style.setProperty("--tile-font-size", tileSettings.fontSize);

    // Padding
    root.style.setProperty("--tile-padding", tileSettings.padding);

    // Blur
    root.style.setProperty("--tile-blur", `${tileSettings.blur}px`);

    // Text and background colors (theme-aware)
    applyTileColors(tileSettings.textContrast, tileSettings.bgLightness);
  }

  function applyTileColors(textContrast, bgLightness) {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const isDark = document.body.classList.contains("dark");

    // Text contrast alpha values - more dramatic range for dark mode visibility
    const textAlphas = {
      faint: isDark ? 0.35 : 0.4,
      soft: isDark ? 0.55 : 0.58,
      normal: isDark ? 0.78 : 0.75,
      strong: isDark ? 0.9 : 0.88,
      bold: isDark ? 0.98 : 0.96,
    };
    const textAlpha = textAlphas[textContrast] ?? textAlphas.normal;

    // Background lightness - adjusted for better visibility in dark mode
    // Light mode: higher = lighter bg; Dark mode: values are inverted
    const lightnessOption = TILE_BG_LIGHTNESS_OPTIONS.find((opt) => opt.value === bgLightness);
    const lightness = lightnessOption
      ? isDark
        ? lightnessOption.lightDark
        : lightnessOption.lightLight
      : isDark ? 20 : 85;
    
    // Alpha values for background - more visible range in dark mode
    const bgAlpha = isDark
      ? { 1: 0.08, 2: 0.14, 3: 0.22, 4: 0.32, 5: 0.45 }[bgLightness] ?? 0.22
      : { 1: 0.04, 2: 0.07, 3: 0.1, 4: 0.15, 5: 0.22 }[bgLightness] ?? 0.1;

    // Set CSS variables based on theme
    if (isDark) {
      root.style.setProperty("--tile-text-color", `hsla(210, 40%, 98%, ${textAlpha})`);
      root.style.setProperty("--tile-bg-color", `hsla(220, 30%, ${lightness}%, ${bgAlpha})`);
    } else {
      root.style.setProperty("--tile-text-color", `hsla(222, 50%, 2%, ${textAlpha})`);
      root.style.setProperty("--tile-bg-color", `hsla(222, 50%, ${lightness}%, ${bgAlpha})`);
    }
  }

  function schedulePersistPreferences() {
    if (!shouldPersistPreferences || !hasHydratedSettings || !hasHydratedSelection) {
      return;
    }
    if (persistSettingsHandle) {
      clearTimeout(persistSettingsHandle);
    }
    const payload = {
      theme: settings.theme,
      accent: settings.accent,
      titleBackdrop: settings.titleBackdrop,
      mergeAllBookmarks: settings.mergeAllBookmarks,
      folderColumnWidth: settings.folderColumnWidth,
      compactFolderHeader: settings.compactFolderHeader,
      enableBookmarkSearch: settings.enableBookmarkSearch,
      enableTopSites: settings.enableTopSites,
      lastShortcutFolderId: settings.lastShortcutFolderId,
      background: { ...settings.background },
      tile: settings.tile ? { ...settings.tile } : undefined,
      immersive: settings.immersive ? { ...settings.immersive } : undefined,
      folderSelection: {
        selectedIds: Array.from(selectedFolderIds),
        expandedIds: Array.from(expandedFolderIds),
      },
      version: STORAGE_VERSION,
    };
    persistSettingsHandle = setTimeout(async () => {
      persistSettingsHandle = null;
      try {
        const tasks = [chromeApi.storage.local.set({ [SETTINGS_KEY]: payload })];
        if (shouldSyncPreferences) {
          tasks.push(chromeApi.storage.sync.set({ [SYNC_SETTINGS_KEY]: payload }));
        }
        await Promise.all(tasks);
      } catch (error) {
        console.error("Bookmark Dial: failed to store preferences", error);
      }
    }, 120);
  }

  function closeSettings() {
    if (!settingsOpen) {
      return;
    }
    settingsOpen = false;
    settingsButton?.focus();
  }

  function toggleSettings() {
    settingsOpen = !settingsOpen;
  }

  function setThemeChoice(themeId) {
    const normalized = normalizeTheme(themeId);
    if (settings.theme === normalized) {
      return;
    }
    settings = {
      ...settings,
      theme: normalized,
    };
  }

  function setAccentChoice(accentId) {
    const normalized = normalizeAccent(accentId);
    if (settings.accent === normalized) {
      return;
    }
    settings = {
      ...settings,
      accent: normalized,
    };
  }

  function setTitleBackdrop(enabled) {
    const nextValue = Boolean(enabled);
    if (settings.titleBackdrop === nextValue) {
      return;
    }
    settings = {
      ...settings,
      titleBackdrop: nextValue,
    };
  }

  function setMergeAllBookmarks(enabled) {
    const nextValue = Boolean(enabled);
    if (settings.mergeAllBookmarks === nextValue) {
      return;
    }
    settings = {
      ...settings,
      mergeAllBookmarks: nextValue,
    };
  }

  function setFolderColumnWidth(width) {
    const nextValue = Number(width);
    if (settings.folderColumnWidth === nextValue) {
      return;
    }
    settings = {
      ...settings,
      folderColumnWidth: nextValue,
    };
  }

  function setCompactFolderHeader(enabled) {
    const nextValue = Boolean(enabled);
    if (settings.compactFolderHeader === nextValue) {
      return;
    }
    settings = {
      ...settings,
      compactFolderHeader: nextValue,
    };
  }

  function setEnableBookmarkSearch(enabled) {
    const nextValue = Boolean(enabled);
    if (settings.enableBookmarkSearch === nextValue) {
      return;
    }
    settings = {
      ...settings,
      enableBookmarkSearch: nextValue,
    };
    if (!nextValue) {
      bookmarkSearchVisible = false;
      bookmarkSearchQuery = "";
    }
  }

  function setEnableTopSites(enabled) {
    const nextValue = Boolean(enabled);
    if (settings.enableTopSites === nextValue) {
      return;
    }
    settings = {
      ...settings,
      enableTopSites: nextValue,
    };
    if (nextValue && !topSitesLoaded) {
      loadTopSites();
    }
  }

  // Tile customization handlers
  function setTileSize(size) {
    if (settings.tile?.size === size) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, size },
    };
  }

  function setTileIconShape(iconShape) {
    if (settings.tile?.iconShape === iconShape) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, iconShape },
    };
  }

  function setTileFontWeight(fontWeight) {
    if (settings.tile?.fontWeight === fontWeight) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, fontWeight },
    };
  }

  function setTileFontSize(fontSize) {
    if (settings.tile?.fontSize === fontSize) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, fontSize },
    };
  }

  function setTilePadding(padding) {
    if (settings.tile?.padding === padding) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, padding },
    };
  }

  function setTileBlur(blur) {
    if (settings.tile?.blur === blur) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, blur },
    };
  }

  function setTileTextContrast(textContrast) {
    if (settings.tile?.textContrast === textContrast) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, textContrast },
    };
  }

  function setTileBgLightness(bgLightness) {
    if (settings.tile?.bgLightness === bgLightness) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, bgLightness },
    };
  }

  function setShowTitle(showTitle) {
    if (settings.tile?.showTitle === showTitle) {
      return;
    }
    settings = {
      ...settings,
      tile: { ...settings.tile, showTitle },
    };
  }

  // Immersive mode handlers
  function setImmersiveEnabled(enabled) {
    const nextValue = Boolean(enabled);
    if (settings.immersive?.enabled === nextValue) {
      return;
    }
    settings = {
      ...settings,
      immersive: { ...settings.immersive, enabled: nextValue },
    };
    if (nextValue) {
      addToast("Immersive Mode on. Hover to see bookmarks. Press Esc for settings.", "info", null, 4000);
    }
  }

  function setImmersiveOpacity(opacity) {
    if (settings.immersive?.opacity === opacity) {
      return;
    }
    settings = {
      ...settings,
      immersive: { ...settings.immersive, opacity },
    };
  }

  function toggleImmersiveMode() {
    setImmersiveEnabled(!settings.immersive?.enabled);
  }

  function selectGradient(gradientId) {
    const normalized = normalizeGradient(gradientId);
    const gradient = getGradient(normalized);
    const recommendedAccent =
      gradient.accent && ACCENT_OPTIONS.some((option) => option.id === gradient.accent)
        ? gradient.accent
        : null;
    const backgroundChanged =
      settings.background.mode !== "gradient" || settings.background.gradientId !== normalized;
    const nextAccent = recommendedAccent ? normalizeAccent(recommendedAccent) : settings.accent;
    const accentChanged = Boolean(recommendedAccent) && nextAccent !== settings.accent;

    if (!backgroundChanged && !accentChanged) {
      return;
    }
    settings = {
      ...settings,
      accent: accentChanged ? nextAccent : settings.accent,
      background: {
        ...settings.background,
        mode: "gradient",
        gradientId: normalized,
      },
    };
  }

  async function showCustomBackgroundPicker() {
    closeSettings();
    await tick();
    backgroundDialogRef?.open();
  }

  async function loadSettings() {
    needsInitialPersist = false;
    selectionNeedsPersist = false;

    if (!shouldPersistPreferences) {
      settings = createDefaultSettings();
      selectedFolderIds = new Set(DEFAULT_FOLDER_SELECTION.selectedIds);
      expandedFolderIds = new Set(DEFAULT_FOLDER_SELECTION.expandedIds);
      hasHydratedSelection = true;
      applyTheme(settings.theme);
      applyAccent(settings.accent);
      applyGradient(settings.background.gradientId);
      updateFolderSummary();
      return;
    }

    let syncStored = {};
    let localStored = {};
    if (shouldSyncPreferences) {
      try {
        syncStored = await chromeApi.storage.sync.get(SYNC_SETTINGS_KEY);
      } catch (error) {
        console.warn("Bookmark Dial: failed to read sync preferences", error);
      }
    }
    try {
      localStored = await chromeApi.storage.local.get(SETTINGS_KEY);
    } catch (error) {
      console.warn("Bookmark Dial: failed to read local preferences", error);
    }

    let storedPreferences = syncStored?.[SYNC_SETTINGS_KEY];
    let migratedFromLocal = false;
    if (!storedPreferences && localStored?.[SETTINGS_KEY]) {
      storedPreferences = localStored[SETTINGS_KEY];
      migratedFromLocal = true;
    }

    const merged = mergeStoredPreferences(storedPreferences ?? DEFAULT_SYNC_PREFERENCES);
    settings = merged.settings;
    selectedFolderIds = new Set(
      merged.folderSelection.selectedIds.length ? merged.folderSelection.selectedIds : DEFAULT_FOLDER_SELECTION.selectedIds
    );
    expandedFolderIds = new Set(merged.folderSelection.expandedIds);
    hasHydratedSelection = true;
    needsInitialPersist = merged.changed || migratedFromLocal;
    selectionNeedsPersist = merged.changed || migratedFromLocal;

    applyTheme(settings.theme);
    applyAccent(settings.accent);
    applyGradient(settings.background.gradientId);
    updateFolderSummary();
  }

  $: if (!loadingSettings && hasHydratedSelection) {
    applyTheme(settings.theme);
    applyAccent(settings.accent);
    applyGradient(settings.background.gradientId);
    applyTileSettings(settings.tile);
    if (needsInitialPersist || selectionNeedsPersist || hasHydratedSettings) {
      schedulePersistPreferences();
    }
    hasHydratedSettings = true;
    needsInitialPersist = false;
    selectionNeedsPersist = false;
  }

  $: if (typeof document !== "undefined") {
    document.body.classList.toggle("settings-open", settingsOpen);
  }

  // Immersive mode body class and CSS property
  $: if (typeof document !== "undefined") {
    const immersiveEnabled = settings.immersive?.enabled ?? false;
    document.body.classList.toggle("immersive", immersiveEnabled);
    if (immersiveEnabled) {
      document.documentElement.style.setProperty(
        "--immersive-opacity-setting",
        String(settings.immersive?.opacity ?? 0.15)
      );
    } else {
      document.documentElement.style.removeProperty("--immersive-opacity-setting");
    }
  }

  // Set up ResizeObserver when gridRef becomes available
  $: if (gridRef && settings.mergeAllBookmarks) {
    setupGridResizeObserver();
  }

  $: effectiveExpandedFolderIds = (() => {
    const source = folderModalOpen && draftExpandedFolderIds ? draftExpandedFolderIds : expandedFolderIds;
    const base = new Set(source ?? []);
    if (folderSearchMatches.size) {
      const state = getBookmarkCacheState();
      folderSearchMatches.forEach((id) => {
        let currentId = state.nodesById[id]?.parentId ?? null;
        while (currentId) {
          base.add(currentId);
          currentId = state.nodesById[currentId]?.parentId ?? null;
        }
      });
    }
    return base;
  })();

  async function initialize() {
    try {
      await bootstrapBookmarkCache(chromeApi);
      defaultFolderId = await requestFolderId();
      await ensureDefaultSelection();
      await ensureInitialFoldersLoaded();
      subscribeBookmarkEvents();
      await refreshBookmarks();
    } catch (error) {
      console.error("Bookmark Dial: initialization failed", error);
      setStatus(STATUS_MESSAGES.error, "error");
    }
  }

  async function requestFolderId() {
    const response = await chromeApi.runtime.sendMessage({ type: "getFolderId" });
    if (!response?.folderId) {
      throw new Error(response?.error || "Missing folder");
    }
    return response.folderId;
  }

  async function ensureDefaultSelection() {
    if (selectedFolderIds.size === 0 && defaultFolderId) {
      selectedFolderIds = new Set([defaultFolderId]);
      selectionNeedsPersist = true;
    }
  }

  async function ensureInitialFoldersLoaded() {
    const ids = Array.from(selectedFolderIds);
    if (!ids.length) {
      return;
    }
    await Promise.allSettled(ids.map((id) => loadCacheSubtree(chromeApi, id)));
    updateFolderSummary();
  }

  function subscribeBookmarkEvents() {
    const debouncedRefresh = debounce(() => refreshBookmarks(), 150);

    const onCreated = (_id, node) => {
      applyCreatedNode(node);
      if (!node.url && shouldAutoSelectNewFolder(node)) {
        addFolderToSelection(node.id);
      }
      if (node.url) {
        if (isFolderOrAncestorSelected(node.parentId)) {
          debouncedRefresh();
        }
      } else if (selectedFolderIds.has(node.id)) {
        debouncedRefresh();
      }
    };
    chromeApi.bookmarks.onCreated.addListener(onCreated);

    const onChanged = (id, changeInfo) => {
      applyChangedNode(id, changeInfo);
      if (bookmarkIdSet.has(id)) {
        debouncedRefresh();
      }
    };
    chromeApi.bookmarks.onChanged.addListener(onChanged);

    const onMoved = (id, moveInfo) => {
      applyMovedNode(id, moveInfo);
      if (
        bookmarkIdSet.has(id) ||
        isFolderOrAncestorSelected(moveInfo.parentId) ||
        isFolderOrAncestorSelected(moveInfo.oldParentId)
      ) {
        debouncedRefresh();
      }
    };
    chromeApi.bookmarks.onMoved.addListener(onMoved);

    const onRemoved = (id, removeInfo) => {
      // Snapshot the node from cache before removal so we know its type/children.
      const removedSnapshot = getNodeById(id);
      if (removedSnapshot) {
        handleRemovedNode(id, { ...removeInfo, node: removedSnapshot });
      }
      applyRemovedNode(id, removeInfo);
      if (bookmarkIdSet.has(id) || isFolderOrAncestorSelected(removeInfo.parentId)) {
        bookmarkIdSet.delete(id);
        debouncedRefresh();
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

  function handleRemovedNode(id, removeInfo = {}) {
    if (!removeInfo?.node) {
      return;
    }
    if (!removeInfo.node.url) {
      const removedIds = new Set(getDescendantFolderIds(id));
      if (removedIds.size) {
        const nextSelection = new Set(selectedFolderIds);
        let changed = false;
        removedIds.forEach((removedId) => {
          if (nextSelection.has(removedId)) {
            nextSelection.delete(removedId);
            changed = true;
          }
        });
        if (changed) {
          selectedFolderIds = nextSelection;
          selectionNeedsPersist = true;
          updateFolderSummary();
          schedulePersistPreferences();
          if (!selectedFolderIds.size) {
            Promise.resolve()
              .then(() => ensureDefaultSelection())
              .then(() => ensureInitialFoldersLoaded())
              .then(() => refreshBookmarks());
          }
        }
      }
      if (id === defaultFolderId) {
        handleMissingFolder();
      }
    }
  }

  async function handleMissingFolder() {
    setStatus("Default folder was removed. Recreating…");
    try {
      const response = await chromeApi.runtime.sendMessage({ type: "resetFolderCache" });
      if (response?.folderId) {
        defaultFolderId = response.folderId;
        await addFolderToSelection(defaultFolderId);
        await refreshBookmarks();
        setStatus("Default folder restored.", "success");
      } else {
        throw new Error(response?.error || "Unable to recreate folder");
      }
    } catch (error) {
      console.error("Bookmark Dial: missing folder recovery failed", error);
      setStatus(STATUS_MESSAGES.error, "error");
    }
  }

  async function computeSelectionPreview(selectionSet, signal = null) {
    const working = selectionSet instanceof Set ? new Set(selectionSet) : new Set(selectionSet ?? []);
    if (!working.size) {
      return { items: [], counts: new Map(), total: 0, groups: [] };
    }

    // Check if aborted before starting
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // Load subtrees - check if folders have their bookmark children loaded (not just folder structure)
    const state = getBookmarkCacheState();
    const foldersNeedingLoad = Array.from(working).filter((id) => {
      const node = state.nodesById[id];
      if (!node) return true;
      if (!node.childrenLoaded) return true;
      // Check if any child is missing from cache (bookmarks weren't loaded, only folder tree was)
      const hasUnloadedChildren = (node.childrenIds ?? []).some(
        (childId) => !state.nodesById[childId]
      );
      return hasUnloadedChildren;
    });

    if (foldersNeedingLoad.length > 0) {
      await Promise.all(foldersNeedingLoad.map((id) => loadCacheSubtree(chromeApi, id)));
    }

    // Check if aborted after loading
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // Re-get state after potential loads
    const freshState = getBookmarkCacheState();
    const seenUrls = new Map();
    const folderUrlSets = new Map();
    const aggregated = [];
    const folderGroups = [];
    working.forEach((folderId) => {
      const allBookmarkNodes = gatherBookmarksForFolder(freshState, folderId, [], true);
      const directBookmarkNodes = gatherBookmarksForFolder(freshState, folderId, [], false);
      const path = getFolderPath(folderId);
      const label = path[path.length - 1] || "Untitled folder";
      allBookmarkNodes.forEach((node) => {
        const normalized = normalizeUrl(node.url) || node.url;
        const key = (normalized || node.url || node.id).toLowerCase();
        // Track all bookmarks (recursive) for count in folder summary
        const folderSet = folderUrlSets.get(folderId) ?? new Set();
        folderSet.add(key);
        folderUrlSets.set(folderId, folderSet);
        if (!seenUrls.has(key)) {
          seenUrls.set(key, node.id);
          aggregated.push({
            ...node,
            sourceFolderId: folderId,
            sourcePath: path,
          });
        }
      });
      const folderItems = directBookmarkNodes.map((node) => {
        const normalized = normalizeUrl(node.url) || node.url;
        const key = (normalized || node.url || node.id).toLowerCase();
        return {
          ...node,
          sourceFolderId: folderId,
          sourcePath: path,
        };
      });
      folderGroups.push({
        id: folderId,
        label,
        path,
        fullPath: path.join(" › "),
        items: folderItems,
      });
    });
    folderGroups.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    const counts = new Map(Array.from(folderUrlSets.entries()).map(([id, urlSet]) => [id, urlSet.size]));
    return { items: aggregated, counts, total: aggregated.length, groups: folderGroups };
  }

  async function refreshBookmarks() {
    const nonce = ++refreshNonce;
    if (!selectedFolderIds.size) {
      bookmarks = [];
      folderBookmarkGroups = [];
      bookmarkIdSet = new Set();
      folderBookmarkCounts = new Map();
      combinedBookmarkCount = 0;
      updateFolderSummary();
      isLoading = false;
      setStatus("Select folders to populate this page.", "info");
      return;
    }

    // Cancel any in-flight subtree loads
    if (subtreeLoadController) {
      subtreeLoadController.abort();
    }
    subtreeLoadController = new AbortController();
    const signal = subtreeLoadController.signal;

    try {
      const preview = await computeSelectionPreview(selectedFolderIds, signal);
      if (nonce !== refreshNonce) {
        return;
      }
      folderBookmarkCounts = preview.counts;
      combinedBookmarkCount = preview.total;
      updateBookmarkState(preview.items);
      folderBookmarkGroups = preview.groups.map((group) => ({
        id: group.id,
        label: group.label,
        path: group.path,
        fullPath: group.fullPath,
        items: group.items.map((item) => formatBookmarkForDisplay(item)),
      }));
      updateFolderSummary();
      isLoading = false;
      if (preview.items.length === 0) {
        setStatus(STATUS_MESSAGES.empty);
      } else {
        setStatus("", "info");
      }
    } catch (error) {
      // Ignore abort errors - they're expected when a new refresh starts
      if (error.name === "AbortError") {
        return;
      }
      console.error("Bookmark Dial: failed to load bookmarks", error);
      setStatus(STATUS_MESSAGES.error, "error");
    }
  }

  function gatherBookmarksForFolder(state, folderId, bucket = [], recursive = true) {
    const folder = state.nodesById[folderId];
    if (!folder || !folder.isFolder) {
      return bucket;
    }
    const children = folder.childrenIds ?? [];
    children.forEach((childId) => {
      const child = state.nodesById[childId];
      if (!child) {
        return;
      }
      if (child.url) {
        bucket.push(child);
      } else if (recursive) {
        gatherBookmarksForFolder(state, childId, bucket, true);
      }
    });
    return bucket;
  }

  function formatBookmarkForDisplay(bookmark) {
    const displayTitle = bookmark.title || bookmark.url;
    return {
      ...bookmark,
      displayTitle,
      initials: deriveInitials(displayTitle),
      palette: generateDialPalette(displayTitle),
      fallback: false,
    };
  }

  /**
   * Optimized bookmark state update that preserves object references for unchanged bookmarks.
   * This prevents unnecessary re-renders and favicon re-fetches.
   */
  function updateBookmarkState(list) {
    const newIdSet = new Set(list.map((bookmark) => bookmark.id));
    bookmarkIdSet = newIdSet;

    // Build new bookmarks array, reusing existing objects when possible
    const newBookmarks = [];
    const newBookmarkById = new Map();

    for (const rawBookmark of list) {
      const id = rawBookmark.id;
      const existing = bookmarkById.get(id);

      // Check if we can reuse the existing formatted bookmark
      // Only reuse if title and url haven't changed (the key display properties)
      if (existing &&
          existing.title === rawBookmark.title &&
          existing.url === rawBookmark.url &&
          existing.index === rawBookmark.index) {
        // Reuse the existing object to preserve referential equality
        newBookmarks.push(existing);
        newBookmarkById.set(id, existing);
      } else {
        // Format new bookmark
        const formatted = formatBookmarkForDisplay(rawBookmark);
        newBookmarks.push(formatted);
        newBookmarkById.set(id, formatted);
      }
    }

    bookmarkById = newBookmarkById;
    bookmarks = newBookmarks;
  }

  function setFolderLoading(folderId, isLoading) {
    const next = new Set(loadingFolderIds);
    if (isLoading) {
      next.add(folderId);
    } else {
      next.delete(folderId);
    }
    loadingFolderIds = next;
  }

  function shouldAutoSelectNewFolder(node) {
    if (!node || node.url) {
      return false;
    }
    return isFolderOrAncestorSelected(node.parentId);
  }

  function isFolderOrAncestorSelected(folderId) {
    if (!folderId) {
      return false;
    }
    const state = getBookmarkCacheState();
    let currentId = folderId;
    while (currentId) {
      if (selectedFolderIds.has(currentId)) {
        return true;
      }
      const current = state.nodesById[currentId];
      currentId = current?.parentId ?? null;
    }
    return false;
  }

  async function addFolderToSelection(folderId) {
    if (!folderId) {
      return;
    }
    await loadCacheSubtree(chromeApi, folderId);
    const descendants = getDescendantFolderIds(folderId);
    const next = new Set(selectedFolderIds);
    let changed = false;
    descendants.forEach((id) => {
      if (!next.has(id)) {
        next.add(id);
        changed = true;
      }
    });
    if (changed) {
      selectedFolderIds = next;
      selectionNeedsPersist = true;
      await ensureInitialFoldersLoaded();
      await refreshBookmarks();
      schedulePersistPreferences();
    }
  }

  async function toggleFolderSelection(nodeId) {
    if (!nodeId) {
      return;
    }
    // With eager loading, all folders are already in the cache
    // No need to load subtree anymore
    const descendants = getDescendantFolderIds(nodeId);
    if (!descendants.length) {
      return;
    }
    const usingDraft = folderModalOpen;
    const sourceSet =
      usingDraft && draftSelectedFolderIds
        ? draftSelectedFolderIds
        : usingDraft
        ? new Set(selectedFolderIds)
        : selectedFolderIds;
    const next = new Set(sourceSet);
    const fullySelected = descendants.every((id) => next.has(id));
    if (fullySelected) {
      descendants.forEach((id) => next.delete(id));
    } else {
      descendants.forEach((id) => next.add(id));
    }
    if (usingDraft) {
      draftSelectedFolderIds = next;
      const nonce = ++draftPreviewNonce;
      const preview = await computeSelectionPreview(draftSelectedFolderIds);
      if (nonce !== draftPreviewNonce) {
        return;
      }
      draftBookmarkCounts = preview.counts;
      draftCombinedBookmarkCount = preview.total;
      draftFolderSummary = buildFolderSummary(draftSelectedFolderIds, draftBookmarkCounts);
    } else if (!setsEqual(selectedFolderIds, next)) {
      selectedFolderIds = next;
      selectionNeedsPersist = true;
      await ensureDefaultSelection();
      await ensureInitialFoldersLoaded();
      await refreshBookmarks();
      schedulePersistPreferences();
    }
  }

  function toggleFolderExpansion(nodeId) {
    if (!nodeId) {
      return;
    }
    const state = getBookmarkCacheState();
    const node = state.nodesById[nodeId];
    if (!node?.isFolder) {
      return;
    }

    // With eager loading, check if node actually has folder children
    const hasFolderChildren = node.childrenIds?.some((childId) => {
      const childNode = state.nodesById[childId];
      return childNode?.isFolder;
    }) ?? false;

    if (!hasFolderChildren) {
      return; // Don't expand folders without subfolders
    }

    const usingDraft = folderModalOpen;
    const sourceSet =
      usingDraft && draftExpandedFolderIds
        ? draftExpandedFolderIds
        : usingDraft
        ? new Set(expandedFolderIds)
        : expandedFolderIds;
    const next = new Set(sourceSet ?? []);
    const original = new Set(next);
    const commit = (set, { persist = false } = {}) => {
      if (usingDraft) {
        draftExpandedFolderIds = set;
      } else {
        expandedFolderIds = set;
        if (persist) {
          selectionNeedsPersist = true;
          schedulePersistPreferences();
        }
      }
    };

    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }

    const changed = !setsEqual(original, next);
    commit(next, { persist: changed });
  }

  async function clearFolderSelection() {
    if (folderModalOpen) {
      draftSelectedFolderIds = new Set();
      draftPreviewNonce++;
      draftBookmarkCounts = new Map();
      draftCombinedBookmarkCount = 0;
      draftFolderSummary = [];
      return;
    }
    selectedFolderIds = new Set();
    selectionNeedsPersist = true;
    await ensureDefaultSelection();
    await ensureInitialFoldersLoaded();
    await refreshBookmarks();
    schedulePersistPreferences();
  }

  async function confirmFolderSelection() {
    if (!folderModalOpen) {
      return;
    }
    const nextSelected = new Set(draftSelectedFolderIds ?? []);
    const nextExpanded = new Set(draftExpandedFolderIds ?? []);
    const selectionChanged = !setsEqual(selectedFolderIds, nextSelected);
    const expansionChanged = !setsEqual(expandedFolderIds, nextExpanded);
    folderModalOpen = false;
    resetDraftState();
    if (selectionChanged) {
      selectedFolderIds = nextSelected;
      selectionNeedsPersist = true;
      await ensureDefaultSelection();
      await ensureInitialFoldersLoaded();
      await refreshBookmarks();
    }
    if (expansionChanged) {
      expandedFolderIds = nextExpanded;
      selectionNeedsPersist = true;
    }
    if (selectionChanged || expansionChanged) {
      schedulePersistPreferences();
    } else {
      updateFolderSummary();
    }
  }

  async function openFolderModal() {
    // Eagerly load the entire folder tree to avoid lazy loading issues
    await loadEntireFolderTree(chromeApi);

    draftSelectedFolderIds = new Set(selectedFolderIds);
    draftExpandedFolderIds = new Set(expandedFolderIds);
    draftBookmarkCounts = new Map(folderBookmarkCounts);
    draftCombinedBookmarkCount = combinedBookmarkCount;
    draftFolderSummary = buildFolderSummary(draftSelectedFolderIds, draftBookmarkCounts);
    draftPreviewNonce = 0;
    folderSearchQuery = "";
    folderSearchMatches = new Set();
    visibleFolderIds = null;
    folderModalOpen = true;
  }

  function resetDraftState() {
    draftSelectedFolderIds = null;
    draftExpandedFolderIds = null;
    draftFolderSummary = [];
    draftBookmarkCounts = new Map();
    draftCombinedBookmarkCount = 0;
    draftPreviewNonce = 0;
    folderSearchQuery = "";
    folderSearchMatches = new Set();
    visibleFolderIds = null;
  }

  function closeFolderModal() {
    folderModalOpen = false;
    resetDraftState();
  }

  function buildFolderSummary(selectionSet, countsMap) {
    const summaryItems = Array.from(selectionSet ?? []).map((id) => {
      const path = getFolderPath(id);
      const label = path[path.length - 1] || "Untitled folder";
      return {
        id,
        path,
        label,
        fullPath: path.join(" › "),
        count: countsMap?.get(id) ?? 0,
      };
    });
    summaryItems.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    return summaryItems;
  }

  /**
   * Memoized folder summary update - only rebuilds when selection or counts actually change.
   */
  function updateFolderSummary() {
    // Create cache keys from current state
    const selectionKey = Array.from(selectedFolderIds).sort().join(",");
    const countsKey = Array.from(folderBookmarkCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => `${id}:${count}`)
      .join(",");

    // Skip rebuild if nothing changed
    if (selectionKey === lastSummarySelectionKey && countsKey === lastSummaryCountsKey) {
      folderSummary = cachedFolderSummary;
      return;
    }

    // Rebuild and cache
    lastSummarySelectionKey = selectionKey;
    lastSummaryCountsKey = countsKey;
    cachedFolderSummary = buildFolderSummary(selectedFolderIds, folderBookmarkCounts);
    folderSummary = cachedFolderSummary;
  }

  function getFolderCheckboxState(nodeId) {
    const state = getBookmarkCacheState();
    const node = state.nodesById[nodeId];
    const selectionSet =
      folderModalOpen && draftSelectedFolderIds ? draftSelectedFolderIds : selectedFolderIds;
    if (!node?.isFolder) {
      return selectionSet.has(nodeId) ? "selected" : "none";
    }
    const descendantIds = getDescendantFolderIds(nodeId);
    if (!descendantIds.length) {
      return selectionSet.has(nodeId) ? "selected" : "none";
    }
    const selectedCount = descendantIds.filter((id) => selectionSet.has(id)).length;
    if (selectedCount === 0) {
      return "none";
    }
    if (selectedCount === descendantIds.length) {
      return "selected";
    }
    return "partial";
  }

  async function handleFolderSearch(query) {
    folderSearchQuery = query;
    const trimmed = query.trim();
    if (!trimmed) {
      folderSearchMatches = new Set();
      visibleFolderIds = null;
      return;
    }
    if (chromeApi?.bookmarks?.search) {
      try {
        const results = await chromeApi.bookmarks.search({ query: trimmed });
        const folders = results.filter((node) => !node.url);
        for (const folder of folders) {
          await loadCacheSubtree(chromeApi, folder.id);
          let parentId = folder.parentId;
          while (parentId) {
            await loadCacheSubtree(chromeApi, parentId);
            const parentNode = getBookmarkCacheState().nodesById[parentId];
            parentId = parentNode?.parentId ?? null;
          }
        }
      } catch (error) {
        console.warn("Bookmark Dial: folder search failed", error);
      }
    }

    const index = buildSearchIndex();
    const lowered = trimmed.toLowerCase();
    const matches = index.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(lowered);
      const pathMatch = item.path.join(" ").toLowerCase().includes(lowered);
      return titleMatch || pathMatch;
    });
    const matchIds = matches.map((item) => item.id);
    folderSearchMatches = new Set(matchIds);
    const visible = new Set();
    const stateLocal = getBookmarkCacheState();
    matchIds.forEach((id) => {
      let current = stateLocal.nodesById[id];
      while (current) {
        visible.add(current.id);
        if (!current.parentId) {
          break;
        }
        current = stateLocal.nodesById[current.parentId];
      }
      const node = stateLocal.nodesById[id];
      node?.childrenIds?.forEach((childId) => {
        const childNode = stateLocal.nodesById[childId];
        if (childNode?.isFolder) {
          visible.add(childId);
        }
      });
    });
    visibleFolderIds = visible;
  }

  function handleExternalPreferences(preferences) {
    const merged = mergeStoredPreferences(preferences);
    const nextSettings = merged.settings;
    const tileChanged =
      nextSettings.tile?.size !== settings.tile?.size ||
      nextSettings.tile?.iconShape !== settings.tile?.iconShape ||
      nextSettings.tile?.fontWeight !== settings.tile?.fontWeight ||
      nextSettings.tile?.fontSize !== settings.tile?.fontSize ||
      nextSettings.tile?.padding !== settings.tile?.padding ||
      nextSettings.tile?.blur !== settings.tile?.blur ||
      nextSettings.tile?.textContrast !== settings.tile?.textContrast ||
      nextSettings.tile?.bgLightness !== settings.tile?.bgLightness ||
      nextSettings.tile?.showTitle !== settings.tile?.showTitle;
    const settingsChanged =
      nextSettings.theme !== settings.theme ||
      nextSettings.accent !== settings.accent ||
      nextSettings.background.mode !== settings.background.mode ||
      nextSettings.background.gradientId !== settings.background.gradientId ||
      nextSettings.titleBackdrop !== settings.titleBackdrop ||
      nextSettings.mergeAllBookmarks !== settings.mergeAllBookmarks ||
      nextSettings.folderColumnWidth !== settings.folderColumnWidth ||
      nextSettings.compactFolderHeader !== settings.compactFolderHeader ||
      nextSettings.enableBookmarkSearch !== settings.enableBookmarkSearch ||
      nextSettings.enableTopSites !== settings.enableTopSites ||
      nextSettings.lastShortcutFolderId !== settings.lastShortcutFolderId ||
      tileChanged;
    if (settingsChanged) {
      settings = {
        ...settings,
        ...nextSettings,
        background: { ...nextSettings.background },
        tile: nextSettings.tile ? { ...nextSettings.tile } : settings.tile,
      };
    }

    const nextSelected = new Set(merged.folderSelection.selectedIds);
    const nextExpanded = new Set(merged.folderSelection.expandedIds);
    const selectionChanged = !setsEqual(nextSelected, selectedFolderIds);
    const expansionChanged = !setsEqual(nextExpanded, expandedFolderIds);

    if (selectionChanged) {
      selectedFolderIds = nextSelected;
      updateFolderSummary();
      refreshBookmarks();
    }

    if (expansionChanged) {
      expandedFolderIds = nextExpanded;
    }

    if (selectionChanged || expansionChanged) {
      selectionNeedsPersist = false;
    }
  }

  async function getFaviconUrl(url) {
    // Use Chrome's native Favicon API directly - no base64 conversion needed
    try {
      const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
      faviconUrl.searchParams.set("pageUrl", url);
      faviconUrl.searchParams.set("size", FAVICON_SIZE.toString());

      // Return the Chrome favicon URL directly instead of converting to base64
      // This avoids massive memory allocation from data URLs
      return faviconUrl.toString();
    } catch {
      return '';
    }
  }

  function applyFallbackToList(list = [], bookmarkId) {
    let changed = false;
    const next = list.map((bookmark) => {
      if (bookmark.id !== bookmarkId || bookmark.fallback) {
        return bookmark;
      }
      changed = true;
      return { ...bookmark, fallback: true };
    });
    return { next, changed };
  }

  function showFallback(bookmarkId) {
    const { next, changed } = applyFallbackToList(bookmarks, bookmarkId);
    if (!changed) {
      return;
    }
    bookmarks = next;
    let groupsChanged = false;
    const updatedGroups = folderBookmarkGroups.map((group) => {
      const { next: nextItems, changed: groupChanged } = applyFallbackToList(group.items, bookmarkId);
      if (!groupChanged) {
        return group;
      }
      groupsChanged = true;
      return { ...group, items: nextItems };
    });
    if (groupsChanged) {
      folderBookmarkGroups = updatedGroups;
    }
  }

  function toggleTileMenu(bookmarkId) {
    openMenuId = openMenuId === bookmarkId ? null : bookmarkId;
  }

  function closeTileMenu() {
    openMenuId = null;
  }

  // Toast notification functions
  function addToast(message, type = "info", undoData = null, duration = 5000) {
    const id = ++toastIdCounter;
    const toast = { id, message, type, undoData };

    // Limit to MAX_TOASTS - remove oldest if we exceed the limit
    let newToasts = [...toasts, toast];
    if (newToasts.length > MAX_TOASTS) {
      newToasts = newToasts.slice(-MAX_TOASTS);
    }
    toasts = newToasts;

    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }

  function dismissToast(id) {
    toasts = toasts.filter((t) => t.id !== id);
  }

  async function handleToastUndo(toast) {
    if (!toast?.undoData) return;
    const { action, data } = toast.undoData;
    try {
      if (action === "removeBookmark" && data) {
        await chromeApi.bookmarks.create({
          parentId: data.parentId,
          title: data.title,
          url: data.url,
          index: data.index,
        });
        addToast("Bookmark restored", "success");
      }
    } catch (error) {
      console.error("Bookmark Dial: undo failed", error);
      addToast("Failed to undo", "error");
    }
    dismissToast(toast.id);
  }

  // Welcome modal functions
  async function checkWelcome() {
    if (!shouldPersistPreferences) {
      showWelcome = true;
      return;
    }
    try {
      const stored = await chromeApi.storage.local.get(WELCOME_KEY);
      if (!stored?.[WELCOME_KEY]) {
        showWelcome = true;
      }
    } catch (error) {
      console.warn("Bookmark Dial: failed to check welcome state", error);
    }
  }

  async function dismissWelcome() {
    showWelcome = false;
    if (shouldPersistPreferences) {
      try {
        await chromeApi.storage.local.set({ [WELCOME_KEY]: true });
      } catch (error) {
        console.warn("Bookmark Dial: failed to save welcome state", error);
      }
    }
  }

  // Context menu functions
  function showContextMenu(event, bookmark) {
    event.preventDefault();
    closeTileMenu();
    contextMenuBookmark = bookmark;
    const menuWidth = 180;
    const menuHeight = 180;
    let x = event.clientX;
    let y = event.clientY;
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }
    contextMenuPosition = { x, y };
    contextMenuVisible = true;
  }

  function closeContextMenu() {
    contextMenuVisible = false;
    contextMenuBookmark = null;
  }

  async function handleContextMenuOpenNewTab() {
    if (contextMenuBookmark?.url) {
      window.open(contextMenuBookmark.url, "_blank");
    }
    closeContextMenu();
  }

  async function handleContextMenuCopyUrl() {
    if (contextMenuBookmark?.url) {
      try {
        await navigator.clipboard.writeText(contextMenuBookmark.url);
        addToast("URL copied to clipboard", "success");
      } catch (error) {
        console.error("Bookmark Dial: copy failed", error);
        addToast("Failed to copy URL", "error");
      }
    }
    closeContextMenu();
  }

  function handleContextMenuEdit() {
    if (contextMenuBookmark) {
      editBookmark(contextMenuBookmark);
    }
    closeContextMenu();
  }

  function handleContextMenuRemove() {
    if (contextMenuBookmark) {
      removeBookmark(contextMenuBookmark.id);
    }
    closeContextMenu();
  }

  // Bookmark search functions
  function toggleBookmarkSearch() {
    bookmarkSearchVisible = !bookmarkSearchVisible;
    if (!bookmarkSearchVisible) {
      bookmarkSearchQuery = "";
    }
  }

  function handleBookmarkSearchChange(query) {
    bookmarkSearchQuery = query;
  }

  function closeBookmarkSearch() {
    bookmarkSearchVisible = false;
    bookmarkSearchQuery = "";
  }

  $: filteredBookmarks = (() => {
    if (!bookmarkSearchQuery.trim()) return bookmarks;
    const query = bookmarkSearchQuery.toLowerCase().trim();
    return bookmarks.filter((b) =>
      (b.title?.toLowerCase().includes(query)) ||
      (b.url?.toLowerCase().includes(query)) ||
      (b.displayTitle?.toLowerCase().includes(query))
    );
  })();

  $: filteredFolderGroups = (() => {
    if (!bookmarkSearchQuery.trim()) return folderBookmarkGroups;
    const query = bookmarkSearchQuery.toLowerCase().trim();
    return folderBookmarkGroups.map((group) => ({
      ...group,
      items: group.items.filter((b) =>
        (b.title?.toLowerCase().includes(query)) ||
        (b.url?.toLowerCase().includes(query)) ||
        (b.displayTitle?.toLowerCase().includes(query))
      ),
    })).filter((group) => group.items.length > 0);
  })();

  // Top Sites functions
  async function loadTopSites() {
    if (topSitesLoaded) return;
    if (!chromeApi?.topSites?.get) {
      topSitesLoaded = true;
      return;
    }
    try {
      const sites = await chromeApi.topSites.get();
      topSites = (sites || []).map((site, index) => ({
        id: `topsite-${index}`,
        title: site.title || tryExtractHostname(site.url),
        url: site.url,
        displayTitle: site.title || tryExtractHostname(site.url),
        initials: deriveInitials(site.title || tryExtractHostname(site.url)),
        palette: generateDialPalette(site.title || tryExtractHostname(site.url)),
        fallback: false,
        isTopSite: true,
      }));
      topSitesLoaded = true;
    } catch (error) {
      console.warn("Bookmark Dial: failed to load top sites", error);
      topSitesLoaded = true;
    }
  }

  $: if (settings.enableTopSites && !topSitesLoaded) {
    loadTopSites();
  }

  // Reactive bounds check for focusedBookmarkIndex (safety net after deletions/filtering)
  $: {
    const displayedCount = settings.mergeAllBookmarks
      ? (settings.enableTopSites ? filteredBookmarks.length + topSites.length : filteredBookmarks.length)
      : 0;
    if (focusedBookmarkIndex >= displayedCount) {
      focusedBookmarkIndex = Math.max(displayedCount - 1, -1);
    }
  }

  // Keyboard navigation functions
  function handleGridNavigation(event) {
    const displayedBookmarks = settings.enableTopSites
      ? [...filteredBookmarks, ...topSites]
      : filteredBookmarks;

    if (!displayedBookmarks.length) return;

    const columns = getGridColumns();
    const total = displayedBookmarks.length;
    const isArrowKey = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key);

    // Initialize focus on first arrow key press if not yet focused
    if (isArrowKey && focusedBookmarkIndex < 0) {
      event.preventDefault();
      focusedBookmarkIndex = 0;
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (focusedBookmarkIndex + 1 < total) {
        focusedBookmarkIndex = focusedBookmarkIndex + 1;
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (focusedBookmarkIndex - 1 >= 0) {
        focusedBookmarkIndex = focusedBookmarkIndex - 1;
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const newIndex = focusedBookmarkIndex + columns;
      if (newIndex < total) {
        focusedBookmarkIndex = newIndex;
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const newIndex = focusedBookmarkIndex - columns;
      if (newIndex >= 0) {
        focusedBookmarkIndex = newIndex;
      }
    } else if (event.key === "Enter" && focusedBookmarkIndex >= 0) {
      event.preventDefault();
      const bookmark = displayedBookmarks[focusedBookmarkIndex];
      if (bookmark?.url) {
        window.location.href = bookmark.url;
      }
    } else if ((event.key === "Delete" || event.key === "Backspace") && focusedBookmarkIndex >= 0) {
      event.preventDefault();
      const bookmark = displayedBookmarks[focusedBookmarkIndex];
      if (bookmark && !bookmark.isTopSite) {
        // Adjust focus after deletion
        const newTotal = total - 1;
        removeBookmark(bookmark.id);
        if (newTotal === 0) {
          focusedBookmarkIndex = -1;
        } else if (focusedBookmarkIndex >= newTotal) {
          focusedBookmarkIndex = newTotal - 1;
        }
      }
    } else if (event.key >= "0" && event.key <= "9") {
      // Number keys 1-9 open items 1-9, key 0 opens item 10
      const index = event.key === "0" ? 9 : parseInt(event.key, 10) - 1;
      if (index < total) {
        event.preventDefault();
        const bookmark = displayedBookmarks[index];
        if (bookmark?.url) {
          window.location.href = bookmark.url;
        }
      }
    }
  }

  /**
   * Recalculate and cache the grid column count.
   * Called on resize events, not on every keyboard navigation.
   */
  function recalculateGridColumns() {
    if (!gridRef) {
      cachedGridColumns = 4;
      return;
    }
    try {
      const style = getComputedStyle(gridRef);
      const columns = style.getPropertyValue("grid-template-columns");
      cachedGridColumns = columns.split(" ").length || 4;
    } catch {
      cachedGridColumns = 4;
    }
  }

  /**
   * Get the cached grid column count. Use recalculateGridColumns() to update.
   */
  function getGridColumns() {
    return cachedGridColumns;
  }

  /**
   * Set up ResizeObserver to recalculate grid columns on resize.
   */
  function setupGridResizeObserver() {
    if (!gridRef || typeof ResizeObserver === "undefined") return;

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    resizeObserver = new ResizeObserver(() => {
      recalculateGridColumns();
    });

    resizeObserver.observe(gridRef);
    // Initial calculation
    recalculateGridColumns();
  }

  function handleTileFocus(index) {
    focusedBookmarkIndex = index;
  }

  // Handle grid mount event from BookmarkGrid component
  function handleGridMount(event) {
    gridRef = event.detail.gridRef;
  }

  // Drag and drop functions
  function handleDragStart(event, bookmark, folderId = null) {
    if (bookmark.isTopSite) {
      event.preventDefault();
      return;
    }
    draggedBookmark = bookmark;
    dragSourceFolderId = folderId || bookmark.parentId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", bookmark.id);
  }

  function handleDragOver(event, bookmark) {
    if (!draggedBookmark || draggedBookmark.id === bookmark.id) return;
    if (bookmark.isTopSite) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dragOverBookmark = bookmark;
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragOverBookmark = null;
    }
  }

  async function handleDrop(event, targetBookmark) {
    event.preventDefault();
    if (!draggedBookmark || draggedBookmark.id === targetBookmark.id) {
      resetDragState();
      return;
    }
    if (targetBookmark.isTopSite) {
      resetDragState();
      return;
    }
    try {
      await chromeApi.bookmarks.move(draggedBookmark.id, {
        parentId: targetBookmark.parentId,
        index: targetBookmark.index,
      });
      addToast("Bookmark moved", "success");
    } catch (error) {
      console.error("Bookmark Dial: move failed", error);
      addToast("Failed to move bookmark", "error");
    }
    resetDragState();
  }

  function handleDragEnd() {
    resetDragState();
  }

  function resetDragState() {
    draggedBookmark = null;
    dragOverBookmark = null;
    dragSourceFolderId = null;
  }

  async function handleAddBookmark(targetFolderId = null) {
    addShortcutTargetFolderId = targetFolderId;
    addShortcutModalOpen = true;
  }

  async function handleAddShortcutConfirm(data) {
    addShortcutModalOpen = false;

    const { folderId, url, title } = data;
    const normalizedUrlValue = normalizeUrl(url);

    if (!normalizedUrlValue) {
      alert("That does not appear to be a valid URL.");
      return;
    }

    try {
      await chromeApi.bookmarks.create({
        parentId: folderId,
        title,
        url: normalizedUrlValue,
      });

      // Remember this folder for next time
      settings = { ...settings, lastShortcutFolderId: folderId };
      schedulePersistPreferences();
    } catch (error) {
      console.error("Bookmark Dial: failed to create bookmark", error);
      alert("Unable to add shortcut. Please try again.");
    }
  }

  function handleAddShortcutClose() {
    addShortcutModalOpen = false;
    addShortcutTargetFolderId = null;
  }

  function getShortcutFolderOptions() {
    if (folderSummary.length) {
      return folderSummary;
    }
    const fallback = buildFolderSummary(selectedFolderIds, folderBookmarkCounts);
    if (fallback.length) {
      return fallback;
    }
    if (defaultFolderId) {
      const path = getFolderPath(defaultFolderId);
      const label = path[path.length - 1] || "Bookmark Dial";
      return [
        {
          id: defaultFolderId,
          path,
          label,
          fullPath: path.join(" › "),
          count: 0,
        },
      ];
    }
    return [];
  }

  // Reactive: Update folder options when modal state or folders change
  $: if (addShortcutModalOpen || folderSummary.length || selectedFolderIds.size) {
    shortcutFolderOptions = getShortcutFolderOptions();
    defaultShortcutFolderId = getDefaultShortcutFolderId();
  }

  function getDefaultShortcutFolderId() {
    // If called from a specific folder (grouped view), use that
    if (addShortcutTargetFolderId) {
      return addShortcutTargetFolderId;
    }

    const options = shortcutFolderOptions.length > 0 ? shortcutFolderOptions : getShortcutFolderOptions();
    if (options.length === 0) {
      return null;
    }

    // Use last used folder if it exists in the current folder list
    if (settings.lastShortcutFolderId) {
      const folderExists = options.some(opt => opt.id === settings.lastShortcutFolderId);
      if (folderExists) {
        return settings.lastShortcutFolderId;
      }
    }

    // Otherwise, default to the last folder in the currently selected folders
    return options[options.length - 1].id;
  }

  function promptForFolderChoice(options) {
    const list = options
      .map((option, index) => `${index + 1}. ${option.fullPath || option.label || "Untitled folder"}`)
      .join("\n");
    const response = prompt(
      `Select a folder for the new shortcut by entering its number:\n\n${list}\n`
    );
    if (response === null) {
      return null;
    }
    const choice = Number.parseInt(response.trim(), 10);
    if (Number.isNaN(choice) || choice < 1 || choice > options.length) {
      alert("Please enter one of the numbers shown in the list.");
      return null;
    }
    return options[choice - 1].id;
  }

  async function editBookmark(bookmark) {
    if (!bookmark?.id) {
      return;
    }
    closeTileMenu();
    const urlPrompt = prompt("Update the shortcut URL:", bookmark.url ?? "");
    if (urlPrompt === null) {
      return;
    }
    const normalizedUrlValue = normalizeUrl(urlPrompt.trim());
    if (!normalizedUrlValue) {
      alert("That does not appear to be a valid URL.");
      return;
    }

    const defaultTitle = bookmark.title?.trim()
      ? bookmark.title
      : bookmark.displayTitle || tryExtractHostname(normalizedUrlValue);
    const titlePrompt = prompt("Update the shortcut title:", defaultTitle);
    const title = titlePrompt ? titlePrompt.trim() : defaultTitle;

    try {
      await chromeApi.bookmarks.update(bookmark.id, {
        title,
        url: normalizedUrlValue,
      });
    } catch (error) {
      console.error("Bookmark Dial: failed to update bookmark", error);
      alert("Unable to update shortcut. Please try again.");
    }
  }

  async function removeBookmark(id) {
    closeTileMenu();
    closeContextMenu();
    // Find the bookmark to get its data for potential undo
    const bookmark = bookmarks.find((b) => b.id === id) ||
      folderBookmarkGroups.flatMap((g) => g.items).find((b) => b.id === id);
    if (!bookmark) {
      return;
    }
    try {
      // Get full bookmark info before removing
      const [fullBookmark] = await chromeApi.bookmarks.get(id);
      await chromeApi.bookmarks.remove(id);
      addToast(
        `"${bookmark.displayTitle || bookmark.title}" removed`,
        "info",
        {
          action: "removeBookmark",
          data: {
            parentId: String(fullBookmark.parentId),
            title: String(fullBookmark.title || ""),
            url: String(fullBookmark.url || ""),
            index: typeof fullBookmark.index === "number" ? fullBookmark.index : 0,
          },
        },
        8000
      );
    } catch (error) {
      console.error("Bookmark Dial: failed to remove bookmark", error);
      addToast("Failed to remove bookmark", "error");
    }
  }

  // Background dialog handlers
  async function handleBackgroundSubmit(file) {
    if (!file) {
      backgroundDialogRef?.close();
      return;
    }
    if (!isSupportedImage(file, MAX_BACKGROUND_BYTES)) {
      alert("Please choose a JPEG or PNG image under 10 MB.");
      return;
    }
    try {
      // Store as binary blob in IndexedDB (much more efficient than base64)
      if (shouldPersistPreferences) {
        await saveBackgroundToIndexedDB(file);
        // Also update the mode flag in chrome.storage for sync
        await chromeApi.storage.local.set({ [BACKGROUND_KEY]: "indexeddb" });
      }

      // Apply the background using object URL
      applyBackgroundBlob(file);

      settings = {
        ...settings,
        background: {
          ...settings.background,
          mode: "custom",
        },
      };
      backgroundDialogRef?.close();
    } catch (error) {
      console.error("Bookmark Dial: failed to save background", error);
      alert("Unable to store the background image. Try a smaller file.");
    }
  }

  async function handleBackgroundClear() {
    try {
      if (shouldPersistPreferences) {
        await clearBackgroundFromIndexedDB();
        await chromeApi.storage.local.remove(BACKGROUND_KEY);
      }
    } catch (error) {
      console.error("Bookmark Dial: failed to clear background", error);
    }
    applyBackgroundBlob(null);
    settings = {
      ...settings,
      background: {
        ...settings.background,
        mode: "gradient",
      },
    };
    backgroundDialogRef?.close();
  }

  function handleBackgroundCancel() {
    backgroundDialogRef?.close();
  }

  async function loadBackground() {
    if (!shouldPersistPreferences) {
      applyBackgroundBlob(null);
      if (settings.background.mode === "custom") {
        settings = {
          ...settings,
          background: {
            ...settings.background,
            mode: "gradient",
          },
        };
      }
      return;
    }
    try {
      // Try to load from IndexedDB first (new efficient storage)
      const blob = await loadBackgroundFromIndexedDB();
      if (blob) {
        applyBackgroundBlob(blob);
        return;
      }

      // Fall back to legacy chrome.storage for migration
      const stored = await chromeApi.storage.local.get(BACKGROUND_KEY);
      const storedValue = stored?.[BACKGROUND_KEY] || "";

      // If it's a data URL (legacy), migrate to IndexedDB
      if (storedValue && storedValue.startsWith("data:")) {
        // Convert data URL to blob and migrate
        try {
          const response = await fetch(storedValue);
          const blobData = await response.blob();
          await saveBackgroundToIndexedDB(blobData);
          // Update the storage key to indicate migration
          await chromeApi.storage.local.set({ [BACKGROUND_KEY]: "indexeddb" });
          applyBackgroundBlob(blobData);
        } catch (migrationError) {
          console.warn("Bookmark Dial: background migration failed, using legacy", migrationError);
          applyBackgroundImage(storedValue);
        }
        return;
      }

      // No background found
      if (!storedValue && settings.background.mode === "custom") {
        settings = {
          ...settings,
          background: {
            ...settings.background,
            mode: "gradient",
          },
        };
        needsInitialPersist = true;
      }
    } catch (error) {
      console.error("Bookmark Dial: failed to load background", error);
    }
  }

  /**
   * Apply a background from a Blob using an efficient object URL.
   * Automatically cleans up the previous object URL to prevent memory leaks.
   */
  function applyBackgroundBlob(blob) {
    // Clean up previous object URL
    if (currentBackgroundObjectUrl) {
      URL.revokeObjectURL(currentBackgroundObjectUrl);
      currentBackgroundObjectUrl = null;
    }

    if (blob) {
      currentBackgroundObjectUrl = blobToObjectUrl(blob);
      backgroundUrl = currentBackgroundObjectUrl;
    } else {
      backgroundUrl = "";
    }
  }

  /**
   * Legacy function for data URL backgrounds (for migration support).
   */
  function applyBackgroundImage(dataUrl) {
    // Clean up previous object URL if switching from blob to data URL
    if (currentBackgroundObjectUrl) {
      URL.revokeObjectURL(currentBackgroundObjectUrl);
      currentBackgroundObjectUrl = null;
    }
    backgroundUrl = dataUrl || "";
  }

  function setStatus(message, tone = "info") {
    statusMessage = message;
    statusTone = tone;
  }

  /**
   * IndexedDB helpers for efficient binary storage of large background images.
   * This avoids the memory overhead of base64 data URLs in chrome.storage.
   */
  function openBackgroundDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"));
        return;
      }
      const request = indexedDB.open(INDEXEDDB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
          db.createObjectStore(INDEXEDDB_STORE);
        }
      };
    });
  }

  async function saveBackgroundToIndexedDB(blob) {
    const db = await openBackgroundDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE, "readwrite");
      const store = transaction.objectStore(INDEXEDDB_STORE);
      const request = store.put(blob, INDEXEDDB_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      transaction.oncomplete = () => db.close();
    });
  }

  async function loadBackgroundFromIndexedDB() {
    try {
      const db = await openBackgroundDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEXEDDB_STORE, "readonly");
        const store = transaction.objectStore(INDEXEDDB_STORE);
        const request = store.get(INDEXEDDB_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
        transaction.oncomplete = () => db.close();
      });
    } catch {
      return null;
    }
  }

  async function clearBackgroundFromIndexedDB() {
    try {
      const db = await openBackgroundDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEXEDDB_STORE, "readwrite");
        const store = transaction.objectStore(INDEXEDDB_STORE);
        const request = store.delete(INDEXEDDB_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        transaction.oncomplete = () => db.close();
      });
    } catch {
      // Ignore errors on clear
    }
  }
</script>

<div
  id="background-layer"
  class:visible={settings.background.mode === "custom" && Boolean(backgroundUrl)}
  style:background-image={settings.background.mode === "custom" && backgroundUrl ? `url(${backgroundUrl})` : null}
></div>

<div class="page">
  <button
    class="icon-button"
    type="button"
    title="Settings"
    aria-label="Open settings"
    aria-expanded={settingsOpen}
    aria-controls="settings-drawer"
    on:click={toggleSettings}
    bind:this={settingsButton}
  >
    <svg
      class="icon-button__glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <path
        d="M12 8.75a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      />
      <path
        d="M21 12l-2.938 3.5-1.562 4.294L12 19l-4.5.794L5.938 15.5 3 12l2.938-3.5L7.5 4.206 12 5l4.5-.794L18.062 8.5 21 12Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>

  <SettingsDrawer
    open={settingsOpen}
    {settings}
    {folderSummary}
    {visibleAccentOptions}
    {visibleGradientOptions}
    {showAllAccents}
    {showAllGradients}
    onClose={closeSettings}
    onThemeChange={setThemeChoice}
    onAccentChange={setAccentChoice}
    onTitleBackdropChange={setTitleBackdrop}
    onGradientSelect={selectGradient}
    onCustomBackgroundClick={showCustomBackgroundPicker}
    onMergeAllChange={setMergeAllBookmarks}
    onFolderColumnWidthChange={setFolderColumnWidth}
    onCompactHeaderChange={setCompactFolderHeader}
    onSearchToggle={setEnableBookmarkSearch}
    onTopSitesToggle={setEnableTopSites}
    onToggleAccents={toggleAccentOptions}
    onToggleGradients={toggleGradientOptions}
    onOpenFolderModal={openFolderModal}
    onTileSizeChange={setTileSize}
    onTileIconShapeChange={setTileIconShape}
    onTileFontWeightChange={setTileFontWeight}
    onTileFontSizeChange={setTileFontSize}
    onTilePaddingChange={setTilePadding}
    onTileBlurChange={setTileBlur}
    onTileTextContrastChange={setTileTextContrast}
    onTileBgLightnessChange={setTileBgLightness}
    onShowTitleChange={setShowTitle}
    onImmersiveEnabledChange={setImmersiveEnabled}
    onImmersiveOpacityChange={setImmersiveOpacity}
  />

  <div
    class="settings-overlay"
    class:visible={settingsOpen}
    aria-hidden={!settingsOpen}
    on:pointerdown={closeSettings}
  ></div>

  <main>
    {#if settings.enableBookmarkSearch}
      <SearchBar
        visible={bookmarkSearchVisible}
        query={bookmarkSearchQuery}
        onSearchChange={handleBookmarkSearchChange}
        onClose={closeBookmarkSearch}
      />
    {/if}

    {#if isLoading}
      <!-- Skeleton loading UI with 5 placeholder tiles -->
      <div class="grid skeleton-grid" aria-hidden="true">
        {#each Array(5) as _, i}
          <div class="tile skeleton-tile">
            <div class="skeleton-icon"></div>
            <div class="skeleton-title"></div>
          </div>
        {/each}
      </div>
    {:else}
      <section id="status" role="status" aria-live="polite" data-tone={statusMessage ? statusTone : null}>
        {statusMessage}
      </section>

      {#if settings.mergeAllBookmarks}
      <BookmarkGrid
        bookmarks={filteredBookmarks}
        {topSites}
        showTopSites={settings.enableTopSites}
        showTitle={settings.tile?.showTitle ?? true}
        titleBackdrop={settings.titleBackdrop}
        focusedIndex={focusedBookmarkIndex}
        {openMenuId}
        {draggedBookmark}
        {dragOverBookmark}
        onTileMenu={toggleTileMenu}
        onTileEdit={editBookmark}
        onTileRemove={removeBookmark}
        onTileFallback={showFallback}
        onTileContextMenu={showContextMenu}
        onTileFocus={handleTileFocus}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onAddShortcut={handleAddBookmark}
        {getFaviconUrl}
        on:gridmount={handleGridMount}
      />
    {:else}
      <FolderGroupList
        groups={filteredFolderGroups}
        columnWidth={settings.folderColumnWidth}
        compactHeader={settings.compactFolderHeader}
        showTitle={settings.tile?.showTitle ?? true}
        titleBackdrop={settings.titleBackdrop}
        {openMenuId}
        {draggedBookmark}
        {dragOverBookmark}
        onTileMenu={toggleTileMenu}
        onTileEdit={editBookmark}
        onTileRemove={removeBookmark}
        onTileFallback={showFallback}
        onTileContextMenu={showContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onAddShortcut={handleAddBookmark}
        {getFaviconUrl}
      />
    {/if}
    {/if}
  </main>

  <FolderSelectionModal
    open={folderModalOpen}
    rootIds={$bookmarkCache.rootIds ?? []}
    expandedIds={effectiveExpandedFolderIds}
    loadingIds={loadingFolderIds}
    visibleIds={visibleFolderIds}
    searchQuery={folderSearchQuery}
    searchMatches={folderSearchMatches}
    selectedIds={folderModalOpen && draftSelectedFolderIds ? draftSelectedFolderIds : selectedFolderIds}
    summary={folderModalOpen ? draftFolderSummary : folderSummary}
    selectedFolderCount={folderModalOpen ? draftSelectedFolderIds?.size ?? 0 : selectedFolderIds.size}
    totalBookmarkCount={folderModalOpen ? draftCombinedBookmarkCount : combinedBookmarkCount}
    toggleSelection={toggleFolderSelection}
    toggleExpansion={toggleFolderExpansion}
    getCheckboxState={getFolderCheckboxState}
    onSearchChange={handleFolderSearch}
    onRequestClose={closeFolderModal}
    onConfirmSelection={confirmFolderSelection}
    onClearSelection={clearFolderSelection}
  />

  <AddShortcutModal
    open={addShortcutModalOpen}
    folders={shortcutFolderOptions}
    defaultFolderId={defaultShortcutFolderId}
    onConfirm={handleAddShortcutConfirm}
    onClose={handleAddShortcutClose}
  />

  <WelcomeModal
    open={showWelcome}
    onDismiss={dismissWelcome}
    onGetStarted={dismissWelcome}
  />

  <ContextMenu
    bookmark={contextMenuBookmark}
    position={contextMenuPosition}
    visible={contextMenuVisible}
    on:edit={handleContextMenuEdit}
    on:remove={handleContextMenuRemove}
    on:opennewtab={handleContextMenuOpenNewTab}
    on:copyurl={handleContextMenuCopyUrl}
    on:close={closeContextMenu}
  />

  <ToastNotification
    {toasts}
    onDismiss={dismissToast}
    onUndo={handleToastUndo}
  />
</div>

<BackgroundPickerDialog
  bind:this={backgroundDialogRef}
  onSubmit={handleBackgroundSubmit}
  onClear={handleBackgroundClear}
  onCancel={handleBackgroundCancel}
/>
