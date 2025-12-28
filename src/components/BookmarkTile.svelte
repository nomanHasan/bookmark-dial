<script>
  export let bookmark;
  export let titleBackdrop = false;
  export let menuOpen = false;
  export let focused = false;
  export let dragging = false;
  export let dragOver = false;
  export let isTopSite = false;
  export let onToggleMenu = () => {};
  export let onEdit = () => {};
  export let onRemove = () => {};
  export let onFallback = () => {};
  export let onContextMenu = () => {};
  export let onFocus = () => {};
  export let onDragStart = () => {};
  export let onDragOver = () => {};
  export let onDragLeave = () => {};
  export let onDrop = () => {};
  export let onDragEnd = () => {};
  export let getFaviconUrl = () => "";

  let label = "Shortcut";
  $: label = bookmark?.displayTitle || bookmark?.title || bookmark?.url || "Shortcut";

  // Only regular bookmarks (not top sites) are draggable
  $: isDraggable = !isTopSite;

  function handleMenuClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onToggleMenu?.();
  }

  function handleEdit(event) {
    event.preventDefault();
    event.stopPropagation();
    onEdit?.();
  }

  function handleRemove(event) {
    event.preventDefault();
    event.stopPropagation();
    onRemove?.();
  }

  function handleImageError() {
    onFallback?.();
  }

  function handleContextMenu(event) {
    event.preventDefault();
    onContextMenu?.(event);
  }

  function handleFocus() {
    onFocus?.();
  }

  function handleDragStart(event) {
    if (!isDraggable) {
      event.preventDefault();
      return;
    }
    onDragStart?.(event);
  }

  function handleDragOver(event) {
    if (!isDraggable) return;
    event.preventDefault();
    onDragOver?.(event);
  }

  function handleDragLeave(event) {
    if (!isDraggable) return;
    onDragLeave?.(event);
  }

  function handleDrop(event) {
    if (!isDraggable) return;
    event.preventDefault();
    onDrop?.(event);
  }

  function handleDragEnd(event) {
    if (!isDraggable) return;
    onDragEnd?.(event);
  }
</script>

<article
  class="tile"
  class:tile--focused={focused}
  class:tile--dragging={dragging}
  class:tile--drag-over={dragOver}
  class:tile--top-site={isTopSite}
  draggable={isDraggable}
  on:contextmenu={handleContextMenu}
  on:dragstart={handleDragStart}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  on:dragend={handleDragEnd}
>
  <a
    class="tile-link"
    href={bookmark.url || "#!"}
    title={bookmark.title || bookmark.url || "Shortcut"}
    draggable="false"
    on:focus={handleFocus}
  >
    <div
      class="tile-icon"
      style={`--dial-color: ${bookmark.palette.background}; --dial-text: ${bookmark.palette.text};`}
      aria-hidden="true"
    >
      {#if bookmark.fallback}
        {bookmark.initials}
      {:else}
        <img src={getFaviconUrl(bookmark.url)} alt="" loading="lazy" on:error={handleImageError} />
      {/if}
    </div>
    <div class="tile-title" class:tile-title--pill={titleBackdrop}>
      {bookmark.displayTitle}
    </div>
  </a>
  <div class="tile-actions">
    <button
      class="tile-menu-button"
      class:tile-menu-button--active={menuOpen}
      type="button"
      aria-haspopup="true"
      aria-expanded={menuOpen}
      aria-label={`Open options for ${label}`}
      on:click={handleMenuClick}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="3.5" r="1.25"></circle>
        <circle cx="8" cy="8" r="1.25"></circle>
        <circle cx="8" cy="12.5" r="1.25"></circle>
      </svg>
    </button>
    {#if menuOpen}
      <div class="tile-menu" role="menu">
        <button type="button" role="menuitem" class="tile-menu__item" on:click={handleEdit}>
          Edit
        </button>
        <button
          type="button"
          role="menuitem"
          class="tile-menu__item tile-menu__item--danger"
          on:click={handleRemove}
        >
          Remove
        </button>
      </div>
    {/if}
  </div>
</article>
