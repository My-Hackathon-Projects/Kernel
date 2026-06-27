import { ensurePlaywrightBrowsersPath } from "./env-loader.js";

// Resolve the browser cache before any module imports Playwright, since
// Playwright reads PLAYWRIGHT_BROWSERS_PATH when its registry is first loaded.
ensurePlaywrightBrowsersPath();
