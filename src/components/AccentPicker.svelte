<script>
  /**
   * AccentPicker - Accent color swatch grid with expand/collapse
   *
   * Displays a grid of accent color swatches. Supports showing a subset
   * with an option to expand to show all colors.
   */

  /** @type {Array<{id: string, label: string, colors: {base: string}}>} */
  export let options = [];

  /** @type {string} */
  export let selected = "";

  /** @type {boolean} */
  export let showAll = false;

  /** @type {number} */
  export let previewCount = 10;

  /** @type {(accentId: string) => void} */
  export let onSelect = () => {};

  /** @type {() => void} */
  export let onToggleShowAll = () => {};
</script>

<div class="accent-grid">
  {#each options as option (option.id)}
    <button
      type="button"
      class="accent-swatch"
      style="--swatch-color: {option.colors.base};"
      data-active={selected === option.id}
      aria-label={option.label}
      title={option.label}
      on:click={() => onSelect(option.id)}
    ></button>
  {/each}
</div>
{#if options.length > previewCount || showAll}
  <div class="swatch-toggle-row">
    <button
      type="button"
      class="swatch-toggle-button"
      aria-expanded={showAll}
      on:click={onToggleShowAll}
    >
      {showAll ? "Show fewer accent colors" : "More accent colors"}
    </button>
  </div>
{/if}
