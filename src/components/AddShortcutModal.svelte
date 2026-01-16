<script>
  import { tick } from "svelte";

  export let open = false;
  export let folders = [];
  export let defaultFolderId = null;
  export let onConfirm = null;
  export let onClose = null;

  let selectedFolderId = "";
  let url = "";
  let title = "";
  let urlInput;
  let previousOpen = false;

  // Always ensure a folder is selected when folders or defaultFolderId change
  $: if (open && folders.length > 0) {
    // If no selection or invalid selection, choose a default
    const hasValidSelection = selectedFolderId && folders.some(f => f.id === selectedFolderId);
    if (!hasValidSelection) {
      selectedFolderId = defaultFolderId || folders[0].id;
    }
  }

  $: if (open && !previousOpen) {
    // Reset form and set default folder only when first opening
    previousOpen = true;
    url = "";
    title = "";
    selectedFolderId = defaultFolderId || (folders.length > 0 ? folders[0].id : "");
    
    tick().then(() => {
      urlInput?.focus();
    });

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeydown, { once: true });
  } else if (!open && previousOpen) {
    previousOpen = false;
  }

  function handleOverlayClick(event) {
    if (event.target !== event.currentTarget) {
      return;
    }
    event.preventDefault();
    handleClose();
  }

  function handleClose() {
    onClose?.();
  }

  function handleUrlChange() {
    // Auto-fill title if it's empty
    if (!title && url) {
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname.replace(/^www\./, "");
      } catch (e) {
        // Invalid URL, ignore
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    
    if (!selectedFolderId) {
      alert("Please select a folder.");
      return;
    }
    
    if (!url.trim()) {
      alert("Please enter a URL.");
      return;
    }
    
    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }
    
    onConfirm?.({
      folderId: selectedFolderId,
      url: url.trim(),
      title: title.trim(),
    });
  }

  function getFolderDisplayName(folder) {
    return folder.fullPath || folder.label || "Untitled folder";
  }
</script>

{#if open}
  <div class="modal-overlay" role="presentation" on:click={handleOverlayClick}>
    <section
      class="add-shortcut-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-shortcut-modal-title"
    >
      <header class="add-shortcut-modal__header">
        <h2 id="add-shortcut-modal-title">Add New Shortcut</h2>
        <button type="button" class="add-shortcut-modal__close" on:click={handleClose} aria-label="Close">
          &times;
        </button>
      </header>

      <form class="add-shortcut-modal__form" on:submit={handleSubmit}>
        <div class="form-group">
          <label for="shortcut-folder">
            Folder
            <span class="form-hint">Where to save the shortcut</span>
          </label> 
          <select id="shortcut-folder" bind:value={selectedFolderId} required>
            {#each folders as folder (folder.id)}
              <option value={folder.id}>
                {getFolderDisplayName(folder)}
                {#if folder.count !== undefined}
                  ({folder.count})
                {/if}
              </option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="shortcut-url">
            URL
            <span class="form-hint">The website address</span>
          </label>
          <input
            id="shortcut-url"
            type="url"
            bind:this={urlInput}
            bind:value={url}
            on:blur={handleUrlChange}
            placeholder="https://example.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="shortcut-title">
            Title
            <span class="form-hint">Display name for the shortcut</span>
          </label>
          <input
            id="shortcut-title"
            type="text"
            bind:value={title}
            placeholder="Example Site"
            required
          />
        </div>

        <div class="add-shortcut-modal__actions">
          <button type="button" class="button button--secondary" on:click={handleClose}>
            Cancel
          </button>
          <button type="submit" class="button button--primary">
            Add Shortcut
          </button>
        </div>
      </form>
    </section>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  }

  .add-shortcut-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .add-shortcut-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .add-shortcut-modal__header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
  }

  .add-shortcut-modal__close {
    background: none;
    border: none;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background 0.2s, color 0.2s;
  }

  .add-shortcut-modal__close:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .add-shortcut-modal__form {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .form-hint {
    font-weight: 400;
    color: #6b7280;
    font-size: 12px;
  }

  .form-group input,
  .form-group select {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    background: white;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group select {
    cursor: pointer;
  }

  .add-shortcut-modal__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .button {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: inherit;
  }

  .button--secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .button--secondary:hover {
    background: #e5e7eb;
  }

  .button--primary {
    background: #3b82f6;
    color: white;
  }

  .button--primary:hover {
    background: #2563eb;
  }

  .button--primary:active {
    background: #1d4ed8;
  }

  @media (prefers-color-scheme: dark) {
    .add-shortcut-modal {
      background: #1f2937;
    }

    .add-shortcut-modal__header {
      border-bottom-color: #374151;
    }

    .add-shortcut-modal__header h2 {
      color: #f9fafb;
    }

    .add-shortcut-modal__close {
      color: #9ca3af;
    }

    .add-shortcut-modal__close:hover {
      background: #374151;
      color: #f9fafb;
    }

    .form-group label {
      color: #e5e7eb;
    }

    .form-hint {
      color: #9ca3af;
    }

    .form-group input,
    .form-group select {
      background: #111827;
      border-color: #374151;
      color: #f9fafb;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .button--secondary {
      background: #374151;
      color: #e5e7eb;
    }

    .button--secondary:hover {
      background: #4b5563;
    }
  }
</style>
