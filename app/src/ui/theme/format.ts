const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatDateFr(iso: string): string {
  // iso = "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
