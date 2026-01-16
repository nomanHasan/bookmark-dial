<script>
  /**
   * FolderGroupColumn - Single folder column with header and bookmark grid
   *
   * Renders a single folder section with its header and contained bookmarks.
   * Used in the grouped (non-merged) view mode.
   */

  import BookmarkTile from './BookmarkTile.svelte';

  /** @type {{id: string, label: string, path: string[], fullPath: string, items: Array<Object>}} */
  export let group;

  /** @type {boolean} */
  export let compactHeader = true;

  /** @type {boolean} */
  export let showTitle = true;

  /** @type {boolean} */
  export let titleBackdrop = false;

  /** @type {string|null} */
  export let openMenuId = null;

  /** @type {Object|null} */
  export let draggedBookmark = null;

  /** @type {Object|null} */
  export let dragOverBookmark = null;

  // Event handlers
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

<section class="folder-section">
  <header class="folder-section__header">
    <div class="folder-section__titles">
      {#if compactHeader}
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
          {showTitle}
          {titleBackdrop}
          menuOpen={openMenuId === bookmark.id}
          focused={false}
          dragging={draggedBookmark?.id === bookmark.id}
          dragOver={dragOverBookmark?.id === bookmark.id}
          onToggleMenu={() => onTileMenu(bookmark.id)}
          onEdit={() => onTileEdit(bookmark)}
          onRemove={() => onTileRemove(bookmark.id)}
          onFallback={() => onTileFallback(bookmark.id)}
          onContextMenu={(e) => onTileContextMenu(e, bookmark)}
          onFocus={() => {}}
          onDragStart={(e) => onDragStart(e, bookmark, group.id)}
          onDragOver={(e) => onDragOver(e, bookmark)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, bookmark)}
          onDragEnd={onDragEnd}
          {getFaviconUrl}
        />
      {/each}
      <article class="tile add-tile" draggable="false">
        <button class="add-button" type="button" on:click={() => onAddShortcut(group.id)}>
          <span aria-hidden="true">+</span>
          {#if showTitle}
            <div>Add shortcut</div>
          {/if}
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
        <button class="add-button" type="button" on:click={() => onAddShortcut(group.id)}>
          <span aria-hidden="true">+</span>
          {#if showTitle}
            <div>Add shortcut</div>
          {/if}
        </button>
      </article>
    </div>
  {/if}
</section>
