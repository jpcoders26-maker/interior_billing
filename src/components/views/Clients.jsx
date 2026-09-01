"use client";
import React, { useState } from "react";
import { Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { Card, Btn, Field, inputCls, Modal, PageHead } from "../ui.jsx";
import { STATES } from "../../lib/format.js";

export default function ClientsView({ ctx }) {
  const { clients, setClients, record } = ctx;
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const blank = { id: "", name: "", contact: "", gstin: "", stateCode: "27", phone: "", email: "", billing: "", shipping: "" };
  const filtered = clients.filter((c) => (c.name + c.contact + c.email).toLowerCase().includes(q.toLowerCase()));

  const save = (c) => {
    if (c.id) { setClients((cs) => cs.map((x) => (x.id === c.id ? c : x))); record('Client "' + c.name + '" updated'); }
    else { const nc = { ...c, id: "C" + (Date.now() % 100000) }; setClients((cs) => [...cs, nc]); record('Client "' + c.name + '" added'); }
    setOpen(false);
  };
  const del = (c) => { if (confirm('Delete client "' + c.name + '"?')) { setClients((cs) => cs.filter((x) => x.id !== c.id)); record('Client "' + c.name + '" deleted'); } };

  return (
    <div>
      <PageHead title="Clients" sub="Customer master with GSTIN and billing / shipping addresses.">
        <Btn onClick={() => { setEditing(blank); setOpen(true); }}><Plus size={16} /> New client</Btn>
      </PageHead>
      <div className="relative mb-4 no-print">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className={inputCls + " pl-9 max-w-sm"} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="p-5" hover>
            <div className="flex items-start justify-between">
              <div><h3 className="font-semibold text-slate-900">{c.name}</h3><p className="text-sm text-slate-500">{c.contact}</p></div>
              <div className="flex gap-1 no-print">
                <button onClick={() => { setEditing(c); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil size={15} /></button>
                <button onClick={() => del(c)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{c.phone}</p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" />{c.email}</p>
              <p className="flex items-start gap-2"><MapPin size={14} className="text-slate-400 mt-0.5" />{c.billing}</p>
              <p className="flex items-center gap-2 flex-wrap"><Building2 size={14} className="text-slate-400" />
                {c.gstin ? <span className="font-mono">{c.gstin}</span> : <span className="text-slate-400">Unregistered (B2C)</span>}
                <span className="text-xs text-slate-400">· {STATES[c.stateCode]}</span>
              </p>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Edit client" : "New client"} wide>
        <ClientForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

function ClientForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Company / Client name"><input className={inputCls} value={f.name} onChange={set("name")} /></Field>
      <Field label="Contact person"><input className={inputCls} value={f.contact} onChange={set("contact")} /></Field>
      <Field label="Phone"><input className={inputCls} value={f.phone} onChange={set("phone")} /></Field>
      <Field label="Email"><input className={inputCls} value={f.email} onChange={set("email")} /></Field>
      <Field label="GSTIN" hint="Leave blank for B2C (unregistered)"><input className={inputCls + " font-mono"} value={f.gstin} onChange={set("gstin")} placeholder="27ABCDE1234F1Z5" /></Field>
      <Field label="State (place of supply)">
        <select className={inputCls} value={f.stateCode} onChange={set("stateCode")}>
          {Object.entries(STATES).map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
        </select>
      </Field>
      <Field label="Billing address"><textarea rows={2} className={inputCls} value={f.billing} onChange={set("billing")} /></Field>
      <Field label="Shipping address"><textarea rows={2} className={inputCls} value={f.shipping} onChange={set("shipping")} /></Field>
      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(f)}>{f.id ? "Save changes" : "Add client"}</Btn>
      </div>
    </div>
  );
}
