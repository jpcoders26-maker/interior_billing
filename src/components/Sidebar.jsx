"use client";
import React from "react";
import {
  LayoutDashboard, Users as UsersIcon, FolderKanban, FileText, ReceiptIndianRupee,
  HardHat, FolderArchive, Settings, ShieldCheck, X, CalendarCheck2, CreditCard, UserCog, Lock,
} from "lucide-react";
import { Logo } from "./ui.jsx";

// "Account" (Subscription) leads the nav on purpose: this product is sold on a
// subscription, so plan status/renewal should be the first thing a user sees —
// not a buried settings sub-page.
const GROUPS = [
  { title: "Account", items: [{ id: "subscription", label: "Subscription & Billing", icon: CreditCard }] },
  { title: "Workspace", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { title: "Sales", items: [
    { id: "clients", label: "Clients", icon: UsersIcon },
    { id: "quotes", label: "Quotations", icon: FileText },
    { id: "invoices", label: "Invoices & Bills", icon: ReceiptIndianRupee },
  ]},
  { title: "Delivery", items: [
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "manpower", label: "Manpower", icon: HardHat },
    { id: "attendance", label: "Attendance", icon: CalendarCheck2 },
    { id: "documents", label: "Documents", icon: FolderArchive },
  ]},
  { title: "Settings", items: [
    { id: "settings", label: "Company Settings", icon: Settings },
  ]},
  { title: "Admin", admin: true, items: [
    { id: "admin", label: "Admin Oversight", icon: ShieldCheck },
    { id: "users", label: "User Management", icon: UserCog },
  ]},
];

function NavInner({ view, setView, role, locked }) {
  return (
    <>
      {GROUPS.filter((g) => !g.admin || role === "admin").map((g) => (
        <div key={g.title} className="mb-4">
          <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">{g.title}</p>
          <div className="space-y-0.5">
            {g.items.map((n) => {
              const Icon = n.icon;
              const active = view === n.id;
              const itemLocked = locked && n.id !== "subscription";
              return (
                <button key={n.id} onClick={() => setView(n.id)}
                  title={itemLocked ? "Locked — renew your subscription to access this" : undefined}
                  className={
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors pl-2.5 border-l-2 " +
                    (active
                      ? "bg-gradient-to-r from-indigo-500/20 to-transparent text-white border-indigo-400"
                      : itemLocked
                      ? "border-transparent text-slate-600"
                      : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white")
                  }>
                  <Icon size={18} /> <span className="flex-1 text-left">{n.label}</span>
                  {itemLocked && <Lock size={13} className="text-slate-500" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function Brand({ company }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Logo src={company?.logo} size={36} />
      <div className="min-w-0">
        <p className="text-white font-semibold leading-tight text-sm truncate">{company?.name || "Your Company"}</p>
        <p className="text-[11px] text-slate-400">Quote → Cash ERP</p>
      </div>
    </div>
  );
}

export default function Sidebar({ view, setView, role, open, onClose, user, company, locked }) {
  const pick = (id) => { setView(id); onClose?.(); };
  return (
    <>
      <aside className="no-print hidden lg:flex w-[252px] shrink-0 flex-col min-h-screen sticky top-0 bg-slate-950 text-slate-300">
        <div className="px-5 py-5 border-b border-white/10"><Brand company={company} /></div>
        <nav className="flex-1 p-3 overflow-y-auto scroll-thin"><NavInner view={view} setView={pick} role={role} locked={locked} /></nav>
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold">{(user?.name || "U").slice(0, 1)}</div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 capitalize">{role} account</p>
          </div>
        </div>
      </aside>

      {open && (
        <div className="no-print lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-slate-950 text-slate-300 flex flex-col shadow-lift">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <Brand company={company} />
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10"><X size={18} /></button>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto scroll-thin"><NavInner view={view} setView={pick} role={role} locked={locked} /></nav>
          </aside>
        </div>
      )}
    </>
  );
}
