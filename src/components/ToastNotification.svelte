<script>
  import { fly, fade } from "svelte/transition";
  import { flip } from "svelte/animate";

  export let toasts = [];
  export let onDismiss = () => {};
  export let onUndo = () => {};

  function handleDismiss(id) {
    onDismiss?.(id);
  }

  function handleUndo(toast) {
    onUndo?.(toast);
  }
</script>

<div class="toast-container" aria-live="polite" aria-label="Notifications">
  {#each toasts as toast (toast.id)}
    <div
      class="toast"
      class:toast--success={toast.type === "success"}
      class:toast--error={toast.type === "error"}
      class:toast--info={toast.type === "info"}
      role="alert"
      in:fly={{ y: 50, duration: 250 }}
      out:fade={{ duration: 150 }}
      animate:flip={{ duration: 250 }}
    >
      <span class="toast__message">{toast.message}</span>
      <div class="toast__actions">
        {#if toast.undoData}
          <button
            type="button"
            class="toast__undo"
            on:click={() => handleUndo(toast)}
          >
            Undo
          </button>
        {/if}
        <button
          type="button"
          class="toast__dismiss"
          aria-label="Dismiss notification"
          on:click={() => handleDismiss(toast.id)}
        >
          ×
        </button>
      </div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
    z-index: 9999;
    pointer-events: none;
    max-width: min(90vw, 400px);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(15, 23, 42, 0.95);
    color: #f8fafc;
    border-radius: 0.75rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(12px);
    pointer-events: auto;
    font-size: 0.9rem;
  }

  :global(body.dark) .toast {
    background: rgba(30, 41, 59, 0.95);
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .toast--success {
    border-left: 3px solid #10b981;
  }

  .toast--error {
    border-left: 3px solid #ef4444;
  }

  .toast--info {
    border-left: 3px solid var(--accent-color, #2563eb);
  }

  .toast__message {
    flex: 1;
    line-height: 1.4;
  }

  .toast__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .toast__undo {
    background: transparent;
    border: 1px solid rgba(148, 163, 184, 0.4);
    color: var(--accent-color, #38bdf8);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.3rem 0.65rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .toast__undo:hover,
  .toast__undo:focus-visible {
    background: rgba(56, 189, 248, 0.15);
    border-color: var(--accent-color, #38bdf8);
    outline: none;
  }

  .toast__dismiss {
    background: transparent;
    border: none;
    color: rgba(148, 163, 184, 0.8);
    font-size: 1.25rem;
    line-height: 1;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .toast__dismiss:hover,
  .toast__dismiss:focus-visible {
    color: #f8fafc;
    background: rgba(148, 163, 184, 0.2);
    outline: none;
  }
</style>
