/**
 * Install platform shims (localStorage, document, window, navigator) onto
 * globalThis. Must be imported BEFORE any module that touches these globals,
 * because Hermes strict mode throws ReferenceError on access to undeclared
 * globals (the `typeof x !== 'undefined'` guard is NOT enough).
 *
 * This is loaded as a side-effect import from index.js (the very first line).
 */
import { localStorage, document, window, navigator } from './platform';

if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (g.localStorage === undefined) g.localStorage = localStorage;
  if (g.document === undefined) g.document = document;
  if (g.window === undefined) g.window = window;
  if (g.navigator === undefined) g.navigator = navigator;
}
