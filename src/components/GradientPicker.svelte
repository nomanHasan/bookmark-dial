<script>
  /**
   * GradientPicker - Gradient swatch grid with expand/collapse
   *
   * Displays a grid of gradient background options. Supports showing a subset
   * with an option to expand to show all gradients.
   */

  /** @type {Array<{id: string, label: string, gradients: {light: string, dark: string}}>} */
  export let options = [];

  /** @type {string|null} */
  export let selectedGradientId = null;

  /** @type {boolean} */
  export let isCustomMode = false;

  /** @type {boolean} */
  export let showAll = false;

  /** @type {number} */
  export let previewCount = 6;

  /** @type {(gradientId: string) => void} */
  export let onSelect = () => {};

  /** @type {() => void} */
  export let onToggleShowAll = () => {};

  /** @type {() => void} */
  export let onCustomClick = () => {};
</script>

<div class="gradient-grid">
  {#each options as option (option.id)}
    <button
      type="button"
      class="gradient-option"
      style="--gradient-sample-light: {option.gradients.light}; --gradient-sample-dark: {option.gradients.dark};"
      data-active={!isCustomMode && selectedGradientId === option.id}
      on:click={() => onSelect(option.id)}
    >
      <span>{option.label}</span>
    </button>
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
      {showAll ? "Show fewer gradients" : "More gradients"}
    </button>
  </div>
{/if}

<section class="settings-group">
  <button type="button" class="custom-background-button" on:click={onCustomClick}>
    Custom background…
  </button>
</section>
