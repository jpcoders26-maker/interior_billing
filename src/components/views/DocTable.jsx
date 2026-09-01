"use client";
import React from "react";
import { Eye, Pencil } from "lucide-react";
import { Card, Pill } from "../ui.jsx";
import { inr } from "../../lib/format.js";
import { docTotals } from "../../lib/billing.js";

export default function DocTable({ rows, company, clientById, onView, onEdit, extra, typeCol }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-5 py-3">Number</th>
              {typeCol && <th className="text-left font-medium px-5 py-3">Type</th>}
              <th className="text-left font-medium px-5 py-3">Client</th>
              <th className="text-center font-medium px-5 py-3">Tax</th>
              <th className="text-right font-medium px-5 py-3">Total</th>
              <th className="text-left font-medium px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((d) => {
              const t = docTotals(d, company, clientById(d.clientId));
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono font-medium text-slate-800">{d.number}</td>
                  {typeCol && <td className="px-5 py-3 text-slate-600">{d.docType}</td>}
                  <td className="px-5 py-3 text-slate-700">{clientById(d.clientId)?.name}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={"text-[11px] font-medium px-2 py-0.5 rounded-full " + (t.isGst ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700")}>{t.isGst ? "GST" : "No GST"}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-800">{inr(t.grand)}</td>
                  <td className="px-5 py-3"><Pill s={d.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onView(d)} title="View" className="p-1.5 rounded-lg hover:bg-slate-100"><Eye size={15} /></button>
                      <button onClick={() => onEdit(d)} title="Edit" className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil size={15} /></button>
                      {extra && extra(d)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
