export function parseAnswer(input) {
  const value = String(input ?? '').trim().replace(/[−–]/g, '-').replace(/,/g, '.');
  if (!value || value.length > 100) return null;
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  if (new RegExp(`^${number}$`).test(value)) {
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }
  const mixed = value.match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const [, sign, whole, numerator, denominator] = mixed;
    if (Number(denominator) === 0 || Number(numerator) >= Number(denominator)) return null;
    const result = (Number(whole) + Number(numerator) / Number(denominator)) * (sign === '-' ? -1 : 1);
    return Number.isFinite(result) ? result : null;
  }
  const fraction = value.match(new RegExp(`^(${number})\\s*\\/\\s*(${number})$`));
  if (!fraction || Number(fraction[2]) === 0) return null;
  const result = Number(fraction[1]) / Number(fraction[2]);
  return Number.isFinite(result) ? result : null;
}

export function isCorrect(input, [numerator, denominator]) {
  const parsed = parseAnswer(input);
  if (parsed === null || denominator === 0) return false;
  const expected = numerator / denominator;
  return Math.abs(parsed - expected) <= 1e-9 * Math.max(1, Math.abs(expected));
}
