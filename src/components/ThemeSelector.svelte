<script>
  /**
   * ThemeSelector - Theme radio button group (Dark/Light/System)
   *
   * A simple presentational component for selecting the app theme.
   * All state is managed by the parent component.
   */

  /** @type {Array<{id: string, label: string}>} */
  export let options = [];

  /** @type {string} */
  export let selected = "system";

  /** @type {(themeId: string) => void} */
  export let onChange = () => {};
</script>

<div class="choice-row">
  {#each options as option (option.id)}
    <button
      type="button"
      class="choice-button"
      data-active={selected === option.id}
      on:click={() => onChange(option.id)}
    >
      {option.label}
    </button>
  {/each}
</div>
