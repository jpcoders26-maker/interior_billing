"use client";
import React, { useState } from "react";
import { LogIn, LogOut, Printer, CalendarCheck2 } from "lucide-react";
import { Card, Btn, PageHead, Segmented, inputCls } from "../ui.jsx";
import { inr, uid } from "../../lib/format.js";

const hhmm = () => new Date().toTimeString().slice(0, 5);
const minutes = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hoursBetween = (a, b) => { const x = minutes(a), y = minutes(b); if (x == null || y == null || y < x) return 0; return (y - x) / 60; };

export default function AttendanceView({ ctx }) {
  const { workers, attendance, setAttendance, record } = ctx;
  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const recFor = (wid, d) => attendance.find((a) => a.workerId === wid && a.date === d);
  const upsert = (wid, patch) => {
    setAttendance((list) => {
      const i = list.findIndex((a) => a.workerId === wid && a.date === date);
      if (i === -1) return [...list, { id: "A" + uid(), workerId: wid, date, inTime: "", outTime: "", ...patch }];
      const next = [...list]; next[i] = { ...next[i], ...patch }; return next;
    });
  };
  const checkIn = (w) => { upsert(w.id, { inTime: hhmm() }); record("Checked in " + w.name); };
  const checkOut = (w) => { upsert(w.id, { outTime: hhmm() }); record("Checked out " + w.name); };
  const setTime = (wid, field, val) => upsert(wid, { [field]: val });

  // monthly report
  const monthRecs = (wid) => attendance.filter((a) => a.workerId === wid && a.date.startsWith(month) && a.inTime);
  const report = workers.map((w) => {
    const recs = monthRecs(w.id);
    const present = recs.length;
    const totalHours = recs.reduce((s, r) => s + hoursBetween(r.inTime, r.outTime), 0);
    const payable = present * (w.rate || 0);
    return { w, present, totalHours: Math.round(totalHours * 10) / 10, payable };
  });
  const grandPay = report.reduce((s, r) => s + r.payable, 0);

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
              <table className="w-full text-sm min-w-[680px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Worker</th>
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
          <Card className="overflow-hidden print-area">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Monthly wage report — {month}</h3>
              <p className="text-xs text-slate-500">Payable = days present × daily rate</p>
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
                  {report.map((r) => (
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
                    <td className="px-5 py-3 font-semibold text-slate-900" colSpan={4}>Total wages payable</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{inr(grandPay)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
