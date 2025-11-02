<script>
  import { bookmarkCache } from "../lib/bookmarkCache";

  export let nodeId;
  export let depth = 0;
  export let expandedIds;
  export let loadingIds;
  export let visibleIds;
  export let searchMatches;
  export let toggleSelection;
  export let toggleExpansion;
  export let getCheckboxState;

  let checkboxEl;

  $: cacheState = $bookmarkCache;
  $: node = cacheState?.nodesById?.[nodeId];
  $: isFolder = node?.isFolder ?? false;
  $: folderChildIds =
    node?.childrenIds?.filter((childId) => {
      const childNode = cacheState?.nodesById?.[childId];
      return childNode?.isFolder;
    }) ?? [];
  $: canExpand = isFolder && (node?.childrenLoaded ? folderChildIds.length > 0 : node?.hasChildren);
  $: isExpanded = canExpand && expandedIds?.has(nodeId);
  $: isLoading = loadingIds?.has(nodeId);
  $: isVisible = !visibleIds || visibleIds.has(nodeId);
  $: checkboxState = getCheckboxState ? getCheckboxState(nodeId) : "none";
  $: if (checkboxEl) {
    checkboxEl.indeterminate = checkboxState === "partial";
    checkboxEl.checked = checkboxState === "selected";
  }
  $: shouldRender = Boolean(node && isFolder && isVisible);

  const indentStyle = `--depth: ${depth}`;

  function handleExpandClick(event) {
    event.stopPropagation();
    if (!canExpand) {
      return;
    }
    toggleExpansion?.(nodeId);
  }

  function handleCheckboxChange(event) {
    event.stopPropagation();
    toggleSelection?.(nodeId);
  }
</script>

{#if shouldRender}
  <li class="folder-node" data-expanded={isExpanded} data-depth={depth} data-match={searchMatches?.has(nodeId) ?? false}>
    <div class="folder-node__row" style={indentStyle}>
      <button
        type="button"
        class="folder-node__expander"
        class:hidden={!canExpand}
        aria-hidden={!canExpand}
        aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
        on:click={handleExpandClick}
        disabled={!canExpand}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            d="M6 4.5 10 8l-4 3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <label class="folder-node__label">
        <input
          type="checkbox"
          class="folder-node__checkbox"
          on:change={handleCheckboxChange}
          bind:this={checkboxEl}
        />
        <span class="folder-node__title" title={node.title || "Untitled folder"}>
          {node.title || "Untitled folder"}
        </span>
      </label>
    </div>

    {#if canExpand && isExpanded}
      <ul class="folder-node__children">
        {#if isLoading}
          <li class="folder-node__status">Loading…</li>
        {:else if (folderChildIds.length)}
          {#each folderChildIds as childId (childId)}
            <svelte:self
              nodeId={childId}
              depth={depth + 1}
              {expandedIds}
              {loadingIds}
              {visibleIds}
              {searchMatches}
              {toggleSelection}
              {toggleExpansion}
              {getCheckboxState}
            />
          {/each}
        {:else}
          <li class="folder-node__status">No subfolders</li>
        {/if}
      </ul>
    {/if}
  </li>
{/if}

<style>
  .folder-node {
    list-style: none;
  }

  .folder-node__row {
    display: flex;
    align-items: center;
    padding-inline-start: calc(var(--depth) * 16px);
    gap: 0.25rem;
    min-height: 2rem;
  }

  .folder-node__expander {
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    color: var(--tree-expander, currentColor);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transform: rotate(0deg);
    transition: transform 0.15s ease;
    cursor: pointer;
  }

  .folder-node[data-expanded="true"] .folder-node__expander {
    transform: rotate(90deg);
  }

  .folder-node__expander.hidden {
    visibility: hidden;
  }

  .folder-node__label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    cursor: pointer;
  }

  .folder-node__checkbox {
    width: 1rem;
    height: 1rem;
  }

  .folder-node__title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .folder-node__children {
    margin: 0;
    padding: 0;
  }

  .folder-node__status {
    list-style: none;
    padding-inline-start: calc((var(--depth) + 1) * 16px + 1.75rem);
    color: var(--tree-status, rgba(15, 23, 42, 0.6));
    font-size: 0.875rem;
    min-height: 1.75rem;
    display: flex;
    align-items: center;
  }

  .folder-node[data-match="true"] .folder-node__title {
    color: var(--accent-color, #2563eb);
    font-weight: 600;
  }
</style>
