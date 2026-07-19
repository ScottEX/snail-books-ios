import { Text } from 'react-native';
import { FONTS } from '../theme';
import { useEffect, useState } from 'react';

/** Red error hint that auto-dismisses after 3000ms. Triggered by bumping `trigger`. */
export default function DateErrorHint({ trigger, message, color, textAlign = 'right' }: {
  trigger: number; message: string; color: string; textAlign?: 'left' | 'right' | 'center';
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger > 0) {
      setShow(true);
      const tm = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(tm);
    } else {
      setShow(false);
    }
  }, [trigger]);
  if (!show) return null;
  return <Text style={{ color, fontSize: FONTS.micro.size, marginTop: 1, textAlign }}>{message}</Text>;
}
