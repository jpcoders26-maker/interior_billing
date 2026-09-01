import { describe, expect, it } from "vitest";
import { documentSchema, ALLOWED_MIME_TYPES } from "@/lib/validation/documents";
import { clientSchema } from "@/lib/validation/clients";
import { lineItemSchema, roomsSchema } from "@/lib/validation/billing-doc";
import { quoteSchema } from "@/lib/validation/quotes";
import { upsertUserSchema } from "@/lib/validation/users";

const pngDataUrl = (byteLength: number) => {
  const bytes = Buffer.alloc(byteLength, 1);
  return `data:image/png;base64,${bytes.toString("base64")}`;
};

describe("documentSchema (file upload hardening)", () => {
  it("accepts an allowlisted MIME type under the size cap", () => {
    const result = documentSchema.safeParse({
      id: "D1",
      projectId: "P1",
      name: "photo.png",
      kind: "Image",
      dataUrl: pngDataUrl(1024),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a disallowed MIME type (e.g. text/html — the stored-XSS vector)", () => {
    const bytes = Buffer.from("<script>alert(1)</script>");
    const result = documentSchema.safeParse({
      id: "D2",
      projectId: "P1",
      name: "innocent.html",
      dataUrl: `data:text/html;base64,${bytes.toString("base64")}`,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a file over the 8MB cap", () => {
    const result = documentSchema.safeParse({
      id: "D3",
      projectId: "P1",
      name: "huge.png",
      dataUrl: pngDataUrl(9 * 1024 * 1024),
    });
    expect(result.success).toBe(false);
  });

  it("strips path components from the filename", () => {
    const result = documentSchema.safeParse({
      id: "D4",
      projectId: "P1",
      name: "../../etc/passwd",
      dataUrl: pngDataUrl(10),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("passwd");
  });

  it("the allowlist excludes html/svg/script content types", () => {
    expect(ALLOWED_MIME_TYPES.has("text/html")).toBe(false);
    expect(ALLOWED_MIME_TYPES.has("image/svg+xml")).toBe(false);
    expect(ALLOWED_MIME_TYPES.has("application/javascript")).toBe(false);
  });
});

describe("clientSchema", () => {
  it("accepts a blank GSTIN (B2C / unregistered)", () => {
    expect(clientSchema.safeParse({ id: "C1", name: "Acme", stateCode: "27", gstin: "" }).success).toBe(true);
  });

  it("rejects a malformed GSTIN", () => {
    expect(clientSchema.safeParse({ id: "C1", name: "Acme", stateCode: "27", gstin: "not-a-gstin" }).success).toBe(false);
  });

  it("accepts a well-formed 15-char GSTIN", () => {
    expect(
      clientSchema.safeParse({ id: "C1", name: "Acme", stateCode: "27", gstin: "27AAACM1234C1Z9" }).success
    ).toBe(true);
  });
});

describe("billing-doc line items (discriminated by mode)", () => {
  it("validates a sqft item", () => {
    expect(
      lineItemSchema.safeParse({ id: 1, desc: "Wardrobe", hsn: "9403", mode: "sqft", length: 8, width: 7, units: 1, rate: 1300 })
        .success
    ).toBe(true);
  });

  it("validates a qty item", () => {
    expect(lineItemSchema.safeParse({ id: 1, mode: "qty", qty: 2, unit: "nos", rate: 500 }).success).toBe(true);
  });

  it("validates a direct item", () => {
    expect(lineItemSchema.safeParse({ id: 1, mode: "direct", amount: 25000 }).success).toBe(true);
  });

  it("rejects an item missing the fields its mode requires", () => {
    // sqft mode without length/width/rate
    expect(lineItemSchema.safeParse({ id: 1, mode: "sqft", desc: "x" }).success).toBe(false);
  });

  it("rejects an unknown mode", () => {
    expect(lineItemSchema.safeParse({ id: 1, mode: "percentage", amount: 10 }).success).toBe(false);
  });

  it("rejects negative rates/amounts", () => {
    expect(lineItemSchema.safeParse({ id: 1, mode: "direct", amount: -5 }).success).toBe(false);
  });

  it("caps room and item counts", () => {
    const tooManyRooms = Array.from({ length: 201 }, (_, i) => ({ id: i, name: `Room ${i}`, items: [] }));
    expect(roomsSchema.safeParse(tooManyRooms).success).toBe(false);
  });
});

describe("quoteSchema", () => {
  it("transforms a YYYY-MM-DD date string to a Date", () => {
    const result = quoteSchema.safeParse({
      id: "Q1",
      number: "QTN/2526/001",
      clientId: "C1",
      date: "2025-04-05",
      rooms: [],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.date).toBeInstanceOf(Date);
  });

  it("rejects a malformed date", () => {
    expect(
      quoteSchema.safeParse({ id: "Q1", number: "QTN/2526/001", clientId: "C1", date: "05/04/2025", rooms: [] }).success
    ).toBe(false);
  });
});

describe("upsertUserSchema", () => {
  it("rejects a userId with disallowed characters", () => {
    expect(upsertUserSchema.safeParse({ userId: "admin; drop table users", name: "Admin" }).success).toBe(false);
  });

  it("accepts a normal userId", () => {
    expect(upsertUserSchema.safeParse({ userId: "rohit.sharma", name: "Rohit" }).success).toBe(true);
  });
});
