export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof typeof radius;
