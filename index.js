// MUST be first — installs localStorage/DOMMatrix/window/navigator shims
// before any module that references them is evaluated. The shims are
// needed because the app's source code (and 3rd-party libs like
// recharts/react-pdf) reference browser APIs that don't exist in Hermes.
import './src/polyfills/localStorage';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);