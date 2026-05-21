// Pointy-top hex math, shared between arena + cluster components.
export const HEX_W = 62;
export const HEX_H = (HEX_W * 2) / Math.sqrt(3);

export function axialToPixel(q: number, r: number) {
  return { x: HEX_W * (q + r / 2), y: ((HEX_W * Math.sqrt(3)) / 2) * r };
}
