// In-memory data store + users (single Node process).
// Swap for a database (Postgres/Prisma) in production — the API surface stays the same.
import bcrypt from "bcryptjs";
import { uid } from "../format.js";

const now = Date.now();
const days = (n) => n * 86400000;

const seed = () => ({
  // --- users (managed only via the admin /api/users endpoint) ---
  users: [
    { id: "U1", userId: "admin", name: "Admin", email: "admin@teakworks.in", role: "admin", active: true, hash: bcrypt.hashSync("admin123", 10) },
    { id: "U2", userId: "rohit", name: "Rohit Sharma", email: "rohit@teakworks.in", role: "user", active: true, hash: bcrypt.hashSync("user123", 10) },
  ],

  // --- subscription (mock; no payment gateway) ---
  subscription: { plan: "Free Trial", status: "active", startedAt: now, expiresAt: now + days(14) },

  company: {
    name: "Teakworks Interiors & Contracts",
    tagline: "Interior contractors & custom furniture",
    gstin: "27ABCDE1234F1Z5", stateCode: "27", logo: "",
    address: "Unit 14, Andheri Industrial Estate, Andheri (E), Mumbai 400069",
    phone: "+91 98200 11223", email: "billing@teakworks.in",
    bank: { name: "HDFC Bank, Andheri Branch", acc: "50200012345678", ifsc: "HDFC0000123", upi: "teakworks@hdfcbank" },
    terms: "1. 50% advance, balance on delivery.\n2. Goods once sold will not be taken back.\n3. Warranty: 12 months on workmanship.\n4. Interest @18% p.a. on overdue payments.",
  },
  clients: [
    { id: "C1", name: "Meridian Hospitality Pvt Ltd", contact: "Rahul Mehta", gstin: "27AAACM1234C1Z9", stateCode: "27", phone: "+91 98765 43210", email: "rahul@meridian.in", billing: "Plot 22, BKC, Bandra (E), Mumbai 400051", shipping: "The Meridian Hotel, Powai, Mumbai 400076" },
    { id: "C2", name: "Aakash Residency (Worli 3BHK)", contact: "Sneha Iyer", gstin: "", stateCode: "27", phone: "+91 91234 56789", email: "sneha.iyer@gmail.com", billing: "Flat 1801, Sea Breeze Towers, Worli, Mumbai 400018", shipping: "Same as billing" },
    { id: "C3", name: "Nimbus Tech Offices LLP", contact: "Vikram Rao", gstin: "29AAFCN5678D1Z2", stateCode: "29", phone: "+91 99887 76655", email: "facilities@nimbus.tech", billing: "Prestige Tech Park, Marathahalli, Bengaluru 560103", shipping: "Same as billing" },
  ],
  projects: [
    { id: "P1", name: "Meridian Hotel — Lobby & Suites", clientId: "C1", status: "active", progress: 65, start: "2025-04-10", due: "2025-08-30", value: 4250000 },
    { id: "P2", name: "Worli 3BHK Full Interiors", clientId: "C2", status: "planning", progress: 15, start: "2025-06-01", due: "2025-10-15", value: 1850000 },
    { id: "P3", name: "Nimbus Bengaluru — Workstations", clientId: "C3", status: "completed", progress: 100, start: "2025-01-05", due: "2025-03-20", value: 2950000 },
  ],
  quotes: [
    { id: "Q1", number: "QTN/2526/001", taxMode: "gst", clientId: "C1", projectId: "P1", date: "2025-04-05", status: "accepted", gstRate: 18, discount: 50000, rooms: [
      { id: 1, name: "Reception / Lobby", items: [
        { id: 1, desc: "Veneer wall paneling", hsn: "9403", mode: "sqft", length: 12, width: 9, units: 4, rate: 850 },
        { id: 2, desc: "Solid teak reception desk (custom)", hsn: "9403", mode: "direct", amount: 185000 } ] },
      { id: 2, name: "Suites (x12)", items: [
        { id: 1, desc: "Suite wardrobes 7ft", hsn: "9403", mode: "qty", qty: 12, unit: "nos", rate: 42000 } ] } ] },
    { id: "Q2", number: "QTN/2526/002", taxMode: "gst", clientId: "C2", projectId: "P2", date: "2025-06-02", status: "sent", gstRate: 18, discount: 0, rooms: [
      { id: 1, name: "Master Bedroom", items: [
        { id: 1, desc: "Wardrobe (sliding)", hsn: "9403", mode: "sqft", length: 8, width: 7, units: 1, rate: 1300 },
        { id: 2, desc: "Bed with storage (king)", hsn: "9403", mode: "qty", qty: 1, unit: "nos", rate: 38000 } ] },
      { id: 2, name: "Kitchen", items: [
        { id: 1, desc: "Modular kitchen - base + wall units", hsn: "9403", mode: "sqft", length: 10, width: 8, units: 1, rate: 1650 } ] },
      { id: 3, name: "Living / Hall", items: [
        { id: 1, desc: "TV unit with storage", hsn: "9403", mode: "direct", amount: 95000 },
        { id: 2, desc: "False ceiling (gypsum)", hsn: "9954", mode: "sqft", length: 14, width: 12, units: 1, rate: 85, gstRate: 18 } ] } ] },
  ],
  invoices: [
    { id: "I1", number: "INV/2526/001", docType: "Tax Invoice", taxMode: "gst", clientId: "C3", projectId: "P3", date: "2025-03-22", due: "2025-04-21", status: "paid", gstRate: 18, discount: 0, rooms: [
      { id: 1, name: "Open Office", items: [
        { id: 1, desc: "Open-plan workstations (6-seater)", hsn: "9403", mode: "qty", qty: 18, unit: "nos", rate: 88000 } ] },
      { id: 2, name: "Meeting Rooms", items: [
        { id: 1, desc: "Acoustic partition panels", hsn: "9403", mode: "sqft", length: 8, width: 4, units: 22, rate: 420 } ] } ] },
    { id: "I2", number: "BOS/2526/001", docType: "Bill of Supply", taxMode: "nogst", clientId: "C2", projectId: "P2", date: "2025-06-10", due: "2025-07-10", status: "unpaid", discount: 0, rooms: [
      { id: 1, name: "Site work", items: [
        { id: 1, desc: "On-site carpentry labour (lump sum)", hsn: "", mode: "direct", amount: 60000 },
        { id: 2, desc: "Polishing & finishing", hsn: "", mode: "qty", qty: 6, unit: "days", rate: 3500 } ] } ] },
  ],
  workers: [
    { id: "W1", name: "Imran Shaikh", skill: "Carpenter (Lead)", phone: "+91 90000 11111", rate: 1400 },
    { id: "W2", name: "Suresh Patil", skill: "Carpenter", phone: "+91 90000 22222", rate: 1100 },
    { id: "W3", name: "Ganesh More", skill: "Polisher", phone: "+91 90000 33333", rate: 1000 },
    { id: "W4", name: "Ramesh Yadav", skill: "Helper", phone: "+91 90000 44444", rate: 750 },
    { id: "W5", name: "Deepak Jain", skill: "Site Supervisor", phone: "+91 90000 55555", rate: 1800 },
  ],
  alloc: [
    { workerId: "W1", projectId: "P1" }, { workerId: "W2", projectId: "P1" },
    { workerId: "W3", projectId: "P1" }, { workerId: "W5", projectId: "P1" },
    { workerId: "W4", projectId: "P2" },
  ],
  // attendance: check-in / check-out per worker per day
  attendance: [
    { id: "A1", workerId: "W1", date: todayMinus(1), inTime: "09:05", outTime: "18:10" },
    { id: "A2", workerId: "W2", date: todayMinus(1), inTime: "09:20", outTime: "18:00" },
    { id: "A3", workerId: "W1", date: todayMinus(0), inTime: "09:00", outTime: "" },
  ],
  documents: [
    { id: "D1", projectId: "P1", name: "Lobby-final-design-v3.pdf", kind: "Design", size: "4.2 MB", date: "2025-04-08" },
    { id: "D2", projectId: "P1", name: "Site-measurements.xlsx", kind: "Measurement", size: "88 KB", date: "2025-04-11" },
    { id: "D3", projectId: "P2", name: "3BHK-layout-draft.png", kind: "Design", size: "2.0 MB", date: "2025-06-03" },
  ],
  log: [
    { who: "Rohit (user)", action: "Invoice INV/2526/001 marked Paid", at: "22 Mar, 4:10 PM" },
    { who: "Rohit (user)", action: "Quotation QTN/2526/001 accepted by client", at: "10 Apr, 11:02 AM" },
  ],
});

