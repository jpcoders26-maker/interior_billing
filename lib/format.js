// Formatting + numeric helpers (safe on client and server)

export const STATES = {
  "27": "Maharashtra", "29": "Karnataka", "07": "Delhi", "24": "Gujarat",
  "33": "Tamil Nadu", "06": "Haryana", "09": "Uttar Pradesh", "36": "Telangana",
};

// round to 2 decimals without binary-float drift (e.g. 1.005 -> 1.01)
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const inr = (n) =>
  "₹" + round2(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const inrShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return "₹" + (v / 1e7).toFixed(2) + " Cr";
  if (v >= 1e5) return "₹" + (v / 1e5).toFixed(2) + " L";
  if (v >= 1e3) return "₹" + (v / 1e3).toFixed(1) + "K";
  return "₹" + v.toFixed(0);
};

export const uid = () => Date.now() + Math.floor(Math.random() * 100000);

export function numToWords(num) {
  num = Math.round(num);
  if (num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n) => (n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : ""));
  const three = (n) => {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? a[h] + " Hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
  };
  let res = "", n = num;
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thou = Math.floor(n / 1e3); n %= 1e3;
  if (crore) res += three(crore) + " Crore ";
  if (lakh) res += two(lakh) + " Lakh ";
  if (thou) res += two(thou) + " Thousand ";
  if (n) res += three(n);
  return res.trim() + " Rupees Only";
}
