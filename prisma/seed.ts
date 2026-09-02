// Reproduces the original in-memory demo dataset (lib/server/store.js) so
// `npm run dev` after a fresh `npm run db:migrate` still starts with the
// same two demo accounts and sample data. Safe to re-run — every write is
// an upsert.
import { PrismaClient, Role, TaxMode, QuoteStatus, InvoiceStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const days = (n: number) => n * 86_400_000;
const now = Date.now();
const dateOnly = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
function todayMinus(n: number): Date {
  const d = new Date(Date.now() - n * 86_400_000);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const [adminHash, userHash] = await Promise.all([argon2.hash("admin123"), argon2.hash("user123")]);

  await prisma.user.upsert({
    where: { userId: "admin" },
    create: { userId: "admin", name: "Admin", email: "admin@teakworks.in", role: Role.ADMIN, active: true, passwordHash: adminHash },
    update: {},
  });
  await prisma.user.upsert({
    where: { userId: "rohit" },
    create: { userId: "rohit", name: "Rohit Sharma", email: "rohit@teakworks.in", role: Role.USER, active: true, passwordHash: userHash },
    update: {},
  });

  await prisma.subscription.upsert({
    where: { id: 1 },
    create: { id: 1, plan: "Free Trial", status: "active", startedAt: new Date(now), expiresAt: new Date(now + days(14)) },
    update: {},
  });

  await prisma.company.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: "Teakworks Interiors & Contracts",
      tagline: "Interior contractors & custom furniture",
      gstin: "27ABCDE1234F1Z5",
      stateCode: "27",
      address: "Unit 14, Andheri Industrial Estate, Andheri (E), Mumbai 400069",
      phone: "+91 98200 11223",
      email: "billing@teakworks.in",
      bankName: "HDFC Bank, Andheri Branch",
      bankAcc: "50200012345678",
      bankIfsc: "HDFC0000123",
      bankUpi: "teakworks@hdfcbank",
      terms:
        "1. 50% advance, balance on delivery.\n2. Goods once sold will not be taken back.\n3. Warranty: 12 months on workmanship.\n4. Interest @18% p.a. on overdue payments.",
    },
    update: {},
  });

  const clients = [
    { id: "C1", name: "Meridian Hospitality Pvt Ltd", contact: "Rahul Mehta", gstin: "27AAACM1234C1Z9", stateCode: "27", phone: "+91 98765 43210", email: "rahul@meridian.in", billing: "Plot 22, BKC, Bandra (E), Mumbai 400051", shipping: "The Meridian Hotel, Powai, Mumbai 400076" },
    { id: "C2", name: "Aakash Residency (Worli 3BHK)", contact: "Sneha Iyer", gstin: null, stateCode: "27", phone: "+91 91234 56789", email: "sneha.iyer@gmail.com", billing: "Flat 1801, Sea Breeze Towers, Worli, Mumbai 400018", shipping: "Same as billing" },
    { id: "C3", name: "Nimbus Tech Offices LLP", contact: "Vikram Rao", gstin: "29AAFCN5678D1Z2", stateCode: "29", phone: "+91 99887 76655", email: "facilities@nimbus.tech", billing: "Prestige Tech Park, Marathahalli, Bengaluru 560103", shipping: "Same as billing" },
  ];
  for (const c of clients) await prisma.client.upsert({ where: { id: c.id }, create: c, update: c });

  const projects = [
    { id: "P1", name: "Meridian Hotel — Lobby & Suites", clientId: "C1", status: "active", progress: 65, start: dateOnly("2025-04-10"), due: dateOnly("2025-08-30"), value: 4250000 },
    { id: "P2", name: "Worli 3BHK Full Interiors", clientId: "C2", status: "planning", progress: 15, start: dateOnly("2025-06-01"), due: dateOnly("2025-10-15"), value: 1850000 },
    { id: "P3", name: "Nimbus Bengaluru — Workstations", clientId: "C3", status: "completed", progress: 100, start: dateOnly("2025-01-05"), due: dateOnly("2025-03-20"), value: 2950000 },
  ];
  for (const p of projects) await prisma.project.upsert({ where: { id: p.id }, create: p, update: p });

  const quote1Rooms = [
    { id: 1, name: "Reception / Lobby", items: [
      { id: 1, desc: "Veneer wall paneling", hsn: "9403", mode: "sqft", length: 12, width: 9, units: 4, rate: 850 },
      { id: 2, desc: "Solid teak reception desk (custom)", hsn: "9403", mode: "direct", amount: 185000 },
    ] },
    { id: 2, name: "Suites (x12)", items: [
      { id: 1, desc: "Suite wardrobes 7ft", hsn: "9403", mode: "qty", qty: 12, unit: "nos", rate: 42000 },
    ] },
  ];
  const quote2Rooms = [
    { id: 1, name: "Master Bedroom", items: [
      { id: 1, desc: "Wardrobe (sliding)", hsn: "9403", mode: "sqft", length: 8, width: 7, units: 1, rate: 1300 },
      { id: 2, desc: "Bed with storage (king)", hsn: "9403", mode: "qty", qty: 1, unit: "nos", rate: 38000 },
    ] },
    { id: 2, name: "Kitchen", items: [
      { id: 1, desc: "Modular kitchen - base + wall units", hsn: "9403", mode: "sqft", length: 10, width: 8, units: 1, rate: 1650 },
    ] },
    { id: 3, name: "Living / Hall", items: [
      { id: 1, desc: "TV unit with storage", hsn: "9403", mode: "direct", amount: 95000 },
      { id: 2, desc: "False ceiling (gypsum)", hsn: "9954", mode: "sqft", length: 14, width: 12, units: 1, rate: 85, gstRate: 18 },
    ] },
  ];

  await prisma.quote.upsert({
    where: { id: "Q1" },
    create: { id: "Q1", number: "QTN/2526/001", taxMode: TaxMode.GST, clientId: "C1", projectId: "P1", date: dateOnly("2025-04-05"), status: QuoteStatus.ACCEPTED, gstRate: 18, discount: 50000, rooms: quote1Rooms },
    update: {},
  });
  await prisma.quote.upsert({
    where: { id: "Q2" },
    create: { id: "Q2", number: "QTN/2526/002", taxMode: TaxMode.GST, clientId: "C2", projectId: "P2", date: dateOnly("2025-06-02"), status: QuoteStatus.SENT, gstRate: 18, discount: 0, rooms: quote2Rooms },
    update: {},
  });

  await prisma.invoice.upsert({
    where: { id: "I1" },
    create: {
      id: "I1", number: "INV/2526/001", docType: "Tax Invoice", taxMode: TaxMode.GST, clientId: "C3", projectId: "P3",
      date: dateOnly("2025-03-22"), dueDate: dateOnly("2025-04-21"), status: InvoiceStatus.PAID, gstRate: 18, discount: 0,
      rooms: [
        { id: 1, name: "Open Office", items: [{ id: 1, desc: "Open-plan workstations (6-seater)", hsn: "9403", mode: "qty", qty: 18, unit: "nos", rate: 88000 }] },
        { id: 2, name: "Meeting Rooms", items: [{ id: 1, desc: "Acoustic partition panels", hsn: "9403", mode: "sqft", length: 8, width: 4, units: 22, rate: 420 }] },
      ],
    },
    update: {},
  });
  await prisma.invoice.upsert({
    where: { id: "I2" },
    create: {
      id: "I2", number: "BOS/2526/001", docType: "Bill of Supply", taxMode: TaxMode.NOGST, clientId: "C2", projectId: "P2",
      date: dateOnly("2025-06-10"), dueDate: dateOnly("2025-07-10"), status: InvoiceStatus.UNPAID, gstRate: 18, discount: 0,
      rooms: [
        { id: 1, name: "Site work", items: [
          { id: 1, desc: "On-site carpentry labour (lump sum)", hsn: "", mode: "direct", amount: 60000 },
          { id: 2, desc: "Polishing & finishing", hsn: "", mode: "qty", qty: 6, unit: "days", rate: 3500 },
        ] },
      ],
    },
    update: {},
  });

  const workers = [
    { id: "W1", name: "Imran Shaikh", skill: "Carpenter (Lead)", phone: "+91 90000 11111", rate: 1400 },
    { id: "W2", name: "Suresh Patil", skill: "Carpenter", phone: "+91 90000 22222", rate: 1100 },
    { id: "W3", name: "Ganesh More", skill: "Polisher", phone: "+91 90000 33333", rate: 1000 },
    { id: "W4", name: "Ramesh Yadav", skill: "Helper", phone: "+91 90000 44444", rate: 750 },
    { id: "W5", name: "Deepak Jain", skill: "Site Supervisor", phone: "+91 90000 55555", rate: 1800 },
  ];
  for (const w of workers) await prisma.worker.upsert({ where: { id: w.id }, create: w, update: w });

  const alloc = [
    { workerId: "W1", projectId: "P1" }, { workerId: "W2", projectId: "P1" },
    { workerId: "W3", projectId: "P1" }, { workerId: "W5", projectId: "P1" },
    { workerId: "W4", projectId: "P2" },
  ];
  for (const a of alloc) await prisma.workerAllocation.upsert({ where: { workerId: a.workerId }, create: a, update: a });

  const attendance = [
    { id: "A1", workerId: "W1", projectId: "P1", date: todayMinus(1), inTime: "09:05", outTime: "18:10" },
    { id: "A2", workerId: "W2", projectId: "P1", date: todayMinus(1), inTime: "09:20", outTime: "18:00" },
    { id: "A3", workerId: "W1", projectId: "P1", date: todayMinus(0), inTime: "09:00", outTime: null },
  ];
  for (const a of attendance) await prisma.attendance.upsert({ where: { id: a.id }, create: a, update: {} });

  const documents = [
    { id: "D1", projectId: "P1", name: "Lobby-final-design-v3.pdf", kind: "Design", sizeLabel: "4.2 MB", date: dateOnly("2025-04-08") },
    { id: "D2", projectId: "P1", name: "Site-measurements.xlsx", kind: "Measurement", sizeLabel: "88 KB", date: dateOnly("2025-04-11") },
    { id: "D3", projectId: "P2", name: "3BHK-layout-draft.png", kind: "Design", sizeLabel: "2.0 MB", date: dateOnly("2025-06-03") },
  ];
  for (const d of documents) await prisma.document.upsert({ where: { id: d.id }, create: d, update: {} });

  const log = [
    { who: "Rohit (user)", action: "Invoice INV/2526/001 marked Paid", at: "22 Mar, 4:10 PM" },
    { who: "Rohit (user)", action: "Quotation QTN/2526/001 accepted by client", at: "10 Apr, 11:02 AM" },
  ];
  const existingLog = await prisma.activityLog.count();
  if (existingLog === 0) {
    for (const entry of log) await prisma.activityLog.create({ data: entry });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
