"use client";
import React, { Fragment } from "react";
import { ChevronRight, Send, Mail, ArrowRightLeft, CheckCircle2, Download, Home } from "lucide-react";
import { Btn, Eyebrow, Pill, RowDoc, Logo } from "../ui.jsx";
import { inr, numToWords, STATES } from "../../lib/format.js";
import { docTotals } from "../../lib/billing.js";

export default function DocView({ doc, kind, ctx, onBack, onConvert, onMarkPaid }) {
  const { company, clientById, projectById } = ctx;
  const client = clientById(doc.clientId);
  const project = projectById(doc.projectId);
  const t = docTotals(doc, company, client);
  const isGst = t.isGst;
  const title = kind === "quote" ? "Quotation" : (doc.docType || (isGst ? "Tax Invoice" : "Bill of Supply"));
  const accent = isGst ? "border-t-indigo-500" : "border-t-emerald-500";
  const roomHdr = isGst ? "bg-indigo-50" : "bg-emerald-50";
  const roomIcon = isGst ? "text-indigo-500" : "text-emerald-600";
  const totalBox = isGst ? "bg-indigo-50 border-indigo-200" : "bg-emerald-50 border-emerald-200";

  const msg = "Dear " + (client?.contact || "Customer") + ",%0A%0APlease find your " + title.toLowerCase() + " " + doc.number +
    " from " + company.name + ".%0ATotal: " + inr(t.grand) + (isGst ? " (incl. GST)" : "") + ".%0A%0AThank you.";
  const waLink = "https://wa.me/" + (client?.phone || "").replace(/[^0-9]/g, "") + "?text=" + msg;
  const mailLink = "mailto:" + (client?.email || "") + "?subject=" + encodeURIComponent(title + " " + doc.number + " — " + company.name) + "&body=" + msg;

  const cols = isGst ? 7 : 6;
  let n = 0;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5 no-print">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1"><ChevronRight size={16} className="rotate-180" /> Back to list</button>
        <div className="flex flex-wrap items-center gap-2">
          <a href={waLink} target="_blank" rel="noreferrer"><Btn variant="ghost"><Send size={15} /> WhatsApp</Btn></a>
          <a href={mailLink}><Btn variant="ghost"><Mail size={15} /> Email</Btn></a>
          {kind === "quote" && onConvert && <Btn onClick={onConvert}><ArrowRightLeft size={15} /> Convert to invoice</Btn>}
          {kind === "invoice" && doc.status !== "paid" && onMarkPaid && <Btn variant="dark" onClick={onMarkPaid}><CheckCircle2 size={15} /> Mark paid</Btn>}
          <Btn onClick={() => window.print()}><Download size={15} /> Download PDF</Btn>
        </div>
      </div>

      <div className={"print-area bg-white border border-slate-200 rounded-2xl shadow-card max-w-3xl mx-auto p-5 sm:p-8 text-[13px] text-slate-800 border-t-4 " + accent}>
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start pb-4 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <Logo src={company.logo} size={40} />
              <div><h2 className="text-lg font-bold text-slate-900 leading-tight">{company.name}</h2><p className="text-xs text-slate-500">{company.tagline || "Interior contractors & custom furniture"}</p></div>
            </div>
            <p className="text-xs text-slate-600 mt-2 max-w-xs">{company.address}</p>
            <p className="text-xs text-slate-600">{company.phone} · {company.email}</p>
            {isGst && <p className="text-xs mt-1"><span className="text-slate-400">GSTIN:</span> <span className="font-mono font-medium">{company.gstin}</span></p>}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{isGst ? "Original for Recipient" : "Not a tax invoice"}</p>
            <p className="text-xl font-bold uppercase tracking-wide text-slate-900">{title}</p>
            <p className="text-sm font-mono mt-1">{doc.number}</p>
            <p className="text-xs text-slate-500 mt-2">Date: <span className="font-mono">{doc.date}</span></p>
            {doc.due && <p className="text-xs text-slate-500">Due: <span className="font-mono">{doc.due}</span></p>}
            <div className="mt-2 inline-block"><Pill s={doc.status} /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div>
            <Eyebrow>Bill to</Eyebrow>
            <p className="font-semibold text-slate-900 mt-1">{client?.name}</p>
            <p className="text-xs text-slate-600">{client?.contact} · {client?.phone}</p>
            <p className="text-xs text-slate-600 mt-1">{client?.billing}</p>
            {isGst && (client?.gstin ? <p className="text-xs mt-1"><span className="text-slate-400">GSTIN:</span> <span className="font-mono">{client.gstin}</span></p> : <p className="text-xs mt-1 text-slate-400">Unregistered (B2C)</p>)}
            {isGst && <p className="text-xs text-slate-500">Place of supply: {STATES[client?.stateCode]} ({client?.stateCode})</p>}
          </div>
          <div>
            <Eyebrow>Ship to</Eyebrow>
            <p className="font-semibold text-slate-900 mt-1">{client?.name}</p>
            <p className="text-xs text-slate-600 mt-1">{client?.shipping}</p>
            {project && <p className="text-xs text-slate-500 mt-1">Project: {project.name}</p>}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto scroll-thin">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left font-medium px-2 py-2 rounded-l">#</th>
                <th className="text-left font-medium px-2 py-2">Description</th>
                <th className="text-center font-medium px-2 py-2">HSN/SAC</th>
                <th className="text-right font-medium px-2 py-2">Qty / Area</th>
                <th className="text-right font-medium px-2 py-2">Rate</th>
                {isGst && <th className="text-center font-medium px-2 py-2">GST</th>}
                <th className="text-right font-medium px-2 py-2 rounded-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {t.rooms.map((room) => (
                <Fragment key={room.id}>
                  <tr className={roomHdr}>
                    <td colSpan={cols} className="px-2 py-1.5 font-semibold text-slate-700 text-[11px] uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1.5"><Home size={12} className={roomIcon} /> {room.name}</span>
                    </td>
                  </tr>
                  {room.items.map((it) => { n += 1; return (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-400">{n}</td>
                      <td className="px-2 py-2 text-slate-800">{it.desc || <span className="text-slate-300">—</span>}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{it.hsn || "—"}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{it.qtyLabel}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{it.mode === "direct" ? "—" : inr(it.rate)}</td>
                      {isGst && <td className="px-2 py-2 text-center font-mono text-slate-500">{it.effRate}%</td>}
                      <td className="px-2 py-2 text-right font-mono font-medium text-slate-900">{inr(it.amount)}</td>
                    </tr>
                  ); })}
                  {room.items.length > 0 && (
                    <tr className="border-b border-slate-200">
                      <td colSpan={cols - 1} className="px-2 py-1.5 text-right text-slate-500 italic">Subtotal — {room.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-700">{inr(room.subtotal)}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {isGst && t.hsnSummary.length > 0 && (
          <div className="mt-5 overflow-x-auto scroll-thin">
            <Eyebrow>Tax summary (HSN/SAC-wise)</Eyebrow>
            <table className="w-full mt-1 text-[11px] border border-slate-200 min-w-[420px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-medium px-2 py-1.5 border-b border-slate-200">HSN/SAC</th>
                  <th className="text-right font-medium px-2 py-1.5 border-b border-slate-200">Taxable</th>
                  {t.intraState ? (<>
                    <th className="text-right font-medium px-2 py-1.5 border-b border-slate-200">CGST</th>
                    <th className="text-right font-medium px-2 py-1.5 border-b border-slate-200">SGST</th>
                  </>) : <th className="text-right font-medium px-2 py-1.5 border-b border-slate-200">IGST</th>}
                  <th className="text-right font-medium px-2 py-1.5 border-b border-slate-200">Total tax</th>
                </tr>
              </thead>
              <tbody>
                {t.hsnSummary.map((h, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{h.hsn} <span className="text-slate-400">@{h.rate}%</span></td>
                    <td className="px-2 py-1.5 text-right font-mono">{inr(h.taxable)}</td>
                    {t.intraState ? (<><td className="px-2 py-1.5 text-right font-mono">{inr(h.cgst)}</td><td className="px-2 py-1.5 text-right font-mono">{inr(h.sgst)}</td></>) : <td className="px-2 py-1.5 text-right font-mono">{inr(h.igst)}</td>}
                    <td className="px-2 py-1.5 text-right font-mono">{inr(h.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          <div>
            <Eyebrow>Amount in words</Eyebrow>
            <p className="text-xs text-slate-700 mt-1 italic">{numToWords(t.grand)}</p>
            <div className="mt-4">
              <Eyebrow>Bank details</Eyebrow>
              <p className="text-xs text-slate-600 mt-1">{company.bank.name}</p>
              <p className="text-xs text-slate-600">A/c: <span className="font-mono">{company.bank.acc}</span></p>
              <p className="text-xs text-slate-600">IFSC: <span className="font-mono">{company.bank.ifsc}</span> · UPI: <span className="font-mono">{company.bank.upi}</span></p>
            </div>
            {!isGst && <p className="text-[11px] text-slate-400 mt-3 italic">This is a Bill of Supply. No GST is charged on this document.</p>}
          </div>
          <div className="text-xs space-y-1">
            <RowDoc k="Subtotal" v={inr(t.subtotal)} />
            {t.discount > 0 && <RowDoc k="Discount" v={"– " + inr(t.discount)} />}
            <RowDoc k={isGst ? "Taxable value" : "Net amount"} v={inr(t.taxable)} />
            {isGst && (t.intraState ? (<><RowDoc k="CGST" v={inr(t.cgst)} /><RowDoc k="SGST" v={inr(t.sgst)} /></>) : <RowDoc k="IGST" v={inr(t.igst)} />)}
            <RowDoc k="Round off" v={(t.roundOff >= 0 ? "+ " : "– ") + inr(Math.abs(t.roundOff))} />
            <div className={"flex justify-between px-2 py-2 rounded-lg mt-1 border " + totalBox}>
              <span className="font-bold text-slate-900">Grand Total</span>
              <span className="font-mono font-bold text-slate-900">{inr(t.grand)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-4 border-t border-slate-200">
          <div>
            <Eyebrow>Terms & conditions</Eyebrow>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{company.terms}</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="text-xs text-slate-500">For {company.name}</p>
            <div className="h-12" />
            <p className="text-xs font-medium text-slate-700 border-t border-slate-300 inline-block ml-auto pt-1">Authorised Signatory</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-6">This is a computer-generated document.</p>
      </div>
    </div>
  );
}
