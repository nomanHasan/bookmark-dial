<script>
  import { tick } from "svelte";
  import FolderNode from "./FolderNode.svelte";

  export let open = false;
  export let rootIds = [];
  export let expandedIds;
  export let loadingIds;
  export let visibleIds;
  export let searchQuery = "";
  export let searchMatches;
  export let selectedIds;
  export let summary = [];
  export let selectedFolderCount = 0;
  export let totalBookmarkCount = 0;
  export let toggleSelection;
  export let toggleExpansion;
  export let getCheckboxState;
  export let onSearchChange;
  export let onRequestClose;
  export let onConfirmSelection;
  export let onClearSelection;

  let searchField;

  $: if (open) {
    tick().then(() => {
      searchField?.focus();
      searchField?.select();
    });
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onRequestClose?.();
      }
    };
    document.addEventListener("keydown", handleKeydown, { once: true });
  }

  function handleOverlayClick(event) {
    if (event.target !== event.currentTarget) {
      return;
    }
    event.preventDefault();
    onRequestClose?.();
  }

  function handleSearchInput(event) {
    onSearchChange?.(event.target.value);
  }
</script>

{#if open}
  <div class="modal-overlay" role="presentation" on:click={handleOverlayClick}>
    <section
      class="folder-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <header class="folder-modal__header">
        <div>
          <h2 id="folder-modal-title">Select bookmark folders</h2>
          <p class="folder-modal__hint">
            Choose one or more folders to show in your new tab. Selecting a folder includes all of its subfolders.
          </p>
        </div>
        <button type="button" class="folder-modal__close" on:click={onRequestClose} aria-label="Close">
          &times;
        </button>
      </header>

      <div class="folder-modal__search">
        <input
          type="search"
          placeholder="Search folders"
          bind:this={searchField}
          value={searchQuery}
          on:input={handleSearchInput}
        />
      </div>

      <div class="folder-modal__body">
        <div class="folder-modal__tree">
          {#if rootIds.length === 0}
            <p class="folder-modal__empty">No bookmark folders available.</p>
          {:else}
            <ul class="folder-tree">
              {#each rootIds as rootId (rootId)}
                <FolderNode
                  nodeId={rootId}
                  depth={0}
                  {expandedIds}
                  {loadingIds}
                  {visibleIds}
                  {searchMatches}
                  {selectedIds}
                  {toggleSelection}
                  {toggleExpansion}
                  {getCheckboxState}
                />
              {/each}
            </ul>
          {/if}
        </div>

        <aside class="folder-modal__summary">
          <header>
            <h3>Selected folders</h3>
            {#if selectedFolderCount > 0}
              <button type="button" class="summary-clear" on:click={onClearSelection}>
                Clear all
              </button>
            {/if}
          </header>

          {#if summary.length === 0}
            <p class="folder-modal__empty">Pick folders to see them here.</p>
          {:else}
            <ul class="folder-modal__selection-list">
              {#each summary as item (item.id)}
                <li>
                  <span class="selection-chip" title={item.fullPath}>
                    <span class="selection-chip__label">{item.label}</span>
                    {#if typeof item.count === "number"}
                      <span class="selection-chip__count">{item.count}</span>
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </aside>
      </div>

      <footer class="folder-modal__footer">
        <div class="folder-modal__totals">
          <span>{selectedFolderCount} folder{selectedFolderCount === 1 ? "" : "s"} selected</span>
          <span aria-hidden="true">•</span>
          <span>{totalBookmarkCount} bookmark{totalBookmarkCount === 1 ? "" : "s"}</span>
        </div>
        <div class="folder-modal__actions">
          <button type="button" class="ghost-button" on:click={onRequestClose}>
            Cancel
          </button>
          <button
            type="button"
            class="primary-button"
            on:click={onConfirmSelection}
            disabled={selectedFolderCount === 0}
          >
            Confirm selection
          </button>
        </div>
      </footer>
    </section>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .folder-modal {
    background: var(--modal-background, #0f172a);
    color: var(--modal-foreground, #f8fafc);
    border-radius: 1rem;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.35);
    width: min(960px, 100%);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .folder-modal__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    gap: 1rem;
  }

  .folder-modal__hint {
    margin: 0.5rem 0 0;
    color: rgba(226, 232, 240, 0.72);
    font-size: 0.9rem;
  }

  .folder-modal__close {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
  }

  .folder-modal__search {
    padding: 0 1.5rem 1rem;
  }

  .folder-modal__search input[type="search"] {
    width: 100%;
    padding: 0.65rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: rgba(15, 23, 42, 0.6);
    color: inherit;
  }

  .folder-modal__body {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 1.25rem;
    padding: 0 1.5rem 1.5rem;
    overflow: hidden;
    flex: 1;
  }

  .folder-modal__tree {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    overflow: auto;
    padding: 0.5rem 0.25rem;
  }

  .folder-tree {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .folder-modal__summary {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .folder-modal__summary header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .summary-clear {
    background: none;
    border: none;
    color: var(--accent-color, #38bdf8);
    font-weight: 600;
    cursor: pointer;
  }

  .folder-modal__selection-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
  }

  .selection-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
    max-width: 100%;
  }

  .selection-chip__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .selection-chip__count {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.75rem;
  }

  .folder-modal__footer {
    padding: 1rem 1.5rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
  }

  .folder-modal__totals {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(226, 232, 240, 0.85);
    font-size: 0.95rem;
  }

  .folder-modal__actions {
    display: flex;
    gap: 0.75rem;
  }

  .ghost-button,
  .primary-button {
    border-radius: 0.75rem;
    font-size: 0.95rem;
    padding: 0.55rem 1.2rem;
    cursor: pointer;
    border: none;
  }

  .ghost-button {
    background: transparent;
    color: inherit;
    border: 1px solid rgba(148, 163, 184, 0.4);
  }

  .primary-button {
    background: var(--accent-color, #38bdf8);
    color: var(--accent-color-contrast, #0f172a);
  }

  .primary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .folder-modal__empty {
    margin: 0;
    padding: 1rem;
    color: rgba(226, 232, 240, 0.7);
  }
</style>
