<script>
  import { fade, fly } from "svelte/transition";

  export let open = false;
  export let onDismiss = () => {};
  export let onGetStarted = () => {};

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      onDismiss?.();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss?.();
    }
  }
</script>

<svelte:window on:keydown={open ? handleKeydown : null} />

{#if open}
  <div
    class="welcome-overlay"
    role="presentation"
    on:click={handleOverlayClick}
    transition:fade={{ duration: 200 }}
  >
    <article
      class="welcome-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      transition:fly={{ y: 30, duration: 300 }}
    >
      <header class="welcome-header">
        <h2 id="welcome-title">Welcome to Bookmark Dial</h2>
        <p class="welcome-subtitle">Your new tab, reimagined.</p>
      </header>

      <div class="welcome-content">
        <section class="welcome-step">
          <div class="welcome-step__icon" aria-hidden="true">📁</div>
          <div class="welcome-step__text">
            <h3>Select Your Folders</h3>
            <p>
              Open <strong>Settings</strong> (gear icon) and click <strong>Manage folders</strong> to choose which bookmark folders appear on your new tab.
            </p>
          </div>
        </section>

        <section class="welcome-step">
          <div class="welcome-step__icon" aria-hidden="true">➕</div>
          <div class="welcome-step__text">
            <h3>Add Shortcuts</h3>
            <p>
              Click the <strong>+ Add shortcut</strong> tile to quickly add new bookmarks directly from this page.
            </p>
          </div>
        </section>

        <section class="welcome-step">
          <div class="welcome-step__icon" aria-hidden="true">🎨</div>
          <div class="welcome-step__text">
            <h3>Customize Your Theme</h3>
            <p>
              Choose from multiple themes, accent colors, and gradient backgrounds to personalize your experience.
            </p>
          </div>
        </section>

        <section class="welcome-step">
          <div class="welcome-step__icon" aria-hidden="true">⌨️</div>
          <div class="welcome-step__text">
            <h3>Keyboard Shortcuts</h3>
            <p>
              Use <kbd>Arrow keys</kbd> to navigate, <kbd>Enter</kbd> to open, and <kbd>Delete</kbd> or <kbd>Backspace</kbd> to remove bookmarks.
            </p>
          </div>
        </section>
      </div>

      <footer class="welcome-footer">
        <button
          type="button"
          class="welcome-button"
          on:click={onGetStarted}
        >
          Get Started
        </button>
      </footer>
    </article>
  </div>
{/if}

<style>
  .welcome-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1.5rem;
  }

  .welcome-modal {
    background: linear-gradient(145deg, #ffffff, #f8fafc);
    color: #0f172a;
    border-radius: 1.5rem;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.35);
    width: min(520px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  :global(body.dark) .welcome-modal {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    color: #f8fafc;
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  .welcome-header {
    padding: 2rem 2rem 1rem;
    text-align: center;
  }

  .welcome-header h2 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent-color, #2563eb), #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .welcome-subtitle {
    margin: 0.5rem 0 0;
    color: rgba(15, 23, 42, 0.7);
    font-size: 1rem;
  }

  :global(body.dark) .welcome-subtitle {
    color: rgba(226, 232, 240, 0.7);
  }

  .welcome-content {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .welcome-step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: rgba(15, 23, 42, 0.04);
    border-radius: 1rem;
    transition: background-color 0.15s ease;
  }

  :global(body.dark) .welcome-step {
    background: rgba(148, 163, 184, 0.08);
  }

  .welcome-step__icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-color-soft, rgba(37, 99, 235, 0.14));
    border-radius: 0.75rem;
  }

  .welcome-step__text h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .welcome-step__text p {
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
    color: rgba(15, 23, 42, 0.75);
    line-height: 1.5;
  }

  :global(body.dark) .welcome-step__text p {
    color: rgba(226, 232, 240, 0.75);
  }

  .welcome-step__text strong {
    color: var(--accent-color, #2563eb);
  }

  :global(body.dark) .welcome-step__text strong {
    color: var(--accent-color, #38bdf8);
  }

  .welcome-step__text kbd {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    font-family: inherit;
    font-size: 0.8rem;
    background: rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.15);
    border-radius: 0.3rem;
  }

  :global(body.dark) .welcome-step__text kbd {
    background: rgba(148, 163, 184, 0.15);
    border-color: rgba(148, 163, 184, 0.25);
  }

  .welcome-footer {
    padding: 1.5rem 2rem 2rem;
    display: flex;
    justify-content: center;
  }

  .welcome-button {
    background: var(--accent-color, #2563eb);
    color: var(--accent-color-contrast, #f8fafc);
    border: none;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.75rem 2rem;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .welcome-button:hover,
  .welcome-button:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
    outline: none;
  }

  .welcome-button:active {
    transform: translateY(0);
  }
</style>
