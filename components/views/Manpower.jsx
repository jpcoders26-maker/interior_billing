"use client";
import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Card, Btn, Field, inputCls, Modal, PageHead } from "../ui.jsx";
import { inr } from "../../lib/format.js";

export default function ManpowerView({ ctx }) {
  const { workers, setWorkers, projects, alloc, setAlloc, record } = ctx;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", skill: "Carpenter", phone: "", rate: 1000 });
  const assignedTo = (wid) => alloc.find((a) => a.workerId === wid)?.projectId || "";
  const assign = (wid, pid) => { setAlloc((a) => [...a.filter((x) => x.workerId !== wid), ...(pid ? [{ workerId: wid, projectId: pid }] : [])]); record("Worker reallocated"); };
  const addWorker = () => { setWorkers((w) => [...w, { ...form, id: "W" + (Date.now() % 100000) }]); record('Worker "' + form.name + '" added'); setOpen(false); setForm({ name: "", skill: "Carpenter", phone: "", rate: 1000 }); };
  const dailyCost = (pid) => alloc.filter((a) => a.projectId === pid).reduce((s, a) => s + (workers.find((w) => w.id === a.workerId)?.rate || 0), 0);
  const active = projects.filter((p) => p.status !== "completed");

  return (
    <div>
      <PageHead title="Manpower" sub="Plan workforce allocation across active sites."><Btn onClick={() => setOpen(true)}><Plus size={16} /> Add worker</Btn></PageHead>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {active.map((p) => {
          const count = alloc.filter((a) => a.projectId === p.id).length;
          return (
            <Card key={p.id} className="p-4" hover>
              <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
              <p className="text-xs text-slate-400 mt-1">{count} workers assigned</p>
              <p className="font-mono text-indigo-600 font-semibold mt-2">{inr(dailyCost(p.id))}<span className="text-xs text-slate-400">/day</span></p>
            </Card>
          );
        })}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr><th className="text-left font-medium px-5 py-3">Worker</th><th className="text-left font-medium px-5 py-3">Skill</th><th className="text-left font-medium px-5 py-3">Phone</th><th className="text-right font-medium px-5 py-3">Daily rate</th><th className="text-left font-medium px-5 py-3">Assigned site</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{w.name}</td>
                  <td className="px-5 py-3 text-slate-600">{w.skill}</td>
                  <td className="px-5 py-3 font-mono text-slate-500 text-xs">{w.phone}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-700">{inr(w.rate)}</td>
                  <td className="px-5 py-3">
                    <select value={assignedTo(w.id)} onChange={(e) => assign(w.id, e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
                      <option value="">— Unassigned —</option>
                      {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add worker">
        <div className="space-y-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Skill / role"><input className={inputCls} value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Daily rate (₹)"><input type="number" className={inputCls} value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={addWorker}>Add worker</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
