/** Strip non-numeric characters except '.' */
export const blockNeg = (s: string) => s.replace(/[^0-9.]/g, '');

/** Strip leading zeros — keeps '0' and '0.xxx' intact */
const stripLeadingZeros = (s: string) => s.replace(/^0+(?=\d)/, '');

/** Format decimal input — strip non-numeric, strip leading zeros, prepend '0' if starts with '.', limit to 2 decimal places */
export const fmtDecInput = (s: string) => {
  let clean = blockNeg(s);
  clean = stripLeadingZeros(clean);
  clean = clean.startsWith('.') ? '0' + clean : clean;
  // Limit to 2 decimal places
  const dotIdx = clean.indexOf('.');
  if (dotIdx !== -1 && clean.length > dotIdx + 3) {
    clean = clean.slice(0, dotIdx + 3);
  }
  return clean;
};

/** Round to 2 decimal places, return string (e.g. '123.00') */
export const toDec2 = (v: any) => String((parseFloat(String(v ?? 0)) || 0).toFixed(2));

/** Format input for refund mode — strip leading '-' since UI renders the sign */
export const fmtRefundInput = (v: string, refund: boolean) => {
  if (!refund) return fmtDecInput(v);
  const stripped = v.startsWith('-') ? v.slice(1) : v;
  return fmtDecInput(stripped);
};

/** Format number with thousand separators, always 2 decimal places */
export const toDec2Comma = (v: any) => {
  const n = parseFloat(String(v ?? 0)) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
