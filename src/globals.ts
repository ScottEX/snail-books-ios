/**
 * Platform shims install shim (legacy — kept for backwards compat).
 *
 * The actual localStorage/DOMMatrix/window/navigator shims are now installed
 * by ./polyfills/localStorage, which is imported as the very first line of
 * index.js. This module is kept as a no-op side-effect import target so
 * existing imports keep working without breaking.
 *
 * If you need to access the shimmed globals, just use them directly
 * (e.g. `localStorage.getItem('user')`) — the polyfill makes them available
 * globally before any other module evaluates.
 */
export {};