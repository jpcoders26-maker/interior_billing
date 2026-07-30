"use client";
import React, { useState, useRef } from "react";
import { CheckCircle2, Upload, Trash2 } from "lucide-react";
import { Card, Btn, Field, inputCls, PageHead, Logo, Eyebrow } from "../ui.jsx";
import { STATES } from "../../lib/format.js";

export default function SettingsView({ ctx }) {
  const { company, setCompany, record } = ctx;
  const [c, setC] = useState(company);
  const [note, setNote] = useState("");
  const fileRef = useRef();
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });
  const setBank = (k) => (e) => setC({ ...c, bank: { ...c.bank, [k]: e.target.value } });

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { setNote("Please choose an image file."); return; }
    if (file.size > 1024 * 1024) { setNote("Image is large (>1MB) — a smaller logo loads faster."); }
    const reader = new FileReader();
    reader.onload = () => setC((x) => ({ ...x, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = () => { setCompany(c); record("Company settings updated"); setNote("Saved."); };

  return (
    <div>
      <PageHead title="Company settings" sub="These details and the logo print on every quotation and invoice.">
        <Btn onClick={save}><CheckCircle2 size={16} /> Save</Btn>
      </PageHead>

      <Card className="p-5 mb-4">
        <Eyebrow>Company logo</Eyebrow>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <Logo src={c.logo} size={64} className="border border-slate-200" />
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={15} /> Upload logo</Btn>
            {c.logo && <Btn variant="danger" onClick={() => setC({ ...c, logo: "" })}><Trash2 size={15} /> Remove</Btn>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
          </div>
          {note && <span className="text-xs text-slate-400">{note}</span>}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">PNG or JPG, square works best. Click Save to apply across the app and documents.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Business profile</h3>
          <Field label="Company name"><input className={inputCls} value={c.name} onChange={set("name")} /></Field>
          <Field label="Tagline" hint="Shown under your company name on quotations & invoices."><input className={inputCls} value={c.tagline || ""} onChange={set("tagline")} /></Field>
          <Field label="GSTIN"><input className={inputCls + " font-mono"} value={c.gstin} onChange={set("gstin")} /></Field>
          <Field label="State"><select className={inputCls} value={c.stateCode} onChange={set("stateCode")}>{Object.entries(STATES).map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}</select></Field>
          <Field label="Address"><textarea rows={2} className={inputCls} value={c.address} onChange={set("address")} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Phone"><input className={inputCls} value={c.phone} onChange={set("phone")} /></Field><Field label="Email"><input className={inputCls} value={c.email} onChange={set("email")} /></Field></div>
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Bank & payment</h3>
          <Field label="Bank name & branch"><input className={inputCls} value={c.bank.name} onChange={setBank("name")} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Account no."><input className={inputCls + " font-mono"} value={c.bank.acc} onChange={setBank("acc")} /></Field><Field label="IFSC"><input className={inputCls + " font-mono"} value={c.bank.ifsc} onChange={setBank("ifsc")} /></Field></div>
          <Field label="UPI ID"><input className={inputCls + " font-mono"} value={c.bank.upi} onChange={setBank("upi")} /></Field>
          <Field label="Terms & conditions"><textarea rows={4} className={inputCls} value={c.terms} onChange={set("terms")} /></Field>
        </Card>
      </div>
    </div>
  );
}
