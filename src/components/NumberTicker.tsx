import { useState, useRef, useEffect } from 'react';
import { Text } from 'react-native';
import { fmtAmt as fmt } from '../utils/format';

/** Smooth number ticker — animates from previous value to target (ease-out cubic). */
export default function NumberTicker({ value, duration = 500, style, formatFn }: {
  value: number; duration?: number; style?: any; formatFn?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const start = Date.now();

    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const fmtFn = formatFn || fmt;
  return <Text style={style}>{fmtFn(display)}</Text>;
}
