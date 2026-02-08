# Privacy Policy -- Bookmark Dial

**Effective Date:** February 8, 2026
**Last Updated:** February 8, 2026

---

## 1. Introduction

Bookmark Dial ("the Extension") is a Chrome browser extension that replaces the default new-tab page with a customizable, bookmark-backed visual dial. This privacy policy explains what data the Extension accesses, how that data is used, and the rights you retain over your information.

**The core principle is simple: your data belongs to you.** Bookmark Dial has no server, no backend, no analytics, and no tracking. Every piece of data the Extension touches stays on your device or within your personal Google account's Chrome sync infrastructure.

---

## 2. Developer Information

- **Extension Name:** Bookmark Dial
- **Developer:** Bookmark Dial (Open-Source Project)
- **Source Code:** Publicly available and open source
- **Contact:** nomanbinhossain@gmail.com

---

## 3. Data We Access

The Extension accesses the following categories of data through Chrome's built-in APIs. In every case, the data is processed locally on your device and is never transmitted to any external server.

### 3.1 Bookmarks

| Aspect | Detail |
|---|---|
| **What we access** | Your Chrome bookmark tree (folders, titles, and URLs). |
| **Why** | Bookmarks are the Extension's core content. We read them to display tiles on the new-tab page and write to them when you create, edit, reorder, or remove bookmarks through the dial interface. |
| **Where it goes** | Nowhere. All processing happens inside your browser. Bookmark data is never copied, cached externally, or transmitted by the Extension. Chrome's own sync service may sync bookmarks across your signed-in devices; that is controlled by Google and your Chrome settings, not by this Extension. |

### 3.2 User Preferences (Chrome Storage)

| Aspect | Detail |
|---|---|
| **What we store** | Theme choice, accent colour, gradient selection, selected folder IDs, tile-size settings, display-mode preferences, and similar UI configuration values. |
| **Why** | So your settings persist between sessions and, via Chrome sync, across your devices. |
| **Where it goes** | `chrome.storage.sync` (synced under your Google account) and `chrome.storage.local` (device-only). Both are managed entirely by Chrome's secure storage infrastructure. The Extension does not transmit these values anywhere else. |

### 3.3 Custom Background Images

| Aspect | Detail |
|---|---|
| **What we store** | An optional JPEG or PNG image you upload as a custom background (maximum 10 MB). |
| **Why** | To display your chosen background on the new-tab page. |
| **Where it goes** | Stored in your browser's local IndexedDB database. The image never leaves your device and is not synced across devices. |

### 3.4 Top Sites (Optional)

| Aspect | Detail |
|---|---|
| **What we access** | Chrome's list of your most-visited websites (titles and URLs). |
| **Why** | An optional, disabled-by-default feature that displays your top sites alongside bookmarks. |
| **Where it goes** | Used transiently for on-screen display only. Never stored, cached, or transmitted by the Extension. If you do not enable this feature, the API is never called. |

### 3.5 Favicons

| Aspect | Detail |
|---|---|
| **What we access** | Site icons via Chrome's built-in local favicon service. |
| **Why** | To show recognizable icons on each bookmark tile. |
| **Where it goes** | Favicons are served from Chrome's own local cache. The Extension does not make additional network requests to fetch icons and does not store or transmit favicon data. |

---

## 4. Data We Do NOT Collect

Bookmark Dial **does not** collect, store, process, or transmit any of the following:

- Personally identifiable information (names, email addresses, phone numbers)
- Browsing or search history
- Authentication credentials or passwords
- Financial or payment information
- Health information
- Location data
- Cookies or tracking identifiers
- Analytics, telemetry, or usage statistics
- Any form of user-activity monitoring data
- Web-page content from sites you visit

---

## 5. Third-Party Services

Bookmark Dial uses **zero** third-party services. There are:

- No analytics providers (no Google Analytics, no Mixpanel, no Amplitude)
- No advertising networks
- No crash-reporting services
- No remote APIs or cloud functions
- No external CDN resources
- No server-side components of any kind

The Extension is a fully self-contained, client-side application bundled at build time. All HTML, CSS, and JavaScript run locally from the extension package.

---

## 6. Data Sharing

We do not share your data with anyone. Specifically:

- We do **not** sell user data to third parties, under any circumstances.
- We do **not** transfer user data for purposes unrelated to the Extension's core functionality.
- We do **not** use user data to determine creditworthiness or for lending purposes.
- We do **not** provide user data to data brokers, advertisers, or information resellers.

---

## 7. Data Retention and Deletion

| Data | Retention | How to Delete |
|---|---|---|
| Preferences | Kept until you change them or uninstall the Extension. | Change settings in the Extension or uninstall it. |
| Custom background image | Kept locally until you replace or remove it. | Remove the background in Settings or uninstall the Extension. |
| Bookmarks created via the dial | Managed by Chrome's bookmark system. | Delete them from the Extension's context menu or from Chrome's Bookmark Manager. |

**Uninstalling the Extension** removes data stored by the Extension (`chrome.storage.local`, `chrome.storage.sync` keys, and IndexedDB entries). Chrome handles sync deletion and may take time to propagate across devices.

---

## 8. Security

Bookmark Dial implements the following security measures:

- **Manifest Version 3** -- Chrome's latest and most secure extension architecture.
- **No remote code execution** -- All code is bundled at build time; no `eval()`, `Function()`, or dynamic script loading.
- **No content scripts** -- The Extension does not inject code into any web page.
- **Sandboxed storage** -- IndexedDB, local storage, and sync storage are isolated to the Extension's origin.
- **Minimal permissions** -- We request `bookmarks`, `storage`, `favicon`, and `topSites`. The `topSites` permission supports an optional feature that is disabled by default, and the API is not called unless you enable it.
- **Open source** -- The complete source code is publicly auditable.

---

## 9. Children's Privacy

Bookmark Dial does not knowingly collect any data from anyone, including children under 13. Since the Extension collects no personal information whatsoever, it is compliant with the Children's Online Privacy Protection Act (COPPA) by design.

---

## 10. Changes to This Privacy Policy

If this privacy policy is updated, the changes will be reflected in the "Last Updated" date at the top of this document. Because Bookmark Dial collects no data and has no server, material changes to data practices are not anticipated. Should the Extension's data practices ever change, the updated policy will be published before any new data collection begins.

---

## 11. Your Rights

Because Bookmark Dial stores all data locally on your device and within your Google account's Chrome sync, you maintain full ownership and control at all times. You can:

- **View** your stored preferences by inspecting `chrome.storage` via Chrome DevTools.
- **Modify** any setting at any time through the Extension's Settings drawer.
- **Delete** all Extension data by uninstalling the Extension.
- **Disable sync** by turning off Chrome sync in your browser settings.

No request to a developer is necessary to exercise any of these rights.

---

## 12. Contact

If you have questions or concerns about this privacy policy or the Extension's data practices, please contact:

**nomanbinhossain@gmail.com**

---

*This privacy policy applies solely to the Bookmark Dial Chrome extension and does not cover any external websites linked through bookmarks.*
