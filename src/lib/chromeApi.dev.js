/**
 * Bookmark Dial - Development Chrome API
 *
 * This module is used in development builds. It detects whether real Chrome
 * extension APIs are available and falls back to mock APIs for local development.
 */

import { createMockChrome } from "./mockChrome.js";

const realChrome = typeof chrome !== "undefined" ? chrome : null;
const hasRealChrome = Boolean(realChrome?.runtime?.id);

export const chromeApi = hasRealChrome ? realChrome : createMockChrome();
export const isExtensionContext = hasRealChrome;
export const shouldPersistPreferences = Boolean(realChrome?.storage?.local) && hasRealChrome;
export const shouldSyncPreferences = Boolean(realChrome?.storage?.sync) && hasRealChrome;
