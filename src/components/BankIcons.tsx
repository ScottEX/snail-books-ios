import React from 'react';
import { Image, Platform } from 'react-native';

/**
 * Bank icon components — official bank logo images.
 * Web: native <img> with SVG. Native (iOS/Android): React Native Image with PNG.
 */

type IconProps = { size?: number };

const iconModules: Record<string, any> = {
  icbc:  require('../../assets/bank-icons-png/icbc.png'),
  ccb:   require('../../assets/bank-icons-png/ccb.png'),
  abc:   require('../../assets/bank-icons-png/abc.png'),
  boc:   require('../../assets/bank-icons-png/boc.png'),
  bocom: require('../../assets/bank-icons-png/bocom.png'),
  cmb:   require('../../assets/bank-icons-png/cmb.png'),
  cib:   require('../../assets/bank-icons-png/cib.png'),
  citic: require('../../assets/bank-icons-png/citic.png'),
  ceb:   require('../../assets/bank-icons-png/ceb.png'),
  cmbc:  require('../../assets/bank-icons-png/cmbc.png'),
  pab:   require('../../assets/bank-icons-png/pab.png'),
  spdb:  require('../../assets/bank-icons-png/spdb.png'),
  hxb:   require('../../assets/bank-icons-png/hxb.png'),
  gdb:   require('../../assets/bank-icons-png/gdb.png'),
  bob:   require('../../assets/bank-icons-png/bob.png'),
  bosh:  require('../../assets/bank-icons-png/bosh.png'),
  psbc:  require('../../assets/bank-icons-png/psbc.png'),
};

function getUri(mod: any): string {
  if (!mod) return '';
  if (typeof mod === 'string') return mod;
  if (mod && typeof mod === 'object' && mod.uri) return mod.uri;
  if (mod && typeof mod === 'object' && mod.localUri) return mod.localUri;
  return String(mod);
}

function BankSvgIcon({ code, size = 24 }: { code: string; size?: number }) {
  const mod = iconModules[code];
  if (!mod) return null;

  // Web: browsers natively support SVG in <img>
  if (Platform.OS === 'web') {
    const uri = getUri(mod);
    if (!uri) return null;
    return (
      <img
        src={uri}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    );
  }

  // Native: React Native Image with PNG
  return (
    <Image
      source={mod}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

export function DefaultBankIcon({ size = 24 }: IconProps) {
  const mod = iconModules.icbc;
  if (!mod) return null;
  if (Platform.OS === 'web') {
    const uri = getUri(mod);
    if (!uri) return null;
    return (
      <img
        src={uri}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', opacity: 0.3, display: 'block' }}
      />
    );
  }
  return (
    <Image
      source={mod}
      style={{ width: size, height: size, opacity: 0.3 }}
      resizeMode="contain"
    />
  );
}

export const BANK_ICON_MAP: Record<string, React.FC<IconProps>> = Object.fromEntries(
  Object.keys(iconModules).map(code => [
    code,
    ({ size = 24 }: IconProps) => <BankSvgIcon code={code} size={size} />,
  ])
);
