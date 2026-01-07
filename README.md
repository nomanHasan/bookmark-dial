# Bookmark Dial

A modern Chrome extension that replaces your new tab page with a beautiful, customizable bookmark dial. Built with **Svelte 4** and **Vite**, this extension syncs seamlessly with your Chrome bookmarks and offers extensive theming options.

## Features

### Bookmark Management

- **Folder Selection**: Choose one or more bookmark folders to display on your new tab page
- **Nested Folder Support**: Automatically includes all bookmarks from selected folders and their subfolders
- **Live Sync**: Real-time updates when bookmarks are added, edited, moved, or removed
- **Deduplication**: When merging multiple folders, duplicate URLs are automatically filtered out
- **Quick Add**: Add new shortcuts directly from the new tab page with a simple prompt interface
- **Edit & Remove**: Context menu and tile menu for editing or removing bookmarks
- **Drag-and-Drop Reordering**: Drag bookmarks to reorder them within your dial
- **Right-Click Context Menu**: Quick access to Open in new tab, Copy URL, Edit, and Remove actions
- **Undo Support**: Toast notifications with undo button when removing bookmarks

### Display Modes

- **Merged View**: Combine all bookmarks from selected folders into a single, deduplicated grid
- **Folder Groups**: Display bookmarks organized by their parent folders with customizable column widths
- **Compact Headers**: Toggle between full folder paths and compact folder names in grouped view

### Keyboard Navigation

- **Arrow Keys**: Navigate between bookmark tiles using ←↑↓→
- **Enter**: Open the focused bookmark
- **Delete/Backspace**: Remove the focused bookmark
- **Forward Slash**: Quick access to bookmark search (when enabled)
- **Escape**: Close search, modals, or context menus

### Theming & Customization

- **Theme Modes**: Choose between Dark, Light, or System (auto-detect) themes
- **Accent Colors**: 18 vibrant accent color options including Cobalt, Violet, Emerald, Rose, and more
- **Gradient Backgrounds**: 18 beautiful gradient backgrounds (Aurora, Sunrise, Forest, Ocean, etc.) that adapt to light/dark modes
- **Custom Backgrounds**: Upload your own JPEG or PNG image (up to 4MB) for a personalized background
- **Title Backdrop**: Optional rounded backdrop behind bookmark titles for improved readability

### Visual Design

- **Dynamic Favicons**: High-resolution favicons fetched via Chrome's native Favicon API
- **Fallback Initials**: Colorful, algorithmically-generated gradient tiles when favicons aren't available
- **Responsive Grid**: Adaptive layout that works beautifully on any screen size
- **Smooth Animations**: Polished transitions throughout the interface
- **Glassmorphism UI**: Modern frosted glass effects on settings panel and overlays
- **Toast Notifications**: Non-intrusive notifications with action buttons

### Experimental Features

These features are disabled by default and can be enabled in Settings > Experimental:

