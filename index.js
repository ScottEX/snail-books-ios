// MUST be first — installs localStorage/document/window/navigator shims
// before any module that references them is evaluated.
import './src/globals';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);