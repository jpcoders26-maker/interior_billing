// Pure billing math — deterministic and reconciling. Supports GST and Non-GST.
import { round2 } from "./format.js";

// One line item's quantity, rate and amount (rounded to paise).
// Area is rounded to 2dp first so the printed area x rate equals the amount.
export function lineAmount(li) {
  if (li.mode === "sqft") {
    const area = round2((Number(li.length) || 0) * (Number(li.width) || 0) * (Number(li.units) || 1));
    const rate = Number(li.rate) || 0;
    return { qty: area, rate, amount: round2(area * rate), qtyLabel: area.toFixed(2) + " sq.ft" };
  }
  if (li.mode === "qty") {
    const q = Number(li.qty) || 0;
    const rate = Number(li.rate) || 0;
    return { qty: q, rate, amount: round2(q * rate), qtyLabel: q + " " + (li.unit || "nos") };
  }
  const amt = round2(Number(li.amount) || 0);
  return { qty: 1, rate: amt, amount: amt, qtyLabel: "Lump sum" };
}

export function docTotals(doc, company, client) {
  const isGst = (doc.taxMode || "gst") === "gst";
  const intraState = company.stateCode === (client?.stateCode || company.stateCode);
  const defRate = Number(doc.gstRate ?? 18);

  const rooms = (doc.rooms || []).map((r) => {
    const items = (r.items || []).map((li) => {
      const calc = lineAmount(li);
      const effRate = !isGst ? 0 : (li.gstRate === undefined || li.gstRate === null ? defRate : Number(li.gstRate));
      return { ...li, ...calc, effRate };
    });
    return { id: r.id, name: r.name, items, subtotal: round2(items.reduce((s, i) => s + i.amount, 0)) };
  });

  const allItems = rooms.flatMap((r) => r.items);
  const subtotal = round2(allItems.reduce((s, i) => s + i.amount, 0));
  const discount = round2(Math.min(Number(doc.discount) || 0, subtotal));
  const taxable = round2(subtotal - discount);

  // distribute discount pro-rata; last line absorbs the rounding remainder
  let allocated = 0;
  const lineTaxables = allItems.map((it, idx) => {
    let d;
    if (idx === allItems.length - 1) d = round2(discount - allocated);
    else { d = round2(subtotal > 0 ? (discount * it.amount) / subtotal : 0); allocated = round2(allocated + d); }
    return round2(it.amount - d);
  });

  let cgst = 0, sgst = 0, igst = 0, hsnSummary = [];
  if (isGst) {
    const groups = {};
    allItems.forEach((it, idx) => {
      const key = it.hsn + "|" + it.effRate;
      if (!groups[key]) groups[key] = { hsn: it.hsn || "—", rate: it.effRate, taxable: 0 };
      groups[key].taxable = round2(groups[key].taxable + lineTaxables[idx]);
    });
    hsnSummary = Object.values(groups)
      .sort((x, y) => (x.hsn + String(x.rate).padStart(2, "0")).localeCompare(y.hsn + String(y.rate).padStart(2, "0")))
      .map((g) => {
        const tax = round2((g.taxable * g.rate) / 100);
        let gc = 0, gs = 0, gi = 0;
        if (intraState) { gc = round2(tax / 2); gs = round2(tax - gc); } else { gi = tax; }
        cgst = round2(cgst + gc); sgst = round2(sgst + gs); igst = round2(igst + gi);
        return { ...g, cgst: gc, sgst: gs, igst: gi, tax };
      });
  }

  const totalTax = round2(cgst + sgst + igst);
  const preRound = round2(taxable + totalTax);
  const grand = Math.round(preRound);
  const roundOff = round2(grand - preRound);
  return {
    isGst, rooms, subtotal, discount, taxable, cgst, sgst, igst, totalTax,
    roundOff, grand, intraState, hsnSummary, itemCount: allItems.length,
  };
}
