"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "../../lib/api.js";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Teakworks";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await api.login(userId, password);
      router.push("/"); router.refresh();
    } catch (e) {
      setErr(e.message || "Login failed"); setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lift">{APP_NAME.slice(0, 1)}</div>
          <div>
            <p className="font-bold text-slate-900 leading-tight">{APP_NAME}</p>
            <p className="text-xs text-slate-500">Quote → Cash ERP</p>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-card p-7">
          <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your User ID and password.</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1">User ID</span>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="username"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500" />
            </label>
            {err && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm shadow-sm disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Sign in
            </button>
          </form>
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <p className="flex items-center gap-1.5 font-medium text-slate-600"><ShieldCheck size={14} className="text-indigo-500" /> Demo accounts</p>
            <p className="mt-1.5 font-mono">admin / admin123 <span className="text-slate-400">(admin)</span></p>
            <p className="font-mono">rohit / user123 <span className="text-slate-400">(user)</span></p>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-4">bcrypt-hashed passwords · signed httpOnly cookie session</p>
      </div>
    </div>
  );
}
