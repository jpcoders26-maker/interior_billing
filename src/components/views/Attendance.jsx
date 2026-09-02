"use client";
import React, { useState } from "react";
import { LogIn, LogOut, Printer, CalendarCheck2, MapPin } from "lucide-react";
import { Card, Btn, PageHead, Segmented, inputCls } from "../ui.jsx";
import { inr, uid } from "../../lib/format.js";

const hhmm = () => new Date().toTimeString().slice(0, 5);
const minutes = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hoursBetween = (a, b) => { const x = minutes(a), y = minutes(b); if (x == null || y == null || y < x) return 0; return (y - x) / 60; };

export default function AttendanceView({ ctx }) {
  const { workers, attendance, setAttendance, projects, alloc, record } = ctx;
  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const siteOf = (wid) => alloc.find((a) => a.workerId === wid)?.projectId || "";
  const projectName = (pid) => projects.find((p) => p.id === pid)?.name || "Unassigned site";

  const recFor = (wid, d) => attendance.find((a) => a.workerId === wid && a.date === d);
  const upsert = (wid, patch) => {
    setAttendance((list) => {
      const i = list.findIndex((a) => a.workerId === wid && a.date === date);
      if (i === -1) return [...list, { id: "A" + uid(), workerId: wid, date, inTime: "", outTime: "", projectId: siteOf(wid), ...patch }];
      const next = [...list]; next[i] = { ...next[i], ...patch }; return next;
    });
  };
  const checkIn = (w) => { upsert(w.id, { inTime: hhmm() }); record("Checked in " + w.name); };
  const checkOut = (w) => { upsert(w.id, { outTime: hhmm() }); record("Checked out " + w.name); };
  const setTime = (wid, field, val) => upsert(wid, { [field]: val });
  const setSite = (wid, pid) => upsert(wid, { projectId: pid });

  // monthly report — grouped by site so labour spend is trackable per project
  const monthRecs = attendance.filter((a) => a.date.startsWith(month) && a.inTime);
  const siteGroups = {};
  for (const rec of monthRecs) {
    const pid = rec.projectId || "";
    (siteGroups[pid] ||= []).push(rec);
  }
  const sites = Object.keys(siteGroups)
    .map((pid) => {
      const rows = workers
        .map((w) => {
          const recs = siteGroups[pid].filter((r) => r.workerId === w.id);
          if (!recs.length) return null;
          const present = recs.length;
          const totalHours = Math.round(recs.reduce((s, r) => s + hoursBetween(r.inTime, r.outTime), 0) * 10) / 10;
          const payable = present * (w.rate || 0);
          return { w, present, totalHours, payable };
        })
        .filter(Boolean);
      const siteTotal = rows.reduce((s, r) => s + r.payable, 0);
      return { pid, name: projectName(pid), rows, siteTotal };
    })
    .sort((a, b) => b.siteTotal - a.siteTotal);
  const grandPay = sites.reduce((s, g) => s + g.siteTotal, 0);

  return (
    <div>
      <PageHead title="Labour attendance" sub="Check workers in and out on site, then generate a monthly wage report.">
        <Segmented value={tab} onChange={setTab} options={[{ value: "daily", label: "Daily" }, { value: "report", label: "Monthly report" }]} />
      </PageHead>

      {tab === "daily" ? (
        <>
          <div className="flex items-center gap-2 mb-4 no-print">
            <CalendarCheck2 size={16} className="text-indigo-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls + " w-auto"} />
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Worker</th>
                    <th className="text-left font-medium px-5 py-3">Site</th>
                    <th className="text-left font-medium px-5 py-3">Check-in</th>
                    <th className="text-left font-medium px-5 py-3">Check-out</th>
                    <th className="text-right font-medium px-5 py-3">Hours</th>
                    <th className="text-right font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((w) => {
                    const r = recFor(w.id, date);
                    const hrs = r ? hoursBetween(r.inTime, r.outTime) : 0;
                    return (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3"><p className="font-medium text-slate-800">{w.name}</p><p className="text-xs text-slate-400">{w.skill}</p></td>
                        <td className="px-5 py-3">
                          <select value={r?.projectId ?? siteOf(w.id)} onChange={(e) => setSite(w.id, e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
                            <option value="">— Unassigned —</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-3"><input type="time" value={r?.inTime || ""} onChange={(e) => setTime(w.id, "inTime", e.target.value)} className={inputCls + " w-32"} /></td>
                        <td className="px-5 py-3"><input type="time" value={r?.outTime || ""} onChange={(e) => setTime(w.id, "outTime", e.target.value)} className={inputCls + " w-32"} /></td>
                        <td className="px-5 py-3 text-right font-mono text-slate-700">{hrs ? hrs.toFixed(1) + "h" : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Btn variant="subtle" onClick={() => checkIn(w)}><LogIn size={14} /> In</Btn>
                            <Btn variant="ghost" onClick={() => checkOut(w)}><LogOut size={14} /> Out</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap no-print">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls + " w-auto"} />
            <Btn variant="ghost" onClick={() => window.print()}><Printer size={15} /> Print report</Btn>
          </div>

          <Card className="p-5 mb-4 print-area">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">Manpower spend by site — {month}</h3>
                <p className="text-xs text-slate-500">Payable = days present at that site × daily rate</p>
              </div>
              <p className="font-mono font-bold text-lg text-slate-900">{inr(grandPay)}</p>
            </div>
          </Card>

          {sites.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <p className="text-slate-500">No check-ins recorded for {month}.</p>
            </Card>
          ) : (
            <div className="space-y-4 print-area">
              {sites.map((site) => (
                <Card key={site.pid || "unassigned"} className="overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="text-indigo-500 shrink-0" />
                      <h4 className="font-semibold text-slate-900">{site.name}</h4>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">{inr(site.siteTotal)}</span>
                  </div>
                  <div className="overflow-x-auto scroll-thin">
                    <table className="w-full text-sm min-w-[680px]">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <tr>
                          <th className="text-left font-medium px-5 py-3">Worker</th>
                          <th className="text-right font-medium px-5 py-3">Days present</th>
                          <th className="text-right font-medium px-5 py-3">Total hours</th>
                          <th className="text-right font-medium px-5 py-3">Daily rate</th>
                          <th className="text-right font-medium px-5 py-3">Payable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {site.rows.map((r) => (
                          <tr key={r.w.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3"><p className="font-medium text-slate-800">{r.w.name}</p><p className="text-xs text-slate-400">{r.w.skill}</p></td>
                            <td className="px-5 py-3 text-right font-mono text-slate-700">{r.present}</td>
                            <td className="px-5 py-3 text-right font-mono text-slate-700">{r.totalHours}h</td>
                            <td className="px-5 py-3 text-right font-mono text-slate-600">{inr(r.w.rate)}</td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">{inr(r.payable)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-indigo-50 border-t border-indigo-200">
                          <td className="px-5 py-3 font-semibold text-slate-900" colSpan={4}>Site total</td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{inr(site.siteTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              ))}
              <Card className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-semibold">Total wages payable — all sites</span>
                <span className="font-mono font-bold text-lg">{inr(grandPay)}</span>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
