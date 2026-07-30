"use client";
import React from "react";
import { ShieldCheck, Clock } from "lucide-react";
import { Card, PageHead } from "../ui.jsx";
import { inrShort } from "../../lib/format.js";
import { docTotals } from "../../lib/billing.js";

export default function AdminView({ ctx }) {
  const { log, clients, projects, quotes, invoices, company, clientById } = ctx;
  const totalBilled = invoices.reduce((s, i) => s + docTotals(i, company, clientById(i.clientId)).grand, 0);
  const stats = [
    { label: "Total clients", value: clients.length }, { label: "Projects", value: projects.length },
    { label: "Quotations", value: quotes.length }, { label: "Invoices", value: invoices.length },
    { label: "Total billed", value: inrShort(totalBilled) },
  ];
  return (
    <div>
      <PageHead title="Admin oversight" sub="Admin view of all major user activity across the workspace." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (<Card key={s.label} className="p-4"><p className="text-2xl font-bold font-mono text-slate-900">{s.value}</p><p className="text-xs text-slate-500 mt-0.5">{s.label}</p></Card>))}
      </div>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><ShieldCheck size={18} className="text-indigo-500" /><h3 className="font-semibold text-slate-900">Activity audit log</h3></div>
        <div className="divide-y divide-slate-100">
          {log.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
              <Clock size={14} className="text-slate-300 shrink-0" />
              <span className="text-slate-700 flex-1"><span className="font-medium">{e.who}</span> — {e.action}</span>
              <span className="text-xs text-slate-400 shrink-0">{e.at}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
