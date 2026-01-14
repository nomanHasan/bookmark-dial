<script>
  /**
   * FolderSummaryPanel - Shows selected folders summary with bookmark count
   *
   * Displays chips for each selected folder with their bookmark counts,
   * and a button to open the folder management modal.
   */

  /** @type {Array<{id: string, label: string, fullPath: string, count: number}>} */
  export let summary = [];

  /** @type {() => void} */
  export let onChooseFolders = () => {};
</script>

<div class="folder-bar">
  <div class="folder-bar__summary">
    {#if summary.length === 0}
      <span class="folder-chip folder-chip--empty" title="Default Bookmark Dial folder">
        Default folder
      </span>
    {:else}
      {#each summary as item (item.id)}
        <span class="folder-chip" title={item.fullPath}>
          <span class="folder-chip__label">{item.label}</span>
          <span class="folder-chip__count">{item.count}</span>
        </span>
      {/each}
    {/if}
  </div>
  <button type="button" class="ghost-button folder-bar__action" on:click={onChooseFolders}>
    Manage folders
  </button>
</div>
