import { useState, useEffect, useCallback } from 'react';

interface UseDateFieldOptions {
  /** Server date context (must have ready + yesterday + isFuture) */
  sd: { ready: boolean; yesterday: string; isFuture: (d: string) => boolean } | null;
  /** Initial date override (defaults to sd.yesterday when ready) */
  initial?: string;
}

/**
 * Encapsulates the date-field triplet used in ExpenseScreen and elsewhere:
 *   value + reset-key + error-flag + server-date initialisation
 */
export function useDateField({ sd, initial }: UseDateFieldOptions) {
  const [value, setValue] = useState(initial ?? '');
  const [key, setKey] = useState(0);   // bump to force DatePicker re-mount
  const [error, setError] = useState(0); // timestamp of last validation error

  // Default to yesterday once server date is available
  useEffect(() => {
    if (sd?.ready && value === '' && !initial) {
      setValue(sd.yesterday);
    }
  }, [sd?.ready, sd?.yesterday, value, initial]);

  const reset = useCallback(() => {
    setValue('');
    setKey(k => k + 1);
    setError(0);
  }, []);

  /** Validate and return true if OK */
  const validate = useCallback((): boolean => {
    if (sd?.isFuture(value)) {
      setError(Date.now());
      return false;
    }
    setError(0);
    return true;
  }, [sd, value]);

  return { value, setValue, key, error, setError, reset, validate };
}
