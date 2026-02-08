<script>
  /**
   * SettingsDrawer - Main settings sidebar component
   *
   * Contains all settings controls including theme, accent, gradient,
   * folder management, and experimental features. Uses smaller
   * sub-components for individual setting sections.
   */

  import {
    THEME_OPTIONS,
    ACCENT_PREVIEW_COUNT,
    GRADIENT_PREVIEW_COUNT,
    TILE_SIZE_OPTIONS,
    TILE_ICON_SHAPE_OPTIONS,
    TILE_FONT_WEIGHT_OPTIONS,
    TILE_FONT_SIZE_OPTIONS,
    TILE_PADDING_OPTIONS,
    TILE_TITLE_SHAPE_OPTIONS,
    TILE_BLUR_OPTIONS,
    TILE_TEXT_CONTRAST_OPTIONS,
    TILE_BG_LIGHTNESS_OPTIONS,
    IMMERSIVE_OPACITY_OPTIONS,
  } from '../lib/constants.js';
  import ThemeSelector from './ThemeSelector.svelte';
  import AccentPicker from './AccentPicker.svelte';
  import GradientPicker from './GradientPicker.svelte';
  import FolderSummaryPanel from './FolderSummaryPanel.svelte';
  import SteppedSlider from './SteppedSlider.svelte';

  /** @type {boolean} */
  export let open = false;

  /** @type {{theme: string, accent: string, background: {mode: string, gradientId: string}, titleBackdrop: boolean, mergeAllBookmarks: boolean, folderColumnWidth: number, compactFolderHeader: boolean, enableBookmarkSearch: boolean, enableTopSites: boolean}} */
  export let settings;

  /** @type {Array<{id: string, label: string, fullPath: string, count: number}>} */
  export let folderSummary = [];

  /** @type {Array<{id: string, label: string, colors: {base: string}}>} */
  export let visibleAccentOptions = [];

  /** @type {Array<{id: string, label: string, gradients: {light: string, dark: string}}>} */
  export let visibleGradientOptions = [];

  /** @type {boolean} */
  export let showAllAccents = false;

  /** @type {boolean} */
  export let showAllGradients = false;

  // Event handlers passed from parent
  /** @type {() => void} */
  export let onClose = () => {};

  /** @type {(themeId: string) => void} */
  export let onThemeChange = () => {};

  /** @type {(accentId: string) => void} */
  export let onAccentChange = () => {};

  /** @type {(enabled: boolean) => void} */
  export let onTitleBackdropChange = () => {};

  /** @type {(gradientId: string) => void} */
  export let onGradientSelect = () => {};

  /** @type {() => void} */
  export let onCustomBackgroundClick = () => {};

  /** @type {(enabled: boolean) => void} */
  export let onMergeAllChange = () => {};

  /** @type {(width: number) => void} */
  export let onFolderColumnWidthChange = () => {};

  /** @type {(enabled: boolean) => void} */
  export let onCompactHeaderChange = () => {};

  /** @type {(enabled: boolean) => void} */
  export let onSearchToggle = () => {};

  /** @type {(enabled: boolean) => void} */
  export let onTopSitesToggle = () => {};

  /** @type {() => void} */
  export let onToggleAccents = () => {};

  /** @type {() => void} */
  export let onToggleGradients = () => {};

  /** @type {() => void} */
  export let onOpenFolderModal = () => {};

  // Tile customization handlers
  /** @type {(size: string) => void} */
  export let onTileSizeChange = () => {};

  /** @type {(shape: string) => void} */
  export let onTileIconShapeChange = () => {};

  /** @type {(weight: number) => void} */
  export let onTileFontWeightChange = () => {};

  /** @type {(size: string) => void} */
  export let onTileFontSizeChange = () => {};

  /** @type {(padding: string) => void} */
  export let onTilePaddingChange = () => {};

  /** @type {(shape: string) => void} */
  export let onTileTitleShapeChange = () => {};

  /** @type {(blur: number) => void} */
  export let onTileBlurChange = () => {};

  /** @type {(contrast: string) => void} */
  export let onTileTextContrastChange = () => {};

  /** @type {(lightness: number) => void} */
  export let onTileBgLightnessChange = () => {};

  /** @type {(showTitle: boolean) => void} */
  export let onShowTitleChange = () => {};

  // Immersive mode handlers
  /** @type {(enabled: boolean) => void} */
  export let onImmersiveEnabledChange = () => {};

  /** @type {(opacity: number) => void} */
  export let onImmersiveOpacityChange = () => {};

  let drawerRef;

  // Focus the drawer when it opens
  $: if (open && drawerRef) {
    drawerRef.focus();
  }
