<script>
  /**
   * SteppedSlider - Discrete stepped slider with dot indicators
   *
   * A slider component that snaps to discrete values with
   * dot indicators on the track. Used for settings
   * with predefined options.
   */

  /** @type {Array<{value: string|number, label: string}>} */
  export let options = [];

  /** @type {string|number} */
  export let value = "";

  /** @type {string} */
  export let label = "";

  /** @type {string} */
  export let description = "";

  /** @type {(value: string|number) => void} */
  export let onChange = () => {};

  $: currentIndex = options.findIndex((opt) => opt.value === value);
  $: displayLabel = currentIndex >= 0 ? options[currentIndex].label : "";

  function handleInput(event) {
    const idx = parseInt(event.currentTarget.value, 10);
    if (options[idx]) {
      onChange(options[idx].value);
    }
  }

  function handleDotClick(idx) {
    if (options[idx]) {
      onChange(options[idx].value);
    }
  }

  function handleKeydown(event, idx) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleDotClick(idx);
    }
  }
</script>

<div class="stepped-slider">
  {#if label}
    <div class="stepped-slider__header">
      <span class="stepped-slider__label">{label}</span>
      <span class="stepped-slider__value">{displayLabel}</span>
    </div>
  {/if}
  {#if description}
    <span class="stepped-slider__description">{description}</span>
  {/if}
  <div class="stepped-slider__track-wrapper">
    <div class="stepped-slider__dots" role="group" aria-label="{label} options">
      {#each options as option, idx (option.value)}
        <button
          type="button"
          class="stepped-slider__dot"
          class:stepped-slider__dot--active={idx === currentIndex}
          class:stepped-slider__dot--passed={idx < currentIndex}
          on:click={() => handleDotClick(idx)}
          on:keydown={(e) => handleKeydown(e, idx)}
          aria-label="{option.label}"
          aria-pressed={idx === currentIndex}
          title={option.label}
        ></button>
      {/each}
    </div>
    <input
      type="range"
      min="0"
      max={options.length - 1}
      step="1"
      value={currentIndex >= 0 ? currentIndex : 0}
      on:input={handleInput}
      aria-label={label}
      aria-valuetext={displayLabel}
    />
  </div>
</div>
