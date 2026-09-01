import { describe, it, expect } from "vitest";
import { lineAmount, docTotals } from "./billing.js";
import { round2 } from "./format.js";

const company = { stateCode: "27" };
const mh = { stateCode: "27" };       // intra-state (Maharashtra)
const ka = { stateCode: "29" };       // inter-state (Karnataka)

describe("lineAmount", () => {
  it("sqft = length x width x units x rate", () => {
    expect(lineAmount({ mode: "sqft", length: 10, width: 8, units: 1, rate: 1650 }).amount).toBe(132000);
  });
  it("sqft multiplies units", () => {
    expect(lineAmount({ mode: "sqft", length: 12, width: 9, units: 4, rate: 850 }).amount).toBe(367200);
  });
  it("qty = quantity x rate", () => {
    expect(lineAmount({ mode: "qty", qty: 12, rate: 42000 }).amount).toBe(504000);
  });
  it("direct = lump sum", () => {
    expect(lineAmount({ mode: "direct", amount: 185000 }).amount).toBe(185000);
  });
  it("rounds the displayed area to 2dp first, so printed area x rate reconciles", () => {
    // 3.33 x 3.33 = 11.0889 -> shown as 11.09 sq.ft -> 11.09 x 100 = 1109
    const li = lineAmount({ mode: "sqft", length: 3.33, width: 3.33, units: 1, rate: 100 });
    expect(li.qty).toBe(11.09);
    expect(li.amount).toBe(1109);
  });
});

describe("docTotals — single rate, intra-state (CGST+SGST)", () => {
  const doc = { gstRate: 18, discount: 0, rooms: [
    { id: 1, items: [{ id: 1, hsn: "9403", mode: "direct", amount: 100000 }] },
  ]};
  const t = docTotals(doc, company, mh);
  it("taxable", () => expect(t.taxable).toBe(100000));
  it("cgst = sgst = 9%", () => { expect(t.cgst).toBe(9000); expect(t.sgst).toBe(9000); });
  it("no igst intra-state", () => expect(t.igst).toBe(0));
  it("grand total", () => expect(t.grand).toBe(118000));
  it("cgst+sgst+igst == totalTax", () => expect(round2(t.cgst + t.sgst + t.igst)).toBe(t.totalTax));
});

describe("docTotals — inter-state uses IGST", () => {
  const doc = { gstRate: 18, discount: 0, rooms: [
    { id: 1, items: [{ id: 1, hsn: "9403", mode: "direct", amount: 100000 }] },
  ]};
  const t = docTotals(doc, company, ka);
  it("igst = 18%", () => expect(t.igst).toBe(18000));
  it("no cgst/sgst", () => { expect(t.cgst).toBe(0); expect(t.sgst).toBe(0); });
  it("grand total", () => expect(t.grand).toBe(118000));
});

describe("docTotals — mixed GST rates reconcile with HSN summary", () => {
  const doc = { gstRate: 18, discount: 0, rooms: [
    { id: 1, items: [
      { id: 1, hsn: "9403", mode: "direct", amount: 100000 },              // 18%
      { id: 2, hsn: "9954", mode: "direct", amount: 50000, gstRate: 12 },  // 12%
    ]},
  ]};
  const t = docTotals(doc, company, mh);
  it("subtotal", () => expect(t.subtotal).toBe(150000));
  it("HSN summary tax sum == totalTax", () => {
    const sum = round2(t.hsnSummary.reduce((s, h) => s + h.tax, 0));
    expect(sum).toBe(t.totalTax);
  });
  it("totalTax = 18000 + 6000", () => expect(t.totalTax).toBe(24000));
  it("grand = 174000", () => expect(t.grand).toBe(174000));
});

describe("docTotals — discount distributed, parts sum exactly", () => {
  const doc = { gstRate: 18, discount: 50000, rooms: [
    { id: 1, items: [
      { id: 1, hsn: "9403", mode: "direct", amount: 367200 },
      { id: 2, hsn: "9403", mode: "direct", amount: 185000 },
      { id: 3, hsn: "9403", mode: "qty", qty: 12, rate: 42000 }, // 504000
    ]},
  ]};
  const t = docTotals(doc, company, mh);
  it("subtotal", () => expect(t.subtotal).toBe(1056200));
  it("taxable = subtotal - discount", () => expect(t.taxable).toBe(1006200));
  it("HSN taxable sum == doc taxable", () => {
    const sum = round2(t.hsnSummary.reduce((s, h) => s + h.taxable, 0));
    expect(sum).toBe(t.taxable);
  });
  it("cgst+sgst == totalTax (no lost paise)", () => {
    expect(round2(t.cgst + t.sgst)).toBe(t.totalTax);
  });
});

describe("docTotals — empty doc is zero, never NaN", () => {
  const t = docTotals({ gstRate: 18, rooms: [] }, company, mh);
  it("all zero", () => {
    expect(t.subtotal).toBe(0); expect(t.taxable).toBe(0);
    expect(t.totalTax).toBe(0); expect(t.grand).toBe(0);
  });
});

describe("docTotals — discount capped at subtotal", () => {
  const doc = { gstRate: 18, discount: 999999, rooms: [
    { id: 1, items: [{ id: 1, hsn: "9403", mode: "direct", amount: 1000 }] },
  ]};
  const t = docTotals(doc, company, mh);
  it("taxable not negative", () => expect(t.taxable).toBe(0));
  it("grand is zero", () => expect(t.grand).toBe(0));
});

describe("docTotals — Non-GST (Bill of Supply) has no tax", () => {
  const doc = { taxMode: "nogst", discount: 0, rooms: [
    { id: 1, items: [
      { id: 1, hsn: "", mode: "direct", amount: 60000 },
      { id: 2, hsn: "", mode: "qty", qty: 6, rate: 3500 }, // 21000
    ]},
  ]};
  const t = docTotals(doc, company, mh);
  it("isGst false", () => expect(t.isGst).toBe(false));
  it("subtotal", () => expect(t.subtotal).toBe(81000));
  it("no tax of any kind", () => { expect(t.cgst).toBe(0); expect(t.sgst).toBe(0); expect(t.igst).toBe(0); expect(t.totalTax).toBe(0); });
  it("empty HSN summary", () => expect(t.hsnSummary.length).toBe(0));
  it("grand == taxable", () => { expect(t.taxable).toBe(81000); expect(t.grand).toBe(81000); });
});

describe("sqft worked example: 10 x 8 x 1 @ 1650", () => {
  it("amount = 132000", () => {
    const doc = { taxMode: "gst", gstRate: 18, rooms: [{ id: 1, items: [{ id: 1, hsn: "9403", mode: "sqft", length: 10, width: 8, units: 1, rate: 1650 }] }] };
    const t = docTotals(doc, company, mh);
    expect(t.subtotal).toBe(132000);
    expect(t.grand).toBe(155760); // +18%
  });
});
