export type Forecast = { city: string; highC: number; lowC: number; summary: string };

export function toFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function describe(f: Forecast): string {
  return `${f.city}: ${f.summary}, ${toFahrenheit(f.highC)}°F / ${toFahrenheit(f.lowC)}°F`;
}
