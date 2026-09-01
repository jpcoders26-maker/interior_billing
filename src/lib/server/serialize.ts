// The client's persisted-state contract predates the database: dates travel
// as plain "YYYY-MM-DD" strings (bound straight to <input type="date">) and
// the subscription's timestamps travel as epoch milliseconds (Date.now()).
// Prisma gives back JS Date objects / Decimal instances; these helpers
// convert back to exactly the shapes the existing frontend already expects,
// so nothing in components/** needs to change.
export const toDateOnly = (d: Date | null | undefined): string => (d ? d.toISOString().slice(0, 10) : "");
export const toEpochMs = (d: Date): number => d.getTime();
export const toNum = (d: unknown): number => (d === null || d === undefined ? 0 : Number(d));
export const toNumOrNull = (d: unknown): number | null => (d === null || d === undefined ? null : Number(d));
