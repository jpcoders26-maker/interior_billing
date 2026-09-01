"use client";
import React, { useState } from "react";
import { Plus, ArrowRightLeft } from "lucide-react";
import { Btn, PageHead } from "../ui.jsx";
import DocTable from "./DocTable.jsx";
import DocEditor from "./DocEditor.jsx";
import DocView from "./DocView.jsx";

export default function QuotationsView({ ctx }) {
  const { quotes, setQuotes, invoices, setInvoices, clientById, company, record } = ctx;
  const [mode, setMode] = useState("list");
  const [current, setCurrent] = useState(null);

  const newQuote = () => {
    const n = quotes.length + invoices.length + 1;
    setCurrent({ id: "", number: "QTN/2526/" + String(n).padStart(3, "0"), taxMode: "gst", clientId: ctx.clients[0]?.id, projectId: "",
      date: new Date().toISOString().slice(0, 10), status: "draft", gstRate: 18, discount: 0, rooms: [] });
    setMode("edit");
  };
  const save = (doc) => {
    if (doc.id) setQuotes((qs) => qs.map((q) => (q.id === doc.id ? doc : q)));
    else { doc.id = "Q" + (Date.now() % 100000); setQuotes((qs) => [...qs, doc]); record("Quotation " + doc.number + " created"); }
    setCurrent(doc); setMode("view");
  };
  const convert = (q) => {
    const n = quotes.length + invoices.length + 1;
    const inv = { ...q, id: "I" + (Date.now() % 100000), number: "INV/2526/" + String(n).padStart(3, "0"), docType: "Tax Invoice",
      status: "unpaid", date: new Date().toISOString().slice(0, 10), due: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) };
    setInvoices((is) => [...is, inv]);
    setQuotes((qs) => qs.map((x) => (x.id === q.id ? { ...x, status: "accepted" } : x)));
    record("Quotation " + q.number + " converted -> Invoice " + inv.number);
    ctx.setView("invoices");
  };

  if (mode === "edit") return <DocEditor doc={current} kind="quote" ctx={ctx} onSave={save} onCancel={() => setMode("list")} />;
  if (mode === "view") return <DocView doc={current} kind="quote" ctx={ctx} onBack={() => setMode("list")} onConvert={() => convert(current)} />;

  return (
    <div>
      <PageHead title="Quotations" sub="Room-wise quoting. Price each item by sq.ft, quantity or lump sum.">
        <Btn onClick={newQuote}><Plus size={16} /> New quotation</Btn>
      </PageHead>
      <DocTable rows={quotes} company={company} clientById={clientById}
        onView={(d) => { setCurrent(d); setMode("view"); }} onEdit={(d) => { setCurrent(d); setMode("edit"); }}
        extra={(q) => <button onClick={() => convert(q)} title="Convert to invoice" className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"><ArrowRightLeft size={15} /></button>} />
    </div>
  );
}
