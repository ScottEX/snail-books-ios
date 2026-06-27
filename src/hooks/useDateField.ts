import { useState, useCallback } from 'react';

/**
 * Date-input field state — wraps a string in yyyy-mm-dd form with helpers
 * for parsing, today-default, and validation against future / range rules.
 */
export function useDateField(initial?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [value, setValue] = useState(initial || today);

  const set = useCallback((v: string) => setValue(v || today), [today]);
  const isFuture = useCallback((v: string = value) => v > today, [value, today]);
  const isValid = useCallback((v: string = value) => /^\d{4}-\d{2}-\d{2}$/.test(v), [value]);

  return { value, setValue: set, isFuture, isValid, today } as const;
}
