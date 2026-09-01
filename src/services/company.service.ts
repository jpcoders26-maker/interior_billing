import { prisma } from "@/lib/server/prisma";
import type { CompanyInput } from "@/lib/validation/company";

const SEED_COMPANY: CompanyInput = {
  name: "Teakworks Interiors & Contracts",
  tagline: "Interior contractors & custom furniture",
  gstin: "27ABCDE1234F1Z5",
  stateCode: "27",
  logo: "",
  address: "Unit 14, Andheri Industrial Estate, Andheri (E), Mumbai 400069",
  phone: "+91 98200 11223",
  email: "billing@teakworks.in",
  bank: { name: "HDFC Bank, Andheri Branch", acc: "50200012345678", ifsc: "HDFC0000123", upi: "teakworks@hdfcbank" },
  terms:
    "1. 50% advance, balance on delivery.\n2. Goods once sold will not be taken back.\n3. Warranty: 12 months on workmanship.\n4. Interest @18% p.a. on overdue payments.",
};

function toClientShape(row: {
  name: string;
  tagline: string | null;
  gstin: string | null;
  stateCode: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAcc: string | null;
  bankIfsc: string | null;
  bankUpi: string | null;
  terms: string | null;
}): CompanyInput {
  return {
    name: row.name,
    tagline: row.tagline ?? "",
    gstin: row.gstin ?? "",
    stateCode: row.stateCode,
    logo: row.logo ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    bank: { name: row.bankName ?? "", acc: row.bankAcc ?? "", ifsc: row.bankIfsc ?? "", upi: row.bankUpi ?? "" },
    terms: row.terms ?? "",
  };
}

export async function getCompany(): Promise<CompanyInput> {
  const row = await prisma.company.findUnique({ where: { id: 1 } });
  if (!row) {
    const created = await prisma.company.create({
      data: {
        id: 1,
        name: SEED_COMPANY.name,
        tagline: SEED_COMPANY.tagline,
        gstin: SEED_COMPANY.gstin,
        stateCode: SEED_COMPANY.stateCode,
        logo: SEED_COMPANY.logo,
        address: SEED_COMPANY.address,
        phone: SEED_COMPANY.phone,
        email: SEED_COMPANY.email,
        bankName: SEED_COMPANY.bank.name,
        bankAcc: SEED_COMPANY.bank.acc,
        bankIfsc: SEED_COMPANY.bank.ifsc,
        bankUpi: SEED_COMPANY.bank.upi,
        terms: SEED_COMPANY.terms,
      },
    });
    return toClientShape(created);
  }
  return toClientShape(row);
}

export async function saveCompany(input: CompanyInput): Promise<CompanyInput> {
  const row = await prisma.company.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: input.name,
      tagline: input.tagline || null,
      gstin: input.gstin || null,
      stateCode: input.stateCode,
      logo: input.logo || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      bankName: input.bank.name || null,
      bankAcc: input.bank.acc || null,
      bankIfsc: input.bank.ifsc || null,
      bankUpi: input.bank.upi || null,
      terms: input.terms || null,
    },
    update: {
      name: input.name,
      tagline: input.tagline || null,
      gstin: input.gstin || null,
      stateCode: input.stateCode,
      logo: input.logo || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      bankName: input.bank.name || null,
      bankAcc: input.bank.acc || null,
      bankIfsc: input.bank.ifsc || null,
      bankUpi: input.bank.upi || null,
      terms: input.terms || null,
    },
  });
  return toClientShape(row);
}
