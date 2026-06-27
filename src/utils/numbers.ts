/** Strip non-numeric characters except '.' */
export const blockNeg = (s: string) => s.replace(/[^0-9.]/g, '');

/** Strip leading zeros — keeps '0' and '0.xxx' intact */
const stripLeadingZeros = (s: string) => s.replace(/^0+(?=\d)/, '');

/** Format decimal input — strip non-numeric, strip leading zeros, prepend '0' if starts with '.' */
export const fmtDecInput = (s: string) => {
  let clean = blockNeg(s);
  clean = stripLeadingZeros(clean);
  return clean.startsWith('.') ? '0' + clean : clean;
};

/** Round to 2 decimal places, return string (e.g. '123.00') */
export const toDec2 = (v: any) => String((parseFloat(String(v ?? 0)) || 0).toFixed(2));

/** Format number with thousand separators, always 2 decimal places */
export const toDec2Comma = (v: any) => {
  const n = parseFloat(String(v ?? 0)) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
