<script>
  import { createEventDispatcher } from "svelte";

  /** @type {import('../lib/bookmarkCache').BookmarkNode | null} */
  export let bookmark = null; // Passed for external reference, used by parent handlers
  export let position = { x: 0, y: 0 };
  export let visible = false;

  const dispatch = createEventDispatcher();

  // Bookmark title for accessibility (if available)
  $: bookmarkTitle = bookmark?.title || bookmark?.url || "bookmark";

  function handleEdit() {
    dispatch("edit");
  }

  function handleRemove() {
    dispatch("remove");
  }

  function handleOpenInNewTab() {
    dispatch("opennewtab");
  }

  function handleCopyUrl() {
    dispatch("copyurl");
  }

  function handleClose() {
    dispatch("close");
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNextItem(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNextItem(-1);
    }
  }

  function focusNextItem(direction) {
    const items = document.querySelectorAll(".context-menu__item");
    const current = document.activeElement;
    const currentIndex = Array.from(items).indexOf(current);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;
    items[nextIndex]?.focus();
  }

  $: menuStyle = `left: ${position.x}px; top: ${position.y}px;`;
</script>

<svelte:window on:keydown={visible ? handleKeydown : null} />

{#if visible}
  <div
    class="context-menu-overlay"
    on:click={handleClose}
    on:contextmenu|preventDefault={handleClose}
    role="presentation"
  ></div>
  <menu
    class="context-menu"
    style={menuStyle}
    aria-label="Actions for {bookmarkTitle}"
  >
    <li>
      <button
        type="button"
        class="context-menu__item"
        role="menuitem"
        on:click={handleOpenInNewTab}
      >
        <svg class="context-menu__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M9 2h5v5M14 2L7 9M6 4H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Open in new tab
      </button>
    </li>
    <li>
      <button
        type="button"
        class="context-menu__item"
        role="menuitem"
        on:click={handleCopyUrl}
      >
        <svg class="context-menu__icon" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M11 5V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
        Copy URL
      </button>
    </li>
    <li class="context-menu__divider" role="separator"></li>
    <li>
      <button
        type="button"
        class="context-menu__item"
        role="menuitem"
        on:click={handleEdit}
      >
        <svg class="context-menu__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Edit bookmark
      </button>
    </li>
    <li>
      <button
        type="button"
        class="context-menu__item context-menu__item--danger"
        role="menuitem"
        on:click={handleRemove}
      >
        <svg class="context-menu__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Remove
      </button>
    </li>
  </menu>
{/if}

<style>
  .context-menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
  }

  .context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 180px;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 0.75rem;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.2);
    padding: 0.4rem;
    backdrop-filter: blur(12px);
    list-style: none;
    margin: 0;
  }

  .context-menu li {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  :global(body.dark) .context-menu {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .context-menu__item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    color: #0f172a;
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.12s ease;
  }

  :global(body.dark) .context-menu__item {
    color: #f8fafc;
  }

  .context-menu__item:hover,
  .context-menu__item:focus-visible {
    background: rgba(15, 23, 42, 0.08);
    outline: none;
  }

  :global(body.dark) .context-menu__item:hover,
  :global(body.dark) .context-menu__item:focus-visible {
    background: rgba(148, 163, 184, 0.15);
  }

  .context-menu__item--danger {
    color: #dc2626;
  }

  :global(body.dark) .context-menu__item--danger {
    color: #f87171;
  }

  .context-menu__item--danger:hover,
  .context-menu__item--danger:focus-visible {
    background: rgba(220, 38, 38, 0.1);
  }

  :global(body.dark) .context-menu__item--danger:hover,
  :global(body.dark) .context-menu__item--danger:focus-visible {
    background: rgba(248, 113, 113, 0.15);
  }

  .context-menu__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    opacity: 0.75;
  }

  .context-menu__divider {
    height: 1px;
    background: rgba(15, 23, 42, 0.1);
    margin: 0.35rem 0.5rem;
    padding: 0;
  }

  :global(body.dark) .context-menu__divider {
    background: rgba(148, 163, 184, 0.2);
  }
</style>
