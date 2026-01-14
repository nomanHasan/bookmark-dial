<script>
  /**
   * BookmarkGrid - Grid container for merged bookmark view
   *
   * Renders the main grid of bookmark tiles in the merged view mode.
   * Includes support for keyboard navigation and drag-and-drop.
   */

  import { createEventDispatcher, onMount } from 'svelte';
  import BookmarkTile from './BookmarkTile.svelte';

  const dispatch = createEventDispatcher();

  /** @type {Array<Object>} */
  export let bookmarks = [];

  /** @type {Array<Object>} */
  export let topSites = [];

  /** @type {boolean} */
  export let showTopSites = false;

  /** @type {boolean} */
  export let titleBackdrop = false;

  /** @type {number} */
  export let focusedIndex = -1;

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

  /** @type {(index: number) => void} */
  export let onTileFocus = () => {};

  /** @type {(event: DragEvent, bookmark: Object) => void} */
  export let onDragStart = () => {};

  /** @type {(event: DragEvent, bookmark: Object) => void} */
  export let onDragOver = () => {};

  /** @type {(event: DragEvent) => void} */
  export let onDragLeave = () => {};

  /** @type {(event: DragEvent, bookmark: Object) => void} */
  export let onDrop = () => {};

  /** @type {() => void} */
  export let onDragEnd = () => {};

  /** @type {() => void} */
  export let onAddShortcut = () => {};

  /** @type {(url: string) => Promise<string>} */
  export let getFaviconUrl = async () => "";

  let gridRef = null;

  // Expose the grid ref to parent for ResizeObserver
  onMount(() => {
    dispatch('gridmount', { gridRef });
  });

  // Re-dispatch when gridRef changes
  $: if (gridRef) {
    dispatch('gridmount', { gridRef });
  }
</script>

<div
  id="dial-grid"
  class="grid"
  aria-label="Bookmark Dial links"
  bind:this={gridRef}
  tabindex="-1"
  role="group"
>
  {#each bookmarks as bookmark, index (bookmark.id)}
    <BookmarkTile
      {bookmark}
      {titleBackdrop}
      menuOpen={openMenuId === bookmark.id}
      focused={focusedIndex === index}
      dragging={draggedBookmark?.id === bookmark.id}
      dragOver={dragOverBookmark?.id === bookmark.id}
      onToggleMenu={() => onTileMenu(bookmark.id)}
      onEdit={() => onTileEdit(bookmark)}
      onRemove={() => onTileRemove(bookmark.id)}
      onFallback={() => onTileFallback(bookmark.id)}
      onContextMenu={(e) => onTileContextMenu(e, bookmark)}
      onFocus={() => onTileFocus(index)}
      onDragStart={(e) => onDragStart(e, bookmark)}
      onDragOver={(e) => onDragOver(e, bookmark)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, bookmark)}
      onDragEnd={onDragEnd}
      {getFaviconUrl}
    />
  {/each}
  {#if showTopSites && topSites.length > 0}
    {#each topSites as site, siteIndex (site.id)}
      <BookmarkTile
        bookmark={site}
        {titleBackdrop}
        menuOpen={false}
        focused={focusedIndex === bookmarks.length + siteIndex}
        dragging={false}
        dragOver={false}
        onToggleMenu={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onFallback={() => {}}
        onContextMenu={() => {}}
        onFocus={() => onTileFocus(bookmarks.length + siteIndex)}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragLeave={() => {}}
        onDrop={() => {}}
        onDragEnd={() => {}}
        {getFaviconUrl}
        isTopSite={true}
      />
    {/each}
  {/if}
  <article class="tile add-tile" draggable="false">
    <button class="add-button" type="button" on:click={onAddShortcut} aria-label="Add new bookmark shortcut">
      <span aria-hidden="true">+</span>
      <div>Add shortcut</div>
    </button>
  </article>
</div>