- **Bookmark Search**: Filter bookmarks by title or URL with a search bar
- **Top Sites Integration**: Show your most visited sites alongside bookmarks (uses Chrome's Top Sites API)

### Data & Sync

- **Chrome Storage Sync**: Preferences sync across all your Chrome instances
- **Local Storage**: Custom background images stored locally on each device
- **Automatic Folder Creation**: A "Bookmark Dial" folder is automatically created if it doesn't exist
- **Folder Recovery**: Automatically recreates the default folder if accidentally deleted

### Accessibility

- **Keyboard Navigation**: Full keyboard support for navigating and managing bookmarks
- **Screen Reader Support**: Proper ARIA labels and roles throughout
- **Focus Management**: Clear focus indicators for keyboard users
- **Welcome Onboarding**: First-time users see a helpful welcome modal explaining features

## Installation

### Development Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd bookmark-dial
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   The development server runs on `http://localhost:5740` with mock Chrome APIs for testing outside the extension context.

4. **Build for production:**

   ```bash
   npm run build
   ```

   This outputs the extension to the `dist/` directory.

### Loading in Chrome

1. Build the extension with `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `dist/` folder
5. Open a new tab to see Bookmark Dial in action

## Development

### Mock Chrome APIs

When running outside of Chrome (via the dev server), the extension uses a comprehensive mock implementation of Chrome APIs. This includes:

- **Mock Bookmark Tree**: Pre-populated with sample bookmarks, folders, and nested structures
- **Mock Storage**: Simulated `chrome.storage.local` and `chrome.storage.sync`
- **Event Listeners**: Full support for bookmark and storage change events
- **CRUD Operations**: Create, read, update, and delete operations for bookmarks

The mock data includes:

- A "Bookmark Dial" folder with sample developer bookmarks
- A "Developer Tools" folder with 60+ popular development resources
- A "Reading List" folder with a 3-level deep hierarchy of literature resources
- An "Inspiration" folder with design resources

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with hot reload |
| `npm run build` | Build production extension to `dist/` |
| `npm run preview` | Preview the production build locally |

## Architecture Overview

### Project Structure

```
bookmark-dial/
├── index.html              # Extension entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite build configuration
├── svelte.config.js        # Svelte preprocessor config
├── public/
│   ├── manifest.json       # Chrome extension manifest (MV3)
│   ├── background.js       # Service worker for folder management
│   └── icons/              # Extension icons (cog, pencil SVGs)
└── src/
    ├── main.js             # Svelte app entry point
    ├── App.svelte          # Main application component
    ├── app.scss            # Global styles
    ├── components/
    │   ├── BookmarkTile.svelte        # Individual bookmark tile with drag-drop
    │   ├── ContextMenu.svelte         # Right-click context menu
    │   ├── FolderNode.svelte          # Recursive folder tree node
    │   ├── FolderSelectionModal.svelte # Folder picker modal
    │   ├── SearchBar.svelte           # Bookmark search input
    │   ├── ToastNotification.svelte   # Toast notification system
    │   └── WelcomeModal.svelte        # First-time user onboarding
    ├── data/
    │   ├── mock.js         # Developer tools mock data
    │   └── literature.js   # Literature links mock data
    └── lib/
        └── bookmarkCache.js # Svelte store for bookmark tree caching
```

### Key Components

#### Background Service Worker (`public/background.js`)

- Ensures the "Bookmark Dial" folder exists in Chrome bookmarks
- Handles folder creation, lookup, and recovery
- Seeds default preferences on installation/startup
- Responds to messages from the main UI for folder operations

#### Bookmark Cache (`src/lib/bookmarkCache.js`)

A Svelte store that manages a normalized, client-side cache of the bookmark tree:

- **Lazy Loading**: Children are loaded on-demand when folders are expanded
- **Normalized Storage**: Bookmarks stored by ID for O(1) lookups
- **Real-time Updates**: Methods to apply CRUD operations without full reloads
- **Search Index**: Builds a searchable index of all folders for the folder picker

#### Main Application (`src/App.svelte`)

The core UI component handling:

- **Settings Management**: Theme, accent, background, and display preferences
- **Folder Selection**: Multi-select folder picker with search and preview
- **Bookmark Display**: Grid rendering in merged or grouped modes
- **Chrome API Integration**: Bookmark events, storage sync, and favicon loading
- **Mock API Fallback**: Complete mock implementation for development

#### Folder Selection Modal (`src/components/FolderSelectionModal.svelte`)

A full-featured modal for selecting bookmark folders:

- **Tree Navigation**: Expandable/collapsible folder hierarchy
- **Multi-Select**: Checkbox-based selection with partial state indicators
- **Search**: Filter folders by name or path
- **Live Preview**: Shows selected folders and bookmark counts before confirming
- **Draft State**: Changes can be reviewed before applying

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **Svelte 4** | Reactive UI framework |
| **Vite 5** | Build tool and dev server |
| **SCSS** | Advanced styling with mixins and variables |
| **Chrome Extension Manifest V3** | Modern extension architecture |
| **Chrome Storage API** | Preference persistence and sync |
| **Chrome Bookmarks API** | Bookmark tree access and manipulation |

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Background    │────▶│  Bookmark Cache │────▶│    App.svelte   │
│  Service Worker │     │  (Svelte Store) │     │   (Main UI)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       ▲                       │
         │                       │                       ▼
         ▼                       │              ┌─────────────────┐
┌─────────────────┐              │              │   Components    │
│  Chrome Storage │              │              │ (Tiles, Modal)  │
│   (sync/local)  │──────────────┘              └─────────────────┘
└─────────────────┘
```

1. **Background Worker** ensures folder existence and seeds preferences
2. **Chrome Storage** persists user preferences across sessions/devices
3. **Bookmark Cache** maintains a reactive, normalized view of bookmarks
4. **App.svelte** orchestrates UI state, settings, and bookmark display
5. **Components** render individual tiles and the folder selection interface
