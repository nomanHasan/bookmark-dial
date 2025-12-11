# Add UI Controls for Ungrouped View Settings

The goal is to add additional UI controls to the settings panel that allow users to configure the "ungrouped view" (when "Group all folders together" is disabled).

## User Review Required

> [!IMPORTANT]
> The "ungrouped view" refers to the view where folders are displayed in separate sections. The new controls will only be visible/applicable when this view is active (or maybe always visible in settings but only affect that view).

## Proposed Changes

### src

#### [MODIFY] [App.svelte](file:///mnt/Working_Directory/Workspaces/Chrome_Extension_Workspace/bookmark-dial/src/App.svelte)

- Update `DEFAULT_SETTINGS` to include:
    - `folderColumnWidth`: `1040` (number, pixels). Range: 300 to 1600.
    - `showFolderShortcuts`: `true` (boolean).
    - `folderHeaderLayout`: `'default'` (string, enum: 'default', 'swapped').
- Update `mergeStoredPreferences` to handle new settings.
- Update `settings-drawer` HTML:
    - Add a new section or add to "Folders" section.
    - Add a range input for "Folder width".
    - Add a checkbox for "Show shortcuts".
    - Add a control (e.g., segmented control or radios) for "Header layout" (Title first vs Path first).
- Update view logic:
    - Apply `style="max-width: {settings.folderColumnWidth}px"` to `.folder-grid-list`.
    - Wrap the loop for shortcuts in `{#if settings.showFolderShortcuts}`.
    - In `.folder-section__titles`, conditionally render title/path order based on `settings.folderHeaderLayout`.

## Verification Plan

### Manual Verification
1.  Open the extension (or dev server).
2.  Open Settings.
3.  Ensure "Group all folders together" is unchecked (Ungrouped View).
4.  **Test Folder Width**:
    -   Adjust the "Folder width" slider.
    -   Verify that the width of the folder sections changes.
5.  **Test Show Shortcuts**:
    -   Toggle "Show shortcuts" off.
    -   Verify that the grid of bookmarks within each folder disappears, leaving only the header.
    -   Toggle it back on.
6.  **Test Header Layout**:
    -   Change "Header layout" to "Path first".
    -   Verify that the folder path is shown above the folder title.
    -   Change it back to "Title first".
