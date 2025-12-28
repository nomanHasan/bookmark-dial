<script>
  export let visible = false;
  export let query = "";
  export let onSearchChange = () => {};
  export let onClose = () => {};

  let inputEl;

  $: if (visible && inputEl) {
    inputEl.focus();
  }

  function handleInput(event) {
    onSearchChange?.(event.target.value);
  }

  function handleClear() {
    onSearchChange?.("");
    inputEl?.focus();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        onSearchChange?.("");
      } else {
        onClose?.();
      }
    }
  }
</script>

{#if visible}
  <div class="search-bar" role="search">
    <svg class="search-bar__icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <input
      bind:this={inputEl}
      type="search"
      class="search-bar__input"
      placeholder="Search bookmarks…"
      value={query}
      on:input={handleInput}
      on:keydown={handleKeydown}
      aria-label="Search bookmarks"
    />
    {#if query}
      <button
        type="button"
        class="search-bar__clear"
        on:click={handleClear}
        aria-label="Clear search"
      >
        ×
      </button>
    {/if}
    <button
      type="button"
      class="search-bar__close"
      on:click={onClose}
      aria-label="Close search"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
{/if}

<style>
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1rem;
    background: var(--surface-elevated, rgba(255, 255, 255, 0.92));
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 1rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
    backdrop-filter: blur(12px);
    margin-bottom: 1.5rem;
    max-width: 480px;
  }

  :global(body.dark) .search-bar {
    background: var(--surface-elevated-dark, rgba(15, 23, 42, 0.9));
    border-color: rgba(148, 163, 184, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .search-bar__icon {
    width: 1.1rem;
    height: 1.1rem;
    flex-shrink: 0;
    color: rgba(15, 23, 42, 0.5);
  }

  :global(body.dark) .search-bar__icon {
    color: rgba(226, 232, 240, 0.5);
  }

  .search-bar__input {
    flex: 1;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 0.95rem;
    outline: none;
    min-width: 0;
  }

  .search-bar__input::placeholder {
    color: rgba(15, 23, 42, 0.45);
  }

  :global(body.dark) .search-bar__input::placeholder {
    color: rgba(226, 232, 240, 0.45);
  }

  .search-bar__input::-webkit-search-cancel-button {
    display: none;
  }

  .search-bar__clear {
    background: transparent;
    border: none;
    color: rgba(15, 23, 42, 0.5);
    font-size: 1.25rem;
    line-height: 1;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: color 0.12s ease;
  }

  .search-bar__clear:hover,
  .search-bar__clear:focus-visible {
    color: #0f172a;
    outline: none;
  }

  :global(body.dark) .search-bar__clear {
    color: rgba(226, 232, 240, 0.5);
  }

  :global(body.dark) .search-bar__clear:hover,
  :global(body.dark) .search-bar__clear:focus-visible {
    color: #f8fafc;
  }

  .search-bar__close {
    background: transparent;
    border: none;
    color: rgba(15, 23, 42, 0.5);
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: color 0.12s ease;
  }

  .search-bar__close svg {
    width: 1rem;
    height: 1rem;
  }

  .search-bar__close:hover,
  .search-bar__close:focus-visible {
    color: #0f172a;
    outline: none;
  }

  :global(body.dark) .search-bar__close {
    color: rgba(226, 232, 240, 0.5);
  }

  :global(body.dark) .search-bar__close:hover,
  :global(body.dark) .search-bar__close:focus-visible {
    color: #f8fafc;
  }
</style>
