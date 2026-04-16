/** Parse decimal string to bigint (wei). */
export function parseWei(s: string): bigint {
  const t = s.trim();
  if (!/^\d+$/.test(t)) throw new Error("Invalid wei string");
  return BigInt(t);
}

export function addWei(a: string, b: string): string {
  return (parseWei(a) + parseWei(b)).toString();
}

export function subWei(a: string, b: string): string {
  const x = parseWei(a) - parseWei(b);
  if (x < 0n) throw new Error("Insufficient balance");
  return x.toString();
}

export function minWei(a: string, b: string): boolean {
  return parseWei(a) < parseWei(b);
}

export function lteWei(a: string, b: string): boolean {
  return parseWei(a) <= parseWei(b);
}
