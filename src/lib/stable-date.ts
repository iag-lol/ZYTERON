const SHORT_MONTHS_ES_CL = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getDateParts(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, monthIndex: month - 1, day };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getUTCFullYear(),
    monthIndex: parsed.getUTCMonth(),
    day: parsed.getUTCDate(),
  };
}

export function formatStableDateEsCl(value?: string | null, fallback = "Reciente") {
  const parts = getDateParts(value);
  if (!parts) return fallback;
  const month = SHORT_MONTHS_ES_CL[parts.monthIndex] ?? "";
  return `${pad2(parts.day)} ${month} ${parts.year}`;
}

