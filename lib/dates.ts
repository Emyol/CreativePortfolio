const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Formats YYYY, YYYY-MM or YYYY-MM-DD without timezone shifts. */
export function formatDate(date: string): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(date);
  if (!m) throw new Error(`Bad date "${date}"`);
  const [, y, mo, d] = m;
  if (!mo) return y;
  const month = Number(mo);
  if (month < 1 || month > 12) throw new Error(`Bad month in "${date}"`);
  if (!d) return `${MONTHS[month - 1]} ${y}`;
  const day = Number(d);
  const last = new Date(Date.UTC(Number(y), month, 0)).getUTCDate();
  if (day < 1 || day > last) throw new Error(`Bad day in "${date}"`);
  return `${day} ${MONTHS[month - 1]} ${y}`;
}
