import React from 'react';
import { Image, Platform } from 'react-native';
import { SvgUri } from 'react-native-svg';

/**
 * Bank icon components — official SVG logos.
 */

type IconProps = { size?: number };

// require() on Expo web returns the URL string; on native returns { uri }
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
  // On web: require() returns string URL
  if (typeof mod === 'string') return mod;
  // On native: require() returns { uri: string, ... }
  if (mod && typeof mod === 'object' && mod.uri) return mod.uri;
  // Expo Asset returns { localUri, uri }
  if (mod && typeof mod === 'object' && mod.localUri) return mod.localUri;
  // Try Image.resolveAssetSource
  try {
    const r = Image.resolveAssetSource(mod);
    if (r && r.uri) return r.uri;
  } catch {}
  return String(mod);
}

function BankSvgIcon({ code, size = 24 }: { code: string; size?: number }) {
  const mod = iconModules[code];
  if (!mod) return null;
  const uri = getUri(mod);
  if (!uri) return null;

  // Web: browsers natively support SVG in <img>
  if (Platform.OS === 'web') {
    return (
      <img
        src={uri}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    );
  }

  return <SvgUri width={size} height={size} uri={uri} />;
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
  return <SvgUri width={size} height={size} uri={uri} opacity={0.3} />;
}

export const BANK_ICON_MAP: Record<string, React.FC<IconProps>> = Object.fromEntries(
  Object.keys(iconModules).map(code => [
    code,
    ({ size = 24 }: IconProps) => <BankSvgIcon code={code} size={size} />,
  ])
);
