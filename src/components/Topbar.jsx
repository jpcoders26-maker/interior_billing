"use client";
import React, { useState } from "react";
import { Menu, Search, LogOut, ChevronDown, AlertTriangle, Clock } from "lucide-react";
import { daysLeft } from "../lib/plans.js";

const TITLES = {
  subscription: "Subscription & Billing", dashboard: "Dashboard", clients: "Clients", projects: "Projects", quotes: "Quotations",
  invoices: "Invoices & Bills", manpower: "Manpower", attendance: "Attendance", documents: "Documents",
  settings: "Company Settings", admin: "Admin Oversight", users: "User Management",
};

export default function Topbar({ view, user, company, subscription, locked, onMenu, onLogout, onSubscription }) {
  const [menu, setMenu] = useState(false);
  const left = subscription ? daysLeft(subscription.expiresAt) : null;
  const expired = subscription ? (subscription.status !== "active" || left <= 0) : false;

  return (
    <header className="no-print sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Menu size={18} /></button>
        <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
          <span className="hidden sm:inline truncate max-w-[160px]">{company?.name || "Your Company"}</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="text-slate-700 font-medium truncate">{TITLES[view] || ""}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {subscription && (
            <button onClick={onSubscription}
              className={
                "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition " +
                (expired ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100")
              }>
              {expired ? <AlertTriangle size={13} /> : <Clock size={13} />}
              {expired ? "Subscription expired" : subscription.plan + " · " + left + "d left"}
            </button>
          )}
          <div className="relative hidden md:block">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input placeholder="Search…" className="w-48 lg:w-56 pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:bg-white transition" />
          </div>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold">{(user?.name || "U").slice(0, 1)}</span>
              <span className="hidden sm:block text-sm text-slate-700 font-medium max-w-[120px] truncate">{user?.name}</span>
              <ChevronDown size={15} className="text-slate-400" />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lift p-1.5 z-40">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  <p className="text-[11px] mt-1 inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 capitalize">{user?.role}</p>
                </div>
                <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {locked && (
        <div className="bg-rose-600 text-white text-xs sm:text-sm px-4 sm:px-6 py-2 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Your subscription has expired — access is limited to Subscription &amp; Billing. Ask your admin to renew the plan.</span>
        </div>
      )}
    </header>
  );
}