</script>

<aside
  id="settings-drawer"
  class="settings-drawer"
  data-open={open}
  aria-hidden={!open}
  tabindex="-1"
  bind:this={drawerRef}
  on:click|stopPropagation
>
  <header class="settings-drawer__header">
    <h2>
      <img src="/icons/icon-48.png" alt="Bookmark Dial" class="settings-drawer__brand-icon" />
      Settings
    </h2>
    <button
      type="button"
      class="settings-drawer__close"
      aria-label="Close settings"
      on:click={onClose}
    >
      &times;
    </button>
  </header>

  <section class="settings-group">
    <h3>Theme</h3>
    <ThemeSelector
      options={THEME_OPTIONS}
      selected={settings.theme}
      onChange={onThemeChange}
    />
  </section>

  <section class="settings-group">
    <h3>Accent color</h3>
    <AccentPicker
      options={visibleAccentOptions}
      selected={settings.accent}
      {showAllAccents}
      previewCount={ACCENT_PREVIEW_COUNT}
      onSelect={onAccentChange}
      onToggleShowAll={onToggleAccents}
    />
  </section>

  <section class="settings-group">
    <h3>Gradient background</h3>
    <GradientPicker
      options={visibleGradientOptions}
      selectedGradientId={settings.background.gradientId}
      isCustomMode={settings.background.mode === "custom"}
      {showAllGradients}
      previewCount={GRADIENT_PREVIEW_COUNT}
      onSelect={onGradientSelect}
      onToggleShowAll={onToggleGradients}
      onCustomClick={onCustomBackgroundClick}
    />
  </section>

  <section class="settings-group">
    <h3>Tile appearance</h3>
    <SteppedSlider
      label="Tile size"
      description="Overall size of bookmark tiles in the grid"
      options={TILE_SIZE_OPTIONS}
      value={settings.tile?.size ?? 'medium'}
      onChange={onTileSizeChange}
    />
    <SteppedSlider
      label="Icon shape"
      description="Border rounding of favicon icons"
      options={TILE_ICON_SHAPE_OPTIONS}
      value={settings.tile?.iconShape ?? '50%'}
      onChange={onTileIconShapeChange}
    />
  </section>

  <section class="settings-group">
    <h3>Tile title</h3>
    <label
      class="settings-toggle"
      title="Show or hide bookmark titles below icons."
    >
      <input
        type="checkbox"
        checked={settings.tile?.showTitle ?? true}
        on:change={(event) => onShowTitleChange(event.currentTarget.checked)}
      />
      <div class="settings-toggle__body">
        <span class="settings-toggle__label">Show title</span>
        <span class="settings-toggle__description">
          Display bookmark names below icons.
        </span>
      </div>
    </label>
    {#if settings.tile?.showTitle !== false}
    <SteppedSlider
      label="Font weight"
      description="Thickness of title text"
      options={TILE_FONT_WEIGHT_OPTIONS}
      value={settings.tile?.fontWeight ?? 500}
      onChange={onTileFontWeightChange}
    />
    <SteppedSlider
      label="Font size"
      description="Size of the bookmark title text"
      options={TILE_FONT_SIZE_OPTIONS}
      value={settings.tile?.fontSize ?? '0.9rem'}
      onChange={onTileFontSizeChange}
    />
    <SteppedSlider
      label="Title padding"
      description="Space between text and backdrop edge"
      options={TILE_PADDING_OPTIONS}
      value={settings.tile?.padding ?? '0.2rem 0.6rem'}
      onChange={onTilePaddingChange}
    />
    <SteppedSlider
      label="Title shape"
      description="Corner rounding of the title backdrop"
      options={TILE_TITLE_SHAPE_OPTIONS}
      value={settings.tile?.titleShape ?? '999px'}
      onChange={onTileTitleShapeChange}
    />
    <SteppedSlider
      label="Text visibility"
      description="How bold/opaque the title text appears"
      options={TILE_TEXT_CONTRAST_OPTIONS}
      value={settings.tile?.textContrast ?? 'normal'}
      onChange={onTileTextContrastChange}
    />
    <label
      class="settings-toggle"
      title="Adds a soft highlight behind each title for contrast."
    >
      <input
        type="checkbox"
        checked={settings.titleBackdrop}
        on:change={(event) => onTitleBackdropChange(event.currentTarget.checked)}
      />
      <div class="settings-toggle__body">
        <span class="settings-toggle__label">Rounded backdrop</span>
        <span class="settings-toggle__description">
          Adds a blurred pill behind text for better readability.
        </span>
      </div>
    </label>
    {/if}
  </section>

  {#if settings.titleBackdrop && settings.tile?.showTitle !== false}
  <section class="settings-group">
    <h3>Backdrop style</h3>
    <SteppedSlider
      label="Blur intensity"
      description="Glass-like frosted blur effect strength"
      options={TILE_BLUR_OPTIONS}
      value={settings.tile?.blur ?? 8}
      onChange={onTileBlurChange}
    />
    <SteppedSlider
      label="Background intensity"
      description="How visible the backdrop pill appears against your wallpaper"
      options={TILE_BG_LIGHTNESS_OPTIONS}
      value={settings.tile?.bgLightness ?? 3}
      onChange={onTileBgLightnessChange}
    />
  </section>
  {/if}

  <section class="settings-group">
    <h3>Immersive mode</h3>
    <label
      class="settings-toggle"
      title="Fade UI elements to reveal your background. Hover to interact."
    >
      <input
        type="checkbox"
        checked={settings.immersive?.enabled ?? false}
        on:change={(event) => onImmersiveEnabledChange(event.currentTarget.checked)}
      />
      <div class="settings-toggle__body">
        <span class="settings-toggle__label">Enable immersive mode</span>
        <span class="settings-toggle__description">
          Fade UI elements to reveal your background. Hover to interact.
        </span>
      </div>
    </label>
    {#if settings.immersive?.enabled}
      <SteppedSlider
        label="UI visibility"
        description="How visible elements are when not hovered"
        options={IMMERSIVE_OPACITY_OPTIONS}
        value={settings.immersive?.opacity ?? 0.15}
        onChange={onImmersiveOpacityChange}
      />
      {#if settings.immersive?.opacity === 0}
        <p class="settings-warning">
          UI is completely invisible. Use Esc key to access settings.
        </p>
      {/if}
    {/if}
  </section>

  <section class="settings-group settings-group--folders">
    <h3>Folders</h3>
    <FolderSummaryPanel
      summary={folderSummary}
      onChooseFolders={onOpenFolderModal}
    />
    <label class="settings-toggle folder-group-toggle">
      <input
        type="checkbox"
        checked={settings.mergeAllBookmarks}
        on:change={(event) => onMergeAllChange(event.currentTarget.checked)}
      />
      <div class="settings-toggle__body">
        <span class="settings-toggle__label">Merge bookmarks from all folders</span>
        <span class="settings-toggle__description">
          Display all bookmarks in a single deduplicated grid.
        </span>
      </div>
    </label>

    {#if !settings.mergeAllBookmarks}
      <div class="ungrouped-settings">
        <label class="settings-control">
          <span class="settings-control__label">Folder width</span>
          <input
            type="range"
            min="480"
            max="1860"
            step="20"
            value={settings.folderColumnWidth}
            on:input={(e) => onFolderColumnWidthChange(Number(e.currentTarget.value))}
          />
        </label>

        <label class="settings-toggle">
          <input
            type="checkbox"
            checked={settings.compactFolderHeader}
            on:change={(e) => onCompactHeaderChange(e.currentTarget.checked)}
          />
          <div class="settings-toggle__body">
            <span class="settings-toggle__label">Compact header</span>
            <span class="settings-toggle__description">
              Hide folder path to save space.
            </span>
          </div>
        </label>
      </div>
    {/if}
  </section>

  <section class="settings-group">
    <h3>Experimental</h3>
    <label class="settings-toggle">
      <input
        type="checkbox"
        checked={settings.enableBookmarkSearch}
        on:change={(e) => onSearchToggle(e.currentTarget.checked)}
      />
      <div class="settings-toggle__body">
        <span class="settings-toggle__label">Bookmark search</span>
        <span class="settings-toggle__description">
          Press <kbd>/</kbd> to search bookmarks.
        </span>
      </div>
    </label>
    <label class="settings-toggle">
      <input
        type="checkbox"
        checked={settings.enableTopSites}
        on:change={(e) => onTopSitesToggle(e.currentTarget.checked)}
      />
      <div class="settings-toggle__body">
        <span class="settings-toggle__label">Show frequently visited</span>
        <span class="settings-toggle__description">
          Include your most visited sites alongside bookmarks.
        </span>
      </div>
    </label>
  </section>
</aside>
