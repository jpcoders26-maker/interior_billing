"use client";
import React, { useState } from "react";
import {
  CheckCircle2, Plus, Trash2, Copy, Home, Layers, ChevronUp, ChevronDown,
  Ruler, Hash, IndianRupee,
} from "lucide-react";
import { Card, Btn, Field, inputCls, PageHead, Row, NumIn, Segmented } from "../ui.jsx";
import { inr, uid } from "../../lib/format.js";
import { lineAmount, docTotals } from "../../lib/billing.js";
import { ROOM_PRESETS, CATALOG, blankItem, catalogToItem } from "../../lib/catalog.js";

// seed the fields a pricing mode needs, preserving shared fields
function withMode(it, mode) {
  const base = { ...it, mode };
  if (mode === "sqft") return { length: it.length ?? 0, width: it.width ?? 0, units: it.units ?? 1, rate: it.rate ?? 0, ...base, mode };
  if (mode === "qty") return { qty: it.qty ?? 1, unit: it.unit ?? "nos", rate: it.rate ?? 0, ...base, mode };
  return { amount: it.amount ?? 0, ...base, mode };
}

export default function DocEditor({ doc, kind, ctx, onSave, onCancel }) {
  const { clients, projects, company, clientById } = ctx;
  const [d, setD] = useState({ taxMode: "gst", ...doc });
  const [collapsed, setCollapsed] = useState({});
  const isGst = (d.taxMode || "gst") === "gst";
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setRooms = (rooms) => setD((x) => ({ ...x, rooms }));
  const client = clientById(d.clientId);
  const t = docTotals(d, company, client);

  const applyPreset = (name) => setRooms([...(d.rooms || []), ...ROOM_PRESETS[name].map((rn) => ({ id: uid(), name: rn, items: [] }))]);
  const addRoom = () => setRooms([...(d.rooms || []), { id: uid(), name: "New Room", items: [] }]);
  const renameRoom = (rid, name) => setRooms(d.rooms.map((r) => (r.id === rid ? { ...r, name } : r)));
  const delRoom = (rid) => setRooms(d.rooms.filter((r) => r.id !== rid));
  const dupRoom = (rid) => {
    const r = d.rooms.find((x) => x.id === rid);
    const copy = { id: uid(), name: r.name + " (copy)", items: r.items.map((it) => ({ ...it, id: uid() })) };
    const idx = d.rooms.findIndex((x) => x.id === rid);
    const next = [...d.rooms]; next.splice(idx + 1, 0, copy); setRooms(next);
  };
  const addItem = (rid, item) => setRooms(d.rooms.map((r) => (r.id === rid ? { ...r, items: [...r.items, item] } : r)));
  const updItem = (rid, iid, patch) => setRooms(d.rooms.map((r) => (r.id === rid ? { ...r, items: r.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) } : r)));
  const changeMode = (rid, iid, mode) => setRooms(d.rooms.map((r) => (r.id === rid ? { ...r, items: r.items.map((it) => (it.id === iid ? withMode(it, mode) : it)) } : r)));
  const delItem = (rid, iid) => setRooms(d.rooms.map((r) => (r.id === rid ? { ...r, items: r.items.filter((it) => it.id !== iid) } : r)));
  const toggle = (rid) => setCollapsed((c) => ({ ...c, [rid]: !c[rid] }));

  const titleNoun = kind === "quote" ? "quotation" : (d.docType || "invoice");

  return (
    <div>
      <PageHead title={d.id ? "Edit " + d.number : "New " + titleNoun} sub="Group line items by room. Use a BHK template to start fast.">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(d)}><CheckCircle2 size={16} /> Save</Btn>
      </PageHead>

      <Card className="p-4 sm:p-5 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill type</span>
          <Segmented value={isGst ? "gst" : "nogst"} onChange={(v) => set("taxMode", v)}
            options={[{ value: "gst", label: "GST invoice" }, { value: "nogst", label: "Non-GST (Bill of Supply)" }]} />
          <span className="text-xs text-slate-400">{isGst ? "CGST/SGST or IGST applied with HSN summary." : "No tax charged — plain bill of supply."}</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Document no."><input className={inputCls + " font-mono"} value={d.number} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label="Client">
            <select className={inputCls} value={d.clientId} onChange={(e) => set("clientId", e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Linked project">
            <select className={inputCls} value={d.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">— none —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><input type="date" className={inputCls} value={d.date} onChange={(e) => set("date", e.target.value)} /></Field>
          {isGst && (
            <Field label="Default GST rate %">
              <select className={inputCls} value={d.gstRate} onChange={(e) => set("gstRate", Number(e.target.value))}>
                {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
          )}
          <Field label="Discount (₹)"><input type="number" className={inputCls} value={d.discount} onChange={(e) => set("discount", Number(e.target.value))} /></Field>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1 flex items-center gap-1.5"><Layers size={14} /> Add rooms</span>
          {Object.keys(ROOM_PRESETS).map((p) => (
            <button key={p} onClick={() => applyPreset(p)} className="px-3 py-1.5 rounded-xl text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition">{p}</button>
          ))}
          <Btn variant="ghost" onClick={addRoom}><Plus size={15} /> Custom room</Btn>
          <span className="ml-auto text-xs text-slate-400">{d.rooms?.length || 0} rooms · {t.itemCount} items</span>
        </div>
      </Card>

      {!d.rooms || d.rooms.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Home size={36} className="mx-auto text-slate-300" />
          <p className="text-slate-600 font-medium mt-3">Start by choosing a layout</p>
          <p className="text-sm text-slate-400 mb-4">e.g. a 3 BHK adds Master Bedroom, Bedroom 2, Bedroom 3, Living/Hall & Kitchen.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.keys(ROOM_PRESETS).map((p) => (
              <button key={p} onClick={() => applyPreset(p)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition">{p}</button>
            ))}
            <Btn variant="ghost" onClick={addRoom}><Plus size={15} /> Blank room</Btn>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {d.rooms.map((room) => {
            const rt = t.rooms.find((r) => r.id === room.id) || { subtotal: 0 };
            const isOpen = !collapsed[room.id];
            return (
              <Card key={room.id} className="overflow-hidden border-l-4 border-l-indigo-500">
                <div className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <button onClick={() => toggle(room.id)} className="p-1 rounded hover:bg-slate-200 text-slate-500">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                  <Home size={16} className="text-indigo-500 shrink-0" />
                  <input value={room.name} onChange={(e) => renameRoom(room.id, e.target.value)}
                    className="font-semibold text-slate-900 bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg px-1.5 py-0.5 min-w-0 flex-1" />
                  <span className="hidden sm:inline text-xs text-slate-400">{room.items.length} items</span>
                  <span className="font-mono font-semibold text-slate-800 text-sm">{inr(rt.subtotal)}</span>
                  <button onClick={() => dupRoom(room.id)} title="Duplicate room" className="p-1.5 rounded-lg hover:bg-white text-slate-500"><Copy size={15} /></button>
                  <button onClick={() => delRoom(room.id)} title="Delete room" className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
                </div>

                {isOpen && (
                  <div className="p-3 sm:p-4 space-y-3">
                    {room.items.length === 0 && <p className="text-sm text-slate-400 text-center py-2">No items yet — add a blank item or pick from the rate card below.</p>}
                    {room.items.map((it) => {
                      const calc = lineAmount(it);
                      return (
                        <div key={it.id} className="border border-slate-200 rounded-xl p-3">
                          <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                            <input className={inputCls} placeholder="Item description" value={it.desc || ""} onChange={(e) => updItem(room.id, it.id, { desc: e.target.value })} />
                            <div className="flex gap-2">
                              <input className={inputCls + " w-24 font-mono"} placeholder="HSN/SAC" value={it.hsn || ""} onChange={(e) => updItem(room.id, it.id, { hsn: e.target.value })} />
                              {isGst && (
                                <select className={inputCls + " w-28"} title="GST rate" value={it.gstRate === undefined ? "" : it.gstRate}
                                  onChange={(e) => updItem(room.id, it.id, { gstRate: e.target.value === "" ? undefined : Number(e.target.value) })}>
                                  <option value="">GST {d.gstRate ?? 18}%</option>
                                  {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                                </select>
                              )}
                              <button onClick={() => delItem(room.id, it.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 shrink-0"><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 items-end">
                            <div className="flex rounded-xl bg-slate-100 p-0.5">
                              {[["sqft", Ruler, "Sq.ft"], ["qty", Hash, "Qty"], ["direct", IndianRupee, "Direct"]].map(([m, Ic, lbl]) => (
                                <button key={m} onClick={() => changeMode(room.id, it.id, m)}
                                  className={"flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition " + (it.mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>
                                  <Ic size={13} /> {lbl}
                                </button>
                              ))}
                            </div>
                            {it.mode === "sqft" && (<>
                              <NumIn label="Length (ft)" v={it.length} on={(v) => updItem(room.id, it.id, { length: v })} w="w-24" />
                              <NumIn label="Width (ft)" v={it.width} on={(v) => updItem(room.id, it.id, { width: v })} w="w-24" />
                              <NumIn label="Units" v={it.units} on={(v) => updItem(room.id, it.id, { units: v })} w="w-20" />
                              <NumIn label="Rate /sq.ft" v={it.rate} on={(v) => updItem(room.id, it.id, { rate: v })} w="w-28" />
                            </>)}
                            {it.mode === "qty" && (<>
                              <NumIn label="Quantity" v={it.qty} on={(v) => updItem(room.id, it.id, { qty: v })} w="w-24" />
                              <div><span className="block text-[11px] text-slate-500 mb-1">Unit</span><input className={inputCls + " w-20"} value={it.unit || ""} onChange={(e) => updItem(room.id, it.id, { unit: e.target.value })} /></div>
                              <NumIn label="Rate /unit" v={it.rate} on={(v) => updItem(room.id, it.id, { rate: v })} w="w-28" />
                            </>)}
                            {it.mode === "direct" && <NumIn label="Amount (₹)" v={it.amount} on={(v) => updItem(room.id, it.id, { amount: v })} w="w-32" />}
                            <div className="ml-auto text-right">
                              <span className="block text-[11px] text-slate-500">Amount</span>
                              <span className="font-mono font-semibold text-slate-900">{inr(calc.amount)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Btn variant="ghost" onClick={() => addItem(room.id, blankItem())}><Plus size={15} /> Blank item</Btn>
                      <select className={inputCls + " w-auto max-w-xs"} value=""
                        onChange={(e) => { const c = CATALOG.find((x) => x.name === e.target.value); if (c) addItem(room.id, catalogToItem(c)); }}>
                        <option value="">+ Quick add from rate card…</option>
                        {CATALOG.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4 sm:p-5 mt-4">
        <div className="sm:ml-auto sm:max-w-xs space-y-1.5 text-sm">
          <Row k="Subtotal" v={inr(t.subtotal)} />
          {t.discount > 0 && <Row k="Discount" v={"– " + inr(t.discount)} />}
          <Row k={isGst ? "Taxable value" : "Net amount"} v={inr(t.taxable)} />
          {isGst && (t.intraState ? (<><Row k="CGST" v={inr(t.cgst)} /><Row k="SGST" v={inr(t.sgst)} /></>) : <Row k="IGST" v={inr(t.igst)} />)}
          <Row k="Round off" v={(t.roundOff >= 0 ? "+ " : "– ") + inr(Math.abs(t.roundOff))} />
          <div className="border-t border-slate-200 pt-2 mt-2"><Row k="Grand total" v={inr(t.grand)} bold /></div>
        </div>
      </Card>
    </div>
  );
}
