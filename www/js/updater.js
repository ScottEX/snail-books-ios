/**
 * Snail Books iOS App — Hot Update Manager
 * Checks server for new frontend version, downloads and caches locally
 */
var Updater = (function() {
  'use strict';

  var LOCAL_VERSION_KEY = 'frontend_version';
  var CACHE_DIR = 'frontend_cache';

  function getCurrentVersion() {
    return localStorage.getItem(LOCAL_VERSION_KEY) || '0';
  }

  function setCurrentVersion(v) {
    localStorage.setItem(LOCAL_VERSION_KEY, v);
  }

  /**
   * Check for updates. Returns:
   *   { hasUpdate: true, version: 'v3' }  if new version available
   *   { hasUpdate: false }                if up to date
   *   { hasUpdate: false, error: '...' }  if check failed (use cached)
   */
  async function check() {
    try {
      var result = await API.getFrontendVersion();
      if (!result.ok) {
        console.log('[Updater] Version check failed:', result.status);
        return { hasUpdate: false, error: 'Server returned ' + result.status };
      }
      var serverVersion = result.data.version;
      var localVersion = getCurrentVersion();
      console.log('[Updater] Local:', localVersion, 'Server:', serverVersion);
      if (serverVersion !== localVersion) {
        return { hasUpdate: true, version: serverVersion };
      }
      return { hasUpdate: false };
    } catch(e) {
      console.log('[Updater] Check error:', e.message);
      return { hasUpdate: false, error: e.message };
    }
  }

  /**
   * Download and apply update. Returns true on success.
   */
  async function download(version) {
    try {
      console.log('[Updater] Downloading version', version);
      var zipUrl = API.getFrontendZip();
      var response = await fetch(zipUrl);
      if (!response.ok) throw new Error('Download failed: ' + response.status);

      var blob = await response.blob();
      console.log('[Updater] Downloaded', (blob.size / 1024).toFixed(0), 'KB');

      // In Capacitor, use FileSystem plugin to save
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
        var Filesystem = window.Capacitor.Plugins.Filesystem;
        // Save to app documents directory
        var base64Data = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: CACHE_DIR + '/frontend-' + version + '.zip',
          data: base64Data,
          directory: 'DOCUMENTS',
          recursive: true
        });
        console.log('[Updater] Saved to Documents/' + CACHE_DIR);
      } else {
        // Fallback for browser testing: save to IndexedDB
        await saveToIndexedDB(version, blob);
      }

      setCurrentVersion(version);
      console.log('[Updater] Update applied: v' + version);
      return true;
    } catch(e) {
      console.error('[Updater] Download failed:', e.message);
      return false;
    }
  }

  function blobToBase64(blob) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function() {
        // Remove data:application/zip;base64, prefix
        var base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function saveToIndexedDB(version, blob) {
    return new Promise(function(resolve, reject) {
      var request = indexedDB.open('SnailBooksCache', 1);
      request.onupgradeneeded = function(e) {
        e.target.result.createObjectStore('frontend', { keyPath: 'version' });
      };
      request.onsuccess = function(e) {
        var db = e.target.result;
        var tx = db.transaction('frontend', 'readwrite');
        tx.objectStore('frontend').put({ version: version, blob: blob, time: Date.now() });
        tx.oncomplete = resolve;
        tx.onerror = reject;
      };
      request.onerror = reject;
    });
  }

  return { check: check, download: download, getCurrentVersion: getCurrentVersion };
})();
