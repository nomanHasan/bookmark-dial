/**
 * Bookmark Dial - Constants
 *
 * Centralized configuration constants for the application.
 */

export const STATUS_MESSAGES = {
  loading: "Loading Bookmark Dial…",
  empty: "No bookmarks yet. Add shortcuts from this page or the bookmark manager.",
  error: "Bookmark Dial folder is unavailable. Try reopening the tab or reinstalling the extension.",
};

export const FAVICON_SIZE = 64;
export const BACKGROUND_KEY = "customBackgroundImage";
export const SETTINGS_KEY = "uiPreferences";
export const SYNC_SETTINGS_KEY = "dialPreferences";
export const STORAGE_VERSION = 2;
export const WELCOME_KEY = "hasSeenWelcome";
export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;
export const MAX_TOASTS = 5;
export const INDEXEDDB_NAME = "BookmarkDialDB";
export const INDEXEDDB_STORE = "backgrounds";
export const INDEXEDDB_KEY = "customBackground";

export const DEFAULT_FOLDER_SELECTION = {
  selectedIds: [],
  expandedIds: [],
};

export const THEME_OPTIONS = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "system", label: "System" },
];

export const ACCENT_OPTIONS = [
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

export const GRADIENT_OPTIONS = [
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

export const DEFAULT_GRADIENT = GRADIENT_OPTIONS[0];

export const DEFAULT_ACCENT_ID =
  DEFAULT_GRADIENT?.accent && ACCENT_OPTIONS.some((option) => option.id === DEFAULT_GRADIENT.accent)
    ? DEFAULT_GRADIENT.accent
    : ACCENT_OPTIONS[0].id;

export const DEFAULT_SETTINGS = {
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
  lastShortcutFolderId: null,
};

export const DEFAULT_SYNC_PREFERENCES = {
  ...DEFAULT_SETTINGS,
  folderSelection: { ...DEFAULT_FOLDER_SELECTION },
  version: STORAGE_VERSION,
};

export const GRADIENT_PREVIEW_COUNT = 6;
export const ACCENT_PREVIEW_COUNT = 10;
