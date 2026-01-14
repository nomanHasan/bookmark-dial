<script>
  /**
   * BackgroundPickerDialog - Dialog for selecting custom background image
   *
   * A native HTML dialog for picking and uploading a custom background image.
   */

  /** @type {HTMLDialogElement|null} */
  let dialogRef = null;

  /** @type {HTMLInputElement|null} */
  let inputRef = null;

  /** @type {(file: File|null) => void} */
  export let onSubmit = () => {};

  /** @type {() => void} */
  export let onClear = () => {};

  /** @type {() => void} */
  export let onCancel = () => {};

  export function open() {
    if (inputRef) {
      inputRef.value = "";
    }
    dialogRef?.showModal();
  }

  export function close() {
    dialogRef?.close();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const file = inputRef?.files?.[0] ?? null;
    onSubmit(file);
  }

  function handleClear(event) {
    event.preventDefault();
    onClear();
  }

  function handleCancel(event) {
    event.preventDefault();
    onCancel();
  }
</script>

<dialog bind:this={dialogRef}>
  <form id="background-form" method="dialog" on:submit={handleSubmit}>
    <header>
      <h2>Custom background</h2>
    </header>
    <div class="dialog-body">
      <label class="file-picker">
        <span>Choose an image (JPEG/PNG, up to 10&nbsp;MB)</span>
        <input bind:this={inputRef} type="file" accept="image/png,image/jpeg,image/jpg" />
      </label>
      <p class="hint">The selected image is stored locally on this device only.</p>
    </div>
    <footer class="dialog-footer">
      <button type="button" id="clear-background" class="ghost-button" on:click={handleClear}>
        Remove
      </button>
      <span class="spacer"></span>
      <button type="button" id="cancel-background" on:click={handleCancel}>
        Cancel
      </button>
      <button type="submit" id="save-background">Save</button>
    </footer>
  </form>
</dialog>
