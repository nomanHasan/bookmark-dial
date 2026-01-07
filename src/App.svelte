<script>
  import { onMount, tick } from "svelte";
  import FolderSelectionModal from "./components/FolderSelectionModal.svelte";
  import BookmarkTile from "./components/BookmarkTile.svelte";
  import ToastNotification from "./components/ToastNotification.svelte";
  import WelcomeModal from "./components/WelcomeModal.svelte";
  import ContextMenu from "./components/ContextMenu.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import { developerTools } from './data/mock.js';
  import { literatureLinks } from './data/literature.js';
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

  const STATUS_MESSAGES = {
    loading: "Loading Bookmark Dial…",
    empty: "No bookmarks yet. Add shortcuts from this page or the bookmark manager.",
    error: "Bookmark Dial folder is unavailable. Try reopening the tab or reinstalling the extension.",
  };

  const FAVICON_SIZE = 64;
  const BACKGROUND_KEY = "customBackgroundImage";
  const SETTINGS_KEY = "uiPreferences";
  const SYNC_SETTINGS_KEY = "dialPreferences";
  const STORAGE_VERSION = 2;
  const WELCOME_KEY = "hasSeenWelcome";
  const DEFAULT_FOLDER_SELECTION = {
    selectedIds: [],
    expandedIds: [],
  };
  const MAX_BACKGROUND_BYTES = 4 * 1024 * 1024;

  const THEME_OPTIONS = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "system", label: "System" },
  ];

  const ACCENT_OPTIONS = [
    {
      id: "cobalt",
      label: "Cobalt",
      colors: {
        base: "#2563eb",
        contrast: "#f8fafc",
        soft: "rgba(37, 99, 235, 0.14)",
        border: "rgba(37, 99, 235, 0.45)",
      },
    },
    {
      id: "violet",
      label: "Violet",
      colors: {
        base: "#8b5cf6",
        contrast: "#faf5ff",
        soft: "rgba(139, 92, 246, 0.16)",
        border: "rgba(139, 92, 246, 0.45)",
      },
    },
    {
      id: "emerald",
      label: "Emerald",
      colors: {
        base: "#059669",
        contrast: "#ecfdf5",
        soft: "rgba(5, 150, 105, 0.14)",
        border: "rgba(5, 150, 105, 0.45)",
      },
    },
    {
      id: "amber",
      label: "Amber",
      colors: {
        base: "#d97706",
        contrast: "#fffbeb",
        soft: "rgba(217, 119, 6, 0.18)",
        border: "rgba(217, 119, 6, 0.5)",
      },
    },
    {
      id: "rose",
      label: "Rose",
      colors: {
        base: "#e11d48",
        contrast: "#fff1f2",
        soft: "rgba(225, 29, 72, 0.16)",
        border: "rgba(225, 29, 72, 0.45)",
      },
    },
    {
      id: "slate",
      label: "Slate",
      colors: {
        base: "#475569",
        contrast: "#f8fafc",
        soft: "rgba(71, 85, 105, 0.18)",
        border: "rgba(71, 85, 105, 0.5)",
      },
    },
    {
      id: "sky",
      label: "Sky",
      colors: {
        base: "#0284c7",
        contrast: "#e0f2fe",
        soft: "rgba(2, 132, 199, 0.16)",
        border: "rgba(2, 132, 199, 0.45)",
      },
    },
    {
      id: "blush",
      label: "Blush",
      colors: {
        base: "#ec4899",
        contrast: "#fff0f6",
        soft: "rgba(236, 72, 153, 0.18)",
        border: "rgba(236, 72, 153, 0.5)",
      },
    },
    {
      id: "moss",
      label: "Moss",
      colors: {
        base: "#4d7c0f",
        contrast: "#ecfccb",
        soft: "rgba(77, 124, 15, 0.18)",
        border: "rgba(77, 124, 15, 0.5)",
      },
    },
    {
      id: "bronze",
      label: "Bronze",
      colors: {
        base: "#b45309",
        contrast: "#fff7ed",
        soft: "rgba(180, 83, 9, 0.2)",
        border: "rgba(180, 83, 9, 0.55)",
      },
    },
    {
      id: "orchid",
      label: "Orchid",
      colors: {
        base: "#c026d3",
        contrast: "#fdf4ff",
        soft: "rgba(192, 38, 211, 0.18)",
        border: "rgba(192, 38, 211, 0.5)",
      },
    },
    {
      id: "mint",
      label: "Mint",
      colors: {
        base: "#14b8a6",
        contrast: "#e0fefa",
        soft: "rgba(20, 184, 166, 0.16)",
        border: "rgba(20, 184, 166, 0.46)",
      },
    },
    {
      id: "graphite",
      label: "Graphite",
      colors: {
        base: "#1f2937",
        contrast: "#f8fafc",
        soft: "rgba(31, 41, 55, 0.22)",
        border: "rgba(31, 41, 55, 0.6)",
      },
    },
    {
      id: "sunset",
      label: "Sunset",
      colors: {
        base: "#ea580c",
        contrast: "#fff7ed",
        soft: "rgba(234, 88, 12, 0.18)",
        border: "rgba(234, 88, 12, 0.52)",
      },
    },
    {
      id: "glacier",
      label: "Glacier",
      colors: {
        base: "#0ea5e9",
        contrast: "#f0f9ff",
        soft: "rgba(14, 165, 233, 0.16)",
        border: "rgba(14, 165, 233, 0.45)",
      },
    },
    {
      id: "amethyst",
      label: "Amethyst",
      colors: {
        base: "#6d28d9",
        contrast: "#f5f3ff",
        soft: "rgba(109, 40, 217, 0.18)",
        border: "rgba(109, 40, 217, 0.5)",
      },
    },
    {
      id: "sand",
      label: "Sand",
      colors: {
        base: "#ca8a04",
        contrast: "#fffbeb",
        soft: "rgba(202, 138, 4, 0.2)",
        border: "rgba(202, 138, 4, 0.5)",
      },
    },
    {
      id: "cranberry",
      label: "Cranberry",
      colors: {
        base: "#be123c",
        contrast: "#fff1f5",
        soft: "rgba(190, 18, 60, 0.18)",
        border: "rgba(190, 18, 60, 0.5)",
      },
    },
  ];

  const GRADIENT_OPTIONS = [
    {
      id: "aurora",
      label: "Aurora",
      gradients: {
        light: "linear-gradient(135deg, #d8b4fe 0%, #6366f1 50%, #22d3ee 100%)",
        dark: "linear-gradient(135deg, #312e81 0%, #1e3a8a 50%, #0f172a 100%)",
      },
      accent: "violet",
    },
    {
      id: "sunrise",
      label: "Sunrise",
      gradients: {
        light: "linear-gradient(135deg, #fef3c7 0%, #fdba74 50%, #f97316 100%)",
        dark: "linear-gradient(135deg, #7c2d12 0%, #c2410c 45%, #ea580c 100%)",
      },
      accent: "amber",
    },
    {
      id: "forest",
      label: "Forest",
      gradients: {
        light: "linear-gradient(135deg, #bbf7d0 0%, #34d399 50%, #0f766e 100%)",
        dark: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #0f172a 100%)",
      },
      accent: "emerald",
    },
    {
      id: "ocean",
      label: "Ocean",
      gradients: {
        light: "linear-gradient(135deg, #bae6fd 0%, #38bdf8 50%, #0ea5e9 100%)",
        dark: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #082f49 100%)",
      },
      accent: "sky",
    },
    {
      id: "twilight",
      label: "Twilight",
      gradients: {
        light: "linear-gradient(135deg, #fecdd3 0%, #fda4af 50%, #fb7185 100%)",
        dark: "linear-gradient(135deg, #7f1d1d 0%, #be123c 50%, #9f1239 100%)",
      },
      accent: "orchid",
    },
    {
      id: "slate",
      label: "Slate",
      gradients: {
        light: "linear-gradient(135deg, #e2e8f0 0%, #cbd5f5 50%, #94a3b8 100%)",
        dark: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)",
      },
      accent: "slate",
    },
    {
      id: "blossom",
      label: "Blossom",
      gradients: {
        light: "linear-gradient(135deg, #ffe4e6 0%, #fbcfe8 45%, #f472b6 100%)",
        dark: "linear-gradient(135deg, #831843 0%, #9d174d 50%, #701a75 100%)",
      },
      accent: "blush",
    },
    {
      id: "lagoon",
      label: "Lagoon",
      gradients: {
        light: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 40%, #5eead4 100%)",
        dark: "linear-gradient(135deg, #022c22 0%, #0d9488 45%, #14b8a6 100%)",
      },
      accent: "mint",
    },
    {
      id: "ember",
      label: "Ember",
      gradients: {
        light: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 40%, #fb7185 100%)",
        dark: "linear-gradient(135deg, #450a0a 0%, #9f1239 50%, #be123c 100%)",
      },
      accent: "rose",
    },
    {
      id: "lilac",
      label: "Lilac",
      gradients: {
        light: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 45%, #d8b4fe 100%)",
        dark: "linear-gradient(135deg, #312e81 0%, #5b21b6 50%, #7c3aed 100%)",
      },
      accent: "violet",
    },
    {
      id: "zenith",
      label: "Zenith",
      gradients: {
        light: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 45%, #818cf8 100%)",
        dark: "linear-gradient(135deg, #1e293b 0%, #1f3b8a 45%, #3730a3 100%)",
      },
      accent: "cobalt",
    },
    {
      id: "sage",
      label: "Sage",
      gradients: {
        light: "linear-gradient(135deg, #ecfccb 0%, #bbf7d0 45%, #84cc16 100%)",
        dark: "linear-gradient(135deg, #052e16 0%, #166534 45%, #15803d 100%)",
      },
      accent: "moss",
    },
    {
      id: "velvet",
      label: "Velvet",
      gradients: {
        light: "linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 45%, #f0abfc 100%)",
        dark: "linear-gradient(135deg, #4a044e 0%, #6b21a8 45%, #86198f 100%)",
      },
      accent: "orchid",
    },
    {
      id: "citrus",
      label: "Citrus",
      gradients: {
        light: "linear-gradient(135deg, #fefce8 0%, #fef08a 45%, #facc15 100%)",
        dark: "linear-gradient(135deg, #422006 0%, #854d0e 50%, #b45309 100%)",
      },
      accent: "amber",
    },
    {
      id: "glacier",
      label: "Glacier",
      gradients: {
        light: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #bae6fd 100%)",
        dark: "linear-gradient(135deg, #082f49 0%, #0c4a6e 45%, #0284c7 100%)",
      },
      accent: "sky",
    },
    {
      id: "terracotta",
      label: "Terracotta",
      gradients: {
        light: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 45%, #f97316 100%)",
        dark: "linear-gradient(135deg, #431407 0%, #7c2d12 45%, #9a3412 100%)",
      },
      accent: "bronze",
    },
    {
      id: "nocturne",
      label: "Nocturne",
      gradients: {
        light: "linear-gradient(135deg, #ede9fe 0%, #c7d2fe 45%, #4338ca 100%)",
        dark: "linear-gradient(135deg, #020617 0%, #111827 45%, #312e81 100%)",
      },
      accent: "slate",
    },
    {
      id: "horizon",
      label: "Horizon",
      gradients: {
        light: "linear-gradient(135deg, #fef3c7 0%, #fdba74 40%, #60a5fa 100%)",
        dark: "linear-gradient(135deg, #451a03 0%, #9a3412 45%, #1d4ed8 100%)",
      },
      accent: "cobalt",
    },
  ];

  const DEFAULT_GRADIENT = GRADIENT_OPTIONS[0];
  const DEFAULT_ACCENT_ID =
    DEFAULT_GRADIENT?.accent && ACCENT_OPTIONS.some((option) => option.id === DEFAULT_GRADIENT.accent)
      ? DEFAULT_GRADIENT.accent
      : ACCENT_OPTIONS[0].id;

  const DEFAULT_SETTINGS = {
    theme: "system",
    accent: DEFAULT_ACCENT_ID,
    background: {
      mode: "gradient",
      gradientId: DEFAULT_GRADIENT?.id ?? GRADIENT_OPTIONS[0].id,
    },
    titleBackdrop: false,
    mergeAllBookmarks: true,
    folderColumnWidth: 1170,
    compactFolderHeader: true,
    enableBookmarkSearch: false,
    enableTopSites: false,
  };

  const DEFAULT_SYNC_PREFERENCES = {
    ...DEFAULT_SETTINGS,
    folderSelection: { ...DEFAULT_FOLDER_SELECTION },
    version: STORAGE_VERSION,
  };

  const GRADIENT_PREVIEW_COUNT = 6;
  const ACCENT_PREVIEW_COUNT = 10;

  const realChrome = typeof chrome !== "undefined" ? chrome : null;
  const chromeApi = realChrome?.runtime?.sendMessage ? realChrome : createMockChrome();
  const isExtensionContext = Boolean(realChrome?.runtime?.id);
  const shouldPersistPreferences = Boolean(realChrome?.storage?.local) && isExtensionContext;
  const shouldSyncPreferences = Boolean(realChrome?.storage?.sync) && isExtensionContext;

  let statusMessage = STATUS_MESSAGES.loading;
  let statusTone = "info";
  let bookmarks = [];
  let folderBookmarkGroups = [];
  let bookmarkIdSet = new Set();
  let defaultFolderId = null;
  let selectedFolderIds = new Set();
  let expandedFolderIds = new Set();
  let loadingFolderIds = new Set();
  let hasHydratedSelection = false;
  let folderModalOpen = false;
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
  let backgroundDialog;
  let backgroundInput;
  let settingsButton;
  let settingsDrawer;
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

  // Drag and drop
  let draggedBookmark = null;
  let dragOverBookmark = null;
  let dragSourceFolderId = null;

  let persistSettingsHandle = null;
  let mediaQuery = null;
  let removeSystemThemeListener = null;


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
        // Handle context menu close
        if (contextMenuVisible && event.key === "Escape") {
          closeContextMenu();
          event.stopPropagation();
          return;
        }
        if (event.key === "Escape") {
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
          }
        }
        // Global keyboard shortcut for search
        if (event.key === "/" && settings.enableBookmarkSearch && !event.ctrlKey && !event.metaKey) {
          const target = event.target;
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            return;
          }
          event.preventDefault();
          bookmarkSearchVisible = true;
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
      if (typeof document !== "undefined") {
        document.body.classList.remove("settings-open");
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

  function arraysEqual(a = [], b = []) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  }

  function normalizeFolderSelection(selection = {}) {
    const selected = Array.isArray(selection.selectedIds) ? selection.selectedIds.filter(Boolean) : [];
    const expanded = Array.isArray(selection.expandedIds) ? selection.expandedIds.filter(Boolean) : [];
    return {
      selectedIds: Array.from(new Set(selected)),
      expandedIds: Array.from(new Set(expanded)),
    };
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
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
      folderColumnWidth !== stored.folderColumnWidth ||
      compactFolderHeader !== stored.compactFolderHeader ||
      enableBookmarkSearch !== stored.enableBookmarkSearch ||
      enableTopSites !== stored.enableTopSites;

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
      if (!removeSystemThemeListener) {
        const handler = (event) => {
          document.body.classList.toggle("dark", event.matches);
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
      background: { ...settings.background },
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
    if (typeof document !== "undefined" && settingsDrawer) {
      const activeElement = document.activeElement;
      if (activeElement && settingsDrawer.contains(activeElement)) {
        settingsButton?.focus();
      }
    }
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
    openBackgroundDialog();
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

  $: if (settingsOpen) {
    tick().then(() => {
      settingsDrawer?.focus();
    });
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

  async function computeSelectionPreview(selectionSet) {
    const working = selectionSet instanceof Set ? new Set(selectionSet) : new Set(selectionSet ?? []);
    if (!working.size) {
      return { items: [], counts: new Map(), total: 0, groups: [] };
    }
    await Promise.all(Array.from(working).map((id) => loadCacheSubtree(chromeApi, id)));
    const state = getBookmarkCacheState();
    const seenUrls = new Map();
    const folderUrlSets = new Map();
    const aggregated = [];
    const folderGroups = [];
    working.forEach((folderId) => {
      const allBookmarkNodes = gatherBookmarksForFolder(state, folderId, [], true);
      const directBookmarkNodes = gatherBookmarksForFolder(state, folderId, [], false);
      const path = getFolderPath(folderId);
      const label = path[path.length - 1] || "Untitled folder";
      allBookmarkNodes.forEach((node) => {
        const normalized = normalizeUrl(node.url) || node.url;
        const key = (normalized || node.url || node.id).toLowerCase();
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
        const folderSet = folderUrlSets.get(folderId) ?? new Set();
        folderSet.add(key);
        folderUrlSets.set(folderId, folderSet);
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
      setStatus("Select folders to populate this page.", "info");
      return;
    }
    try {
      const preview = await computeSelectionPreview(selectedFolderIds);
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
      if (preview.items.length === 0) {
        setStatus(STATUS_MESSAGES.empty);
      } else {
        setStatus("", "info");
      }
    } catch (error) {
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

  function updateBookmarkState(list) {
    bookmarkIdSet = new Set(list.map((bookmark) => bookmark.id));
    bookmarks = list.map((bookmark) => formatBookmarkForDisplay(bookmark));
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
    const state = getBookmarkCacheState();
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

  function updateFolderSummary() {
    folderSummary = buildFolderSummary(selectedFolderIds, folderBookmarkCounts);
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
    const state = getBookmarkCacheState();
    matchIds.forEach((id) => {
      let current = state.nodesById[id];
      while (current) {
        visible.add(current.id);
        if (!current.parentId) {
          break;
        }
        current = state.nodesById[current.parentId];
      }
      const node = state.nodesById[id];
      node?.childrenIds?.forEach((childId) => {
        const childNode = state.nodesById[childId];
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
      nextSettings.enableTopSites !== settings.enableTopSites;
    if (settingsChanged) {
      settings = {
        ...settings,
        ...nextSettings,
        background: { ...nextSettings.background },
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
    // Use Chrome's native Favicon API and convert to data URI for <img> tag compatibility
    try {
      const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
      faviconUrl.searchParams.set("pageUrl", url);
      faviconUrl.searchParams.set("size", FAVICON_SIZE.toString());
      
      const response = await fetch(faviconUrl.toString());
      if (!response.ok) {
        return '';
      }
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
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
    toasts = [...toasts, toast];
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

  // Keyboard navigation functions
  function handleGridKeydown(event) {
    const displayedBookmarks = settings.mergeAllBookmarks
      ? (settings.enableTopSites ? [...filteredBookmarks, ...topSites] : filteredBookmarks)
      : [];
    if (!displayedBookmarks.length) return;

    const columns = getGridColumns();
    const total = displayedBookmarks.length;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusedBookmarkIndex = Math.min(focusedBookmarkIndex + 1, total - 1);
      if (focusedBookmarkIndex < 0) focusedBookmarkIndex = 0;
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusedBookmarkIndex = Math.max(focusedBookmarkIndex - 1, 0);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const newIndex = focusedBookmarkIndex + columns;
      focusedBookmarkIndex = newIndex < total ? newIndex : focusedBookmarkIndex;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const newIndex = focusedBookmarkIndex - columns;
      focusedBookmarkIndex = newIndex >= 0 ? newIndex : focusedBookmarkIndex;
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
        removeBookmark(bookmark.id);
      }
    } else if (event.key === "/" && settings.enableBookmarkSearch) {
      event.preventDefault();
      bookmarkSearchVisible = true;
    } else if (event.key === "Escape") {
      focusedBookmarkIndex = -1;
      closeContextMenu();
    }
  }

  function getGridColumns() {
    if (!gridRef) return 4;
    const style = getComputedStyle(gridRef);
    const columns = style.getPropertyValue("grid-template-columns");
    return columns.split(" ").length || 4;
  }

  function handleTileFocus(index) {
    focusedBookmarkIndex = index;
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
    const folderId = await requestFolderForShortcut(targetFolderId);
    if (!folderId) {
      return;
    }
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
      console.error("Bookmark Dial: failed to create bookmark", error);
      alert("Unable to add shortcut. Please try again.");
    }
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

  async function requestFolderForShortcut(targetFolderId = null) {
    if (targetFolderId) {
      return targetFolderId;
    }
    const options = getShortcutFolderOptions();
    if (!options.length) {
      alert("No folders are available for new shortcuts right now.");
      return null;
    }
    if (options.length === 1) {
      return options[0].id;
    }
    return promptForFolderChoice(options);
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
    const normalizedUrl = normalizeUrl(urlPrompt.trim());
    if (!normalizedUrl) {
      alert("That does not appear to be a valid URL.");
      return;
    }

    const defaultTitle = bookmark.title?.trim()
      ? bookmark.title
      : bookmark.displayTitle || tryExtractHostname(normalizedUrl);
    const titlePrompt = prompt("Update the shortcut title:", defaultTitle);
    const title = titlePrompt ? titlePrompt.trim() : defaultTitle;

    try {
      await chromeApi.bookmarks.update(bookmark.id, {
        title,
        url: normalizedUrl,
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
            parentId: fullBookmark.parentId,
            title: fullBookmark.title,
            url: fullBookmark.url,
            index: fullBookmark.index,
          },
        },
        8000
      );
    } catch (error) {
      console.error("Bookmark Dial: failed to remove bookmark", error);
      addToast("Failed to remove bookmark", "error");
    }
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
      if (shouldPersistPreferences) {
        await chromeApi.storage.local.set({ [BACKGROUND_KEY]: dataUrl });
      }
      applyBackgroundImage(dataUrl);
      settings = {
        ...settings,
        background: {
          ...settings.background,
          mode: "custom",
        },
      };
      backgroundDialog?.close();
    } catch (error) {
      console.error("Bookmark Dial: failed to save background", error);
      alert("Unable to store the background image. Try a smaller file.");
    }
  }

  async function clearBackground() {
    try {
      if (shouldPersistPreferences) {
        await chromeApi.storage.local.remove(BACKGROUND_KEY);
      }
    } catch (error) {
      console.error("Bookmark Dial: failed to clear background", error);
    }
    applyBackgroundImage(null);
    settings = {
      ...settings,
      background: {
        ...settings.background,
        mode: "gradient",
      },
    };
    backgroundDialog?.close();
  }

  function cancelBackground() {
    backgroundDialog?.close();
  }

  async function loadBackground() {
    if (!shouldPersistPreferences) {
      applyBackgroundImage(null);
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
      const stored = await chromeApi.storage.local.get(BACKGROUND_KEY);
      const dataUrl = stored?.[BACKGROUND_KEY] || "";
      applyBackgroundImage(dataUrl);
      if (!dataUrl && settings.background.mode === "custom") {
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

  function applyBackgroundImage(dataUrl) {
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

  <aside
    id="settings-drawer"
    class="settings-drawer"
    data-open={settingsOpen}
    aria-hidden={!settingsOpen}
    tabindex="-1"
    bind:this={settingsDrawer}
    on:click|stopPropagation
  >
    <header class="settings-drawer__header">
      <h2>Settings</h2>
      <button
        type="button"
        class="settings-drawer__close"
        aria-label="Close settings"
        on:click={closeSettings}
      >
        &times;
      </button>
    </header>

    <section class="settings-group">
      <h3>Theme</h3>
      <div class="choice-row">
        {#each THEME_OPTIONS as option}
          <button
            type="button"
            class="choice-button"
            data-active={settings.theme === option.id}
            on:click={() => setThemeChoice(option.id)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    </section>

    <section class="settings-group">
      <h3>Accent color</h3>
      <div class="accent-grid">
        {#each visibleAccentOptions as option}
          <button
            type="button"
            class="accent-swatch"
            style={`--swatch-color: ${option.colors.base};`}
            data-active={settings.accent === option.id}
            aria-label={option.label}
            title={option.label}
            on:click={() => setAccentChoice(option.id)}
          ></button>
        {/each}
      </div>
      {#if ACCENT_OPTIONS.length > ACCENT_PREVIEW_COUNT}
        <div class="swatch-toggle-row">
          <button
            type="button"
            class="swatch-toggle-button"
            aria-expanded={showAllAccents}
            on:click={toggleAccentOptions}
          >
            {showAllAccents ? "Show fewer accent colors" : "More accent colors"}
          </button>
        </div>
      {/if}
    </section>

    <section class="settings-group">
      <h3>Tile titles</h3>
      <label
        class="settings-toggle"
        title="Adds a soft highlight behind each title for contrast."
      >
        <input
          type="checkbox"
          checked={settings.titleBackdrop}
          on:change={(event) => setTitleBackdrop(event.currentTarget.checked)}
        />
        <div class="settings-toggle__body">
          <span class="settings-toggle__label">Rounded backdrop</span>
        </div>
      </label>
    </section>

    <section class="settings-group">
      <h3>Gradient background</h3>
      <div class="gradient-grid">
        {#each visibleGradientOptions as option}
          <button
            type="button"
            class="gradient-option"
            style={`--gradient-sample-light: ${option.gradients.light}; --gradient-sample-dark: ${option.gradients.dark};`}
            data-active={settings.background.mode === "gradient" && settings.background.gradientId === option.id}
            on:click={() => selectGradient(option.id)}
          >
            <span>{option.label}</span>
          </button>
        {/each}
      </div>
      {#if GRADIENT_OPTIONS.length > GRADIENT_PREVIEW_COUNT}
        <div class="swatch-toggle-row">
          <button
            type="button"
            class="swatch-toggle-button"
            aria-expanded={showAllGradients}
            on:click={toggleGradientOptions}
          >
            {showAllGradients ? "Show fewer gradients" : "More gradients"}
          </button>
        </div>
      {/if}
    </section>

    <section class="settings-group">
      <button type="button" class="custom-background-button" on:click={showCustomBackgroundPicker}>
        Custom background…
      </button>
    </section>

    <section class="settings-group settings-group--folders">
      <h3>Folders</h3>
      <div class="folder-bar">
        <div class="folder-bar__summary">
          {#if folderSummary.length === 0}
            <span class="folder-chip folder-chip--empty" title="Default Bookmark Dial folder">
              Default folder
            </span>
          {:else}
            {#each folderSummary as item (item.id)}
              <span class="folder-chip" title={item.fullPath}>
                <span class="folder-chip__label">{item.label}</span>
                <span class="folder-chip__count">{item.count}</span>
              </span>
            {/each}
          {/if}
        </div>
        <button type="button" class="ghost-button folder-bar__action" on:click={openFolderModal}>
          Manage folders
        </button>
      </div>
      <label class="settings-toggle folder-group-toggle">
        <input
          type="checkbox"
          checked={settings.mergeAllBookmarks}
          on:change={(event) => setMergeAllBookmarks(event.currentTarget.checked)}
        />
        <div class="settings-toggle__body">
          <span class="settings-toggle__label">Merge bookmarks from all folders</span>
          <span class="settings-toggle__description">
            Display all bookmarks in a single deduplicated grid.
          </span>
        </div>
      </label>

      {#if !settings.mergeAllBookmarks}
        <div class="ungrouped-settings">
          <label class="settings-control">
            <span class="settings-control__label">Folder width</span>
            <input
              type="range"
              min="480"
              max="1860"
              step="20"
              value={settings.folderColumnWidth}
              on:input={(e) => setFolderColumnWidth(e.currentTarget.value)}
            />
          </label>

          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={settings.compactFolderHeader}
              on:change={(e) => setCompactFolderHeader(e.currentTarget.checked)}
            />
            <div class="settings-toggle__body">
              <span class="settings-toggle__label">Compact header</span>
              <span class="settings-toggle__description">
                Hide folder path to save space.
              </span>
            </div>
          </label>
        </div>
      {/if}
    </section>

    <section class="settings-group">
      <h3>Experimental</h3>
      <label class="settings-toggle">
        <input
          type="checkbox"
          checked={settings.enableBookmarkSearch}
          on:change={(e) => setEnableBookmarkSearch(e.currentTarget.checked)}
        />
        <div class="settings-toggle__body">
          <span class="settings-toggle__label">Bookmark search</span>
          <span class="settings-toggle__description">
            Press <kbd>/</kbd> to search bookmarks.
          </span>
        </div>
      </label>
      <label class="settings-toggle">
        <input
          type="checkbox"
          checked={settings.enableTopSites}
          on:change={(e) => setEnableTopSites(e.currentTarget.checked)}
        />
        <div class="settings-toggle__body">
          <span class="settings-toggle__label">Show frequently visited</span>
          <span class="settings-toggle__description">
            Include your most visited sites alongside bookmarks.
          </span>
        </div>
      </label>
    </section>
  </aside>

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

    <section id="status" role="status" aria-live="polite" data-tone={statusMessage ? statusTone : null}>
      {statusMessage}
    </section>

    {#if settings.mergeAllBookmarks}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div
        id="dial-grid"
        class="grid"
        aria-label="Bookmark Dial links"
        bind:this={gridRef}
        on:keydown={handleGridKeydown}
        tabindex="0"
        role="group"
      >
        {#each filteredBookmarks as bookmark, index (bookmark.id)}
          <BookmarkTile
            {bookmark}
            titleBackdrop={settings.titleBackdrop}
            menuOpen={openMenuId === bookmark.id}
            focused={focusedBookmarkIndex === index}
            dragging={draggedBookmark?.id === bookmark.id}
            dragOver={dragOverBookmark?.id === bookmark.id}
            onToggleMenu={() => toggleTileMenu(bookmark.id)}
            onEdit={() => editBookmark(bookmark)}
            onRemove={() => removeBookmark(bookmark.id)}
            onFallback={() => showFallback(bookmark.id)}
            onContextMenu={(e) => showContextMenu(e, bookmark)}
            onFocus={() => handleTileFocus(index)}
            onDragStart={(e) => handleDragStart(e, bookmark)}
            onDragOver={(e) => handleDragOver(e, bookmark)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, bookmark)}
            onDragEnd={handleDragEnd}
            getFaviconUrl={getFaviconUrl}
          />
        {/each}
        {#if settings.enableTopSites && topSites.length > 0}
          {#each topSites as site, siteIndex (site.id)}
            <BookmarkTile
              bookmark={site}
              titleBackdrop={settings.titleBackdrop}
              menuOpen={false}
              focused={focusedBookmarkIndex === filteredBookmarks.length + siteIndex}
              dragging={false}
              dragOver={false}
              onToggleMenu={() => {}}
              onEdit={() => {}}
              onRemove={() => {}}
              onFallback={() => {}}
              onContextMenu={() => {}}
              onFocus={() => handleTileFocus(filteredBookmarks.length + siteIndex)}
              onDragStart={() => {}}
              onDragOver={() => {}}
              onDragLeave={() => {}}
              onDrop={() => {}}
              onDragEnd={() => {}}
              getFaviconUrl={getFaviconUrl}
              isTopSite={true}
            />
          {/each}
        {/if}
        <article class="tile add-tile" draggable="false">
          <button class="add-button" type="button" on:click={handleAddBookmark} aria-label="Add new bookmark shortcut">
            <span aria-hidden="true">+</span>
            <div>Add shortcut</div>
          </button>
        </article>
      </div>
    {:else}
      <div class="folder-grid-list" aria-label="Bookmark folders" style:max-width="{settings.folderColumnWidth}px">
        {#each filteredFolderGroups as group (group.id)}
          <section class="folder-section">
            <header class="folder-section__header">
              <div class="folder-section__titles">
                {#if settings.compactFolderHeader}
                  <h4 class="folder-section__title" title={group.fullPath}>{group.label}</h4>
                {:else}
                  <h4 class="folder-section__title">{group.label}</h4>
                  {#if group.fullPath && group.fullPath !== group.label}
                    <p class="folder-section__path">{group.fullPath}</p>
                  {/if}
                {/if}
              </div>
            </header>
            {#if group.items.length}
              <div
                class="grid folder-section__grid"
                role="group"
                aria-label={`Shortcuts in ${group.fullPath || group.label}`}
              >
                {#each group.items as bookmark (bookmark.id)}
                  <BookmarkTile
                    {bookmark}
                    titleBackdrop={settings.titleBackdrop}
                    menuOpen={openMenuId === bookmark.id}
                    focused={false}
                    dragging={draggedBookmark?.id === bookmark.id}
                    dragOver={dragOverBookmark?.id === bookmark.id}
                    onToggleMenu={() => toggleTileMenu(bookmark.id)}
                    onEdit={() => editBookmark(bookmark)}
                    onRemove={() => removeBookmark(bookmark.id)}
                    onFallback={() => showFallback(bookmark.id)}
                    onContextMenu={(e) => showContextMenu(e, bookmark)}
                    onFocus={() => {}}
                    onDragStart={(e) => handleDragStart(e, bookmark, group.id)}
                    onDragOver={(e) => handleDragOver(e, bookmark)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, bookmark)}
                    onDragEnd={handleDragEnd}
                    getFaviconUrl={getFaviconUrl}
                  />
                {/each}
                <article class="tile add-tile" draggable="false">
                  <button class="add-button" type="button" on:click={() => handleAddBookmark(group.id)}>
                    <span aria-hidden="true">+</span>
                    <div>Add shortcut</div>
                  </button>
                </article>
              </div>
            {:else}
              <div
                class="grid folder-section__grid"
                role="group"
                aria-label={`Shortcuts in ${group.fullPath || group.label}`}
              >
                <article class="tile add-tile" draggable="false">
                  <button class="add-button" type="button" on:click={() => handleAddBookmark(group.id)}>
                    <span aria-hidden="true">+</span>
                    <div>Add shortcut</div>
                  </button>
                </article>
              </div>
            {/if}
          </section>
        {/each}
      </div>
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