function todayMinus(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

// one instance across dev hot-reloads
const g = globalThis;
if (!g.__TW_STORE__) g.__TW_STORE__ = seed();
export const STORE = g.__TW_STORE__;

// data slices the client may persist via PUT /api/state/[key]
export const STATE_KEYS = ["company", "clients", "projects", "quotes", "invoices", "workers", "alloc", "documents", "log", "subscription", "attendance"];

export function findUser(idOrEmail) {
  const q = String(idOrEmail || "").toLowerCase();
  return STORE.users.find((u) => u.userId.toLowerCase() === q || u.email.toLowerCase() === q);
}
export function publicUser(u) {
  return { id: u.id, userId: u.userId, name: u.name, email: u.email, role: u.role, active: u.active };
}
export function upsertUser(input) {
  const existing = STORE.users.find((u) => u.id === input.id);
  if (existing) {
    existing.userId = input.userId ?? existing.userId;
    existing.name = input.name ?? existing.name;
    existing.email = input.email ?? existing.email;
    existing.role = input.role ?? existing.role;
    if (typeof input.active === "boolean") existing.active = input.active;
    if (input.password) existing.hash = bcrypt.hashSync(String(input.password), 10);
    return existing;
  }
  const u = {
    id: "U" + uid(), userId: input.userId, name: input.name, email: input.email || "",
    role: input.role === "admin" ? "admin" : "user", active: input.active !== false,
    hash: bcrypt.hashSync(String(input.password || "changeme123"), 10),
  };
  STORE.users.push(u);
  return u;
}
