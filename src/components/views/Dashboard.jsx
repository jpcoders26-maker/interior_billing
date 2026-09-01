"use client";
import React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Wallet, AlertTriangle, TrendingUp, FolderKanban, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "../ui.jsx";
import { inr, inrShort } from "../../lib/format.js";
import { docTotals } from "../../lib/billing.js";

export default function Dashboard({ ctx }) {
  const { invoices, quotes, projects, company, clientById, user } = ctx;
  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + docTotals(i, company, clientById(i.clientId)).grand, 0);
  const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + docTotals(i, company, clientById(i.clientId)).grand, 0);
  const pipeline = quotes.filter((q) => q.status === "sent" || q.status === "draft").reduce((s, q) => s + docTotals(q, company, clientById(q.clientId)).grand, 0);
  const activeProj = projects.filter((p) => p.status === "active").length;

  const revenueData = [
    { m: "Jan", v: 2950000 }, { m: "Feb", v: 1200000 }, { m: "Mar", v: 3680000 },
    { m: "Apr", v: 2100000 }, { m: "May", v: 1750000 }, { m: "Jun", v: 2480000 },
  ];
  const quoteVsInv = [
    { m: "Mar", quoted: 4200000, invoiced: 3680000 }, { m: "Apr", quoted: 3100000, invoiced: 2100000 },
    { m: "May", quoted: 2600000, invoiced: 1750000 }, { m: "Jun", quoted: 3300000, invoiced: 2480000 },
  ];
  const statusData = [
    { name: "Active", value: projects.filter((p) => p.status === "active").length, c: "#6366f1" },
    { name: "Planning", value: projects.filter((p) => p.status === "planning").length, c: "#94a3b8" },
    { name: "Completed", value: projects.filter((p) => p.status === "completed").length, c: "#10b981" },
  ];
  const KPIs = [
    { label: "Collected", value: inrShort(collected), icon: Wallet, tone: "text-emerald-600 bg-emerald-50", delta: "+12%", up: true },
    { label: "Outstanding", value: inrShort(outstanding), icon: AlertTriangle, tone: "text-rose-600 bg-rose-50", delta: "-4%", up: false },
    { label: "Quote pipeline", value: inrShort(pipeline), icon: TrendingUp, tone: "text-indigo-600 bg-indigo-50", delta: "+8%", up: true },
    { label: "Active projects", value: activeProj, icon: FolderKanban, tone: "text-sky-600 bg-sky-50", delta: "+1", up: true },
  ];

  return (
    <div>
      <div className="mb-6 no-print">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {String(user?.name || "").split(" ")[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">Here is how the workshop is doing today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {KPIs.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4" hover>
              <div className="flex items-start justify-between">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + k.tone}><Icon size={18} /></div>
                <span className={"inline-flex items-center gap-0.5 text-xs font-medium " + (k.up ? "text-emerald-600" : "text-rose-600")}>
                  {k.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{k.delta}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight mt-3">{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">Revenue (last 6 months)</h3>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={revenueData} margin={{ left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
              <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={inrShort} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Project status</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {statusData.map((d, i) => <Cell key={i} fill={d.c} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.c }} />{d.name}</span>
                <span className="font-mono text-slate-600">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">Quoted vs invoiced</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={quoteVsInv} margin={{ left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
              <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={inrShort} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Bar dataKey="quoted" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
              <Bar dataKey="invoiced" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Recent activity</h3>
          <div className="divide-y divide-slate-100">
            {ctx.log.slice(0, 6).map((e, i) => (
              <div key={i} className="py-2.5 text-sm">
                <p className="text-slate-700 leading-snug">{e.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">{e.who} · {e.at}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
