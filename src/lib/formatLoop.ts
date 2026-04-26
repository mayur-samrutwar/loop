const formatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export function formatLoop(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${formatter.format(Math.round(safe))} LOOP`;
}
