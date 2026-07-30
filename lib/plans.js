// Subscription plans (mock — no payment gateway)
export const PLANS = [
  { id: "Free Trial", days: 14, price: 0, blurb: "14 days, all features" },
  { id: "Monthly", days: 30, price: 999, blurb: "Billed every month" },
  { id: "Quarterly", days: 90, price: 2699, blurb: "3 months · save 10%" },
  { id: "Six-Month", days: 180, price: 4999, blurb: "6 months · save 16%" },
  { id: "Yearly", days: 365, price: 8999, blurb: "12 months · save 25%" },
];
export const planByName = (name) => PLANS.find((p) => p.id === name) || PLANS[0];
export const daysLeft = (expiresAt) => Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));
export const fmtDate = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Single source of truth for whether a subscription currently grants access.
// Admins are exempt from this check everywhere it's used (see callers) — this
// helper only describes the plan's own state.
export const subStatus = (subscription) => {
  const left = daysLeft(subscription?.expiresAt);
  const expired = subscription?.status !== "active" || left <= 0;
  return { left, expired, active: !expired };
};
