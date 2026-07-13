const { withAppDelegate, withXcodeProject } = require('@expo/config-plugins');

const TUNNEL_HOST = '8.135.58.90:8081';
const DEV_TEAM = '68ZN52FC44';

/**
 * Inject frp tunnel jsLocation into AppDelegate bundleURL method.
 */
function withTunnelAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    const src = cfg.modResults.contents;

    // Only inject if not already present
    if (src.includes(`setJsLocation:@"${TUNNEL_HOST}"`)) {
      return cfg;
    }

    // Find the bundleURL method's #if DEBUG block and inject tunnel config
    const debugBlock = /(#if DEBUG\n)(\s*return \[\[RCTBundleURLProvider)/;
    if (debugBlock.test(src)) {
      cfg.modResults.contents = src.replace(
        debugBlock,
        `$1  // Default to frp tunnel for remote device development,\n`
        + `  // but respect dev-menu override (shake → Configure Bundler).\n`
        + `  if (![[NSUserDefaults standardUserDefaults] stringForKey:@"RCT_jsLocation"]) {\n`
        + `    [[RCTBundleURLProvider sharedSettings] setJsLocation:@"${TUNNEL_HOST}"];\n`
        + `  }\n`
        + `  $2`
      );
    }

    return cfg;
  });
}

/**
 * Add signing configuration (DEVELOPMENT_TEAM, CODE_SIGN_STYLE, CODE_SIGN_IDENTITY)
 * to all build configurations in the Xcode project.
 */
function withTunnelSigning(config) {
  return withXcodeProject(config, (cfg) => {
    const pbx = cfg.modResults;

    // Find the app target's build configurations and add signing
    const sections = pbx.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(sections)) {
      const settings = sections[key];
      if (settings.buildSettings && settings.buildSettings.PRODUCT_NAME) {
        // This is the app target's build config
        if (!settings.buildSettings.DEVELOPMENT_TEAM) {
          settings.buildSettings.DEVELOPMENT_TEAM = DEV_TEAM;
        }
        if (!settings.buildSettings.CODE_SIGN_STYLE) {
          settings.buildSettings.CODE_SIGN_STYLE = 'Automatic';
        }
        if (!settings.buildSettings.CODE_SIGN_IDENTITY) {
          settings.buildSettings.CODE_SIGN_IDENTITY = 'Apple Development';
        }
      }
    }

    return cfg;
  });
}

module.exports = function withTunnelConfig(config) {
  config = withTunnelAppDelegate(config);
  config = withTunnelSigning(config);
  return config;
};
