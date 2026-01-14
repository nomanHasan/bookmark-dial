<script>
  /**
   * FolderGroupList - Renders folder columns in grouped view mode
   *
   * Container component that renders multiple FolderGroupColumn components,
   * one for each selected folder. Used in the non-merged view mode.
   */

  import FolderGroupColumn from './FolderGroupColumn.svelte';

  /** @type {Array<{id: string, label: string, path: string[], fullPath: string, items: Array<Object>}>} */
  export let groups = [];

  /** @type {number} */
  export let columnWidth = 1170;

  /** @type {boolean} */
  export let compactHeader = true;

  /** @type {boolean} */
  export let titleBackdrop = false;

  /** @type {string|null} */
  export let openMenuId = null;

  /** @type {Object|null} */
  export let draggedBookmark = null;

  /** @type {Object|null} */
  export let dragOverBookmark = null;

  // Event handlers (passed through to FolderGroupColumn)
  /** @type {(bookmarkId: string) => void} */
  export let onTileMenu = () => {};

  /** @type {(bookmark: Object) => void} */
  export let onTileEdit = () => {};

  /** @type {(bookmarkId: string) => void} */
  export let onTileRemove = () => {};

  /** @type {(bookmarkId: string) => void} */
  export let onTileFallback = () => {};

  /** @type {(event: MouseEvent, bookmark: Object) => void} */
  export let onTileContextMenu = () => {};

  /** @type {(event: DragEvent, bookmark: Object, folderId: string) => void} */
  export let onDragStart = () => {};

  /** @type {(event: DragEvent, bookmark: Object) => void} */
  export let onDragOver = () => {};

  /** @type {(event: DragEvent) => void} */
  export let onDragLeave = () => {};

  /** @type {(event: DragEvent, bookmark: Object) => void} */
  export let onDrop = () => {};

  /** @type {() => void} */
  export let onDragEnd = () => {};

  /** @type {(folderId: string) => void} */
  export let onAddShortcut = () => {};

  /** @type {(url: string) => Promise<string>} */
  export let getFaviconUrl = async () => "";
</script>

<div class="folder-grid-list" aria-label="Bookmark folders" style:max-width="{columnWidth}px">
  {#each groups as group (group.id)}
    <FolderGroupColumn
      {group}
      {compactHeader}
      {titleBackdrop}
      {openMenuId}
      {draggedBookmark}
      {dragOverBookmark}
      {onTileMenu}
      {onTileEdit}
      {onTileRemove}
      {onTileFallback}
      {onTileContextMenu}
      {onDragStart}
      {onDragOver}
      {onDragLeave}
      {onDrop}
      {onDragEnd}
      {onAddShortcut}
      {getFaviconUrl}
    />
  {/each}
</div>
