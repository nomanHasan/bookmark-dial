/**
 * Bookmark Dial - Production Chrome API
 *
 * This module is used in production builds where the real Chrome extension
 * APIs are always available. It exports the Chrome API directly without
 * any mock fallback, keeping the production bundle lean.
 */

export const chromeApi = chrome;
export const isExtensionContext = true;
export const shouldPersistPreferences = Boolean(chrome?.storage?.local);
export const shouldSyncPreferences = Boolean(chrome?.storage?.sync);
