"use client";
import React, { useState } from "react";
import { Plus, CheckCircle2, FileText, Receipt } from "lucide-react";
import { Btn, PageHead } from "../ui.jsx";
import DocTable from "./DocTable.jsx";
import DocEditor from "./DocEditor.jsx";
import DocView from "./DocView.jsx";

export default function InvoicesView({ ctx }) {
  const { invoices, setInvoices, clientById, company, record } = ctx;
  const [mode, setMode] = useState("list");
  const [current, setCurrent] = useState(null);

  const seqNo = () => ctx.quotes.length + invoices.length + 1;
  const newDoc = (kindCfg) => {
    const n = seqNo();
    setCurrent({
      id: "", number: kindCfg.prefix + "/2526/" + String(n).padStart(3, "0"),
      docType: kindCfg.docType, taxMode: kindCfg.taxMode,
      clientId: ctx.clients[0]?.id, projectId: "", date: new Date().toISOString().slice(0, 10),
      due: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), status: "unpaid",
      gstRate: 18, discount: 0, rooms: [],
    });
    setMode("edit");
  };
  const save = (doc) => {
    if (doc.id) setInvoices((is) => is.map((i) => (i.id === doc.id ? doc : i)));
    else { doc.id = "I" + (Date.now() % 100000); setInvoices((is) => [...is, doc]); record(doc.docType + " " + doc.number + " created"); }
    setCurrent(doc); setMode("view");
  };
  const markPaid = (i) => { setInvoices((is) => is.map((x) => (x.id === i.id ? { ...x, status: "paid" } : x))); record(i.docType + " " + i.number + " marked Paid"); };

  if (mode === "edit") return <DocEditor doc={current} kind="invoice" ctx={ctx} onSave={save} onCancel={() => setMode("list")} />;
  if (mode === "view") return <DocView doc={current} kind="invoice" ctx={ctx} onBack={() => setMode("list")} onMarkPaid={() => { markPaid(current); setCurrent({ ...current, status: "paid" }); }} />;

  return (
    <div>
      <PageHead title="Invoices & Bills" sub="Create GST tax invoices or Non-GST bills of supply — each with its own format.">
        <Btn variant="ghost" onClick={() => newDoc({ docType: "Proforma Invoice", taxMode: "gst", prefix: "PI" })}><FileText size={15} /> Proforma</Btn>
        <Btn variant="dark" onClick={() => newDoc({ docType: "Bill of Supply", taxMode: "nogst", prefix: "BOS" })}><Receipt size={15} /> Non-GST bill</Btn>
        <Btn onClick={() => newDoc({ docType: "Tax Invoice", taxMode: "gst", prefix: "INV" })}><Plus size={15} /> GST tax invoice</Btn>
      </PageHead>
      <DocTable rows={invoices} company={company} clientById={clientById} typeCol
        onView={(d) => { setCurrent(d); setMode("view"); }} onEdit={(d) => { setCurrent(d); setMode("edit"); }}
        extra={(i) => i.status !== "paid" && <button onClick={() => markPaid(i)} title="Mark paid" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></button>} />
    </div>
  );
}
