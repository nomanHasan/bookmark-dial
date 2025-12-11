<script>
  export let bookmark;
  export let titleBackdrop = false;
  export let menuOpen = false;
  export let onToggleMenu = () => {};
  export let onEdit = () => {};
  export let onRemove = () => {};
  export let onFallback = () => {};
  export let getFaviconUrl = () => "";

  let label = "Shortcut";
  $: label = bookmark?.displayTitle || bookmark?.title || bookmark?.url || "Shortcut";

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
</script>

<article class="tile" draggable="false">
  <a
    class="tile-link"
    href={bookmark.url || "#!"}
    title={bookmark.title || bookmark.url || "Shortcut"}
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
