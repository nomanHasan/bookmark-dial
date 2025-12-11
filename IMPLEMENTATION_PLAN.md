# Implementation Plan - Drag and Drop Reordering

The user wants to move folders and items around. Currently, the extension displays bookmarks based on their order in the browser's bookmark manager, but does not support reordering directly within the "Bookmark Dial" UI.

This plan proposes implementing drag-and-drop functionality to allow users to reorder bookmarks and folders directly.

## User Review Required

> [!NOTE]
> This change will introduce a new dependency (e.g., `svelte-dnd-action` or native HTML5 Drag and Drop API) to handle the drag-and-drop interactions.

## Proposed Changes

### UI Components

#### [MODIFY] [src/App.svelte](file:///mnt/Working_Directory/Workspaces/Chrome_Extension_Workspace/bookmark-dial/src/App.svelte)
- Add drag-and-drop event handlers to the bookmark grid.
- Handle `on:consider` and `on:finalize` events (if using `svelte-dnd-action`) or native drag events.
- Update the local state `bookmarks` or `folderBookmarkGroups` during the drag operation.
- Call `chrome.bookmarks.move` (via `bookmarkCache` or directly) when the drop is finalized to persist the new order.

#### [MODIFY] [src/components/BookmarkTile.svelte](file:///mnt/Working_Directory/Workspaces/Chrome_Extension_Workspace/bookmark-dial/src/components/BookmarkTile.svelte)
- Make the tile draggable.
- Add visual cues (styling) when an item is being dragged.

### Data Layer

#### [MODIFY] [src/lib/bookmarkCache.js](file:///mnt/Working_Directory/Workspaces/Chrome_Extension_Workspace/bookmark-dial/src/lib/bookmarkCache.js)
- Ensure `applyMovedNode` correctly updates the cache and triggers UI updates.
- Expose a method to handle batch reordering if necessary.

## Verification Plan

### Manual Verification
- **Drag and Drop Test**:
    1. Open the extension (or `http://localhost:574`).
    2. Click and hold a bookmark tile.
    3. Drag it to a new position.
    4. Release the mouse.
    5. **Verify**: The bookmark stays in the new position.
    6. **Verify**: Reload the page. The bookmark should remain in the new position (persisted).
- **Folder Grouping Test**:
    1. Enable "Group all folders together" in settings.
    2. Reorder items.
    3. Disable "Group all folders together".
    4. **Verify**: The order is respected within the specific folder views (if applicable) or at least the global order is updated.
