import React, { useState, useEffect } from 'react';
import { Image, Platform, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

/**
 * Bank icon components — official SVG logos.
 * Uses SvgXml on native (iOS/Android) for better compatibility with
 * complex Inkscape-generated SVGs; falls back to <img> on web.
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
  if (typeof mod === 'string') return mod;
  if (mod && typeof mod === 'object' && mod.uri) return mod.uri;
  if (mod && typeof mod === 'object' && mod.localUri) return mod.localUri;
  try {
    const r = Image.resolveAssetSource(mod);
    if (r && r.uri) return r.uri;
  } catch {}
  return String(mod);
}

// ── SVG content cache (fetch once per URI) ──────────────────────────
const svgCache: Record<string, string> = {};
const pendingFetches: Record<string, Promise<string>> = {};

function useSvgContent(uri: string): string | null {
  const [content, setContent] = useState<string | null>(
    () => svgCache[uri] || null,
  );

  useEffect(() => {
    if (!uri || svgCache[uri]) return;
    // Deduplicate concurrent fetches for the same URI
    if (pendingFetches[uri]) {
      let cancelled = false;
      pendingFetches[uri].then((text) => {
        if (!cancelled) setContent(text);
      });
      return () => { cancelled = true; };
    }

    let cancelled = false;
    const promise = fetch(uri)
      .then((r) => r.text())
      .then((text) => {
        svgCache[uri] = text;
        delete pendingFetches[uri];
        if (!cancelled) setContent(text);
        return text;
      })
      .catch(() => {
        delete pendingFetches[uri];
      });

    pendingFetches[uri] = promise;
    return () => { cancelled = true; };
  }, [uri]);

  return content;
}

// ── Bank icon component ─────────────────────────────────────────────

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

  // Native: fetch SVG text → SvgXml (handles complex SVGs better than SvgUri)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const svgContent = useSvgContent(uri);
  if (!svgContent) {
    return <View style={{ width: size, height: size }} />;
  }
  return <SvgXml xml={svgContent} width={size} height={size} />;
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const svgContent = useSvgContent(uri);
  if (!svgContent) {
    return <View style={{ width: size, height: size }} />;
  }
  return <SvgXml xml={svgContent} width={size} height={size} opacity={0.3} />;
}

export const BANK_ICON_MAP: Record<string, React.FC<IconProps>> = Object.fromEntries(
  Object.keys(iconModules).map((code) => [
    code,
    ({ size = 24 }: IconProps) => <BankSvgIcon code={code} size={size} />,
  ]),
);
