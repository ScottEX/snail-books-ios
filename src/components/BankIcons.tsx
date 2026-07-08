import React from 'react';
import { Image as RNImage, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

/**
 * Bank icon components — official SVG logos.
 * Uses expo-image on native (iOS/Android) for full SVG support;
 * falls back to native <img> on web.
 *
 * react-native-svg (SvgUri / SvgXml) cannot render complex
 * Inkscape-generated SVGs correctly (e.g. CMB shows only the red
 * circle). expo-image uses the platform's native image pipeline
 * which handles these SVGs just like a browser does.
 */

type IconProps = { size?: number };

const iconModules: Record<string, any> = {
  icbc:  require('../../assets/bank-icons/icbc.svg'),
  ccb:   require('../../assets/bank-icons/ccb.svg'),
  abc:   require('../../assets/bank-icons/abc.svg'),
  boc:   require('../../assets/bank-icons/boc.svg'),
  bocom: require('../../assets/bank-icons/bocom.svg'),
  cmb:   require('../../assets/bank-icons/cmb.svg'),
  cib:   require('../../assets/bank-icons/cib.svg'),
  citic: require('../../assets/bank-icons/citic.svg'),
  ceb:   require('../../assets/bank-icons/ceb.svg'),
  cmbc:  require('../../assets/bank-icons/cmbc.svg'),
  pab:   require('../../assets/bank-icons/pab.svg'),
  spdb:  require('../../assets/bank-icons/spdb.svg'),
  hxb:   require('../../assets/bank-icons/hxb.svg'),
  gdb:   require('../../assets/bank-icons/gdb.svg'),
  bob:   require('../../assets/bank-icons/bob.svg'),
  bosh:  require('../../assets/bank-icons/bosh.svg'),
  psbc:  require('../../assets/bank-icons/psbc.svg'),
};

function getUri(mod: any): string {
  if (!mod) return '';
  if (typeof mod === 'string') return mod;
  if (mod && typeof mod === 'object' && mod.uri) return mod.uri;
  if (mod && typeof mod === 'object' && mod.localUri) return mod.localUri;
  try {
    const r = RNImage.resolveAssetSource(mod);
    if (r && r.uri) return r.uri;
  } catch {}
  return String(mod);
}

function BankSvgIcon({ code, size = 24 }: { code: string; size?: number }) {
  const mod = iconModules[code];
  if (!mod) return null;
  const uri = getUri(mod);
  if (!uri) return null;

  if (Platform.OS === 'web') {
    return (
      <img
        src={uri}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

export function DefaultBankIcon({ size = 24 }: IconProps) {
  const uri = getUri(iconModules.icbc);
  if (!uri) return null;
  if (Platform.OS === 'web') {
    return (
      <img
        src={uri}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', opacity: 0.3, display: 'block' }}
      />
    );
  }
  return (
    <ExpoImage
      source={{ uri }}
      style={{ width: size, height: size, opacity: 0.3 }}
      contentFit="contain"
    />
  );
}

export const BANK_ICON_MAP: Record<string, React.FC<IconProps>> = Object.fromEntries(
  Object.keys(iconModules).map((code) => [
    code,
    ({ size = 24 }: IconProps) => <BankSvgIcon code={code} size={size} />,
  ]),
);
