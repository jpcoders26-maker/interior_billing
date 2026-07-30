"use client";
import React from "react";
import { X } from "lucide-react";
import { STATUS } from "../lib/status.js";

export const Card = ({ children, className = "", hover = false }) => (
  <div className={
    "bg-white border border-slate-200/80 rounded-2xl shadow-card " +
    (hover ? "transition-shadow hover:shadow-lift " : "") + className
  }>{children}</div>
);

export const Eyebrow = ({ children, className = "" }) => (
  <p className={"text-[11px] uppercase tracking-[0.12em] text-slate-400 font-semibold " + className}>{children}</p>
);

export const Btn = ({ children, onClick, variant = "primary", className = "", type = "button", title, disabled }) => {
  const v = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-sm",
    ghost: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
    dark: "bg-slate-900 hover:bg-slate-800 text-white",
    danger: "bg-white hover:bg-rose-50 text-rose-600 border border-rose-200",
    subtle: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700",
  }[variant];
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled}
      className={"inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 " + v + " " + className}>
      {children}
    </button>
  );
};

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const inputCls =
  "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition";

export const Pill = ({ s }) => {
  const m = STATUS[s] || STATUS.draft;
  return <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + m.cls}>{m.label}</span>;
};

export const Segmented = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
    {options.map((o) => (
      <button key={o.value} onClick={() => onChange(o.value)}
        className={"px-3 py-1.5 rounded-lg text-xs font-medium transition " + (value === o.value ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>
        {o.label}
      </button>
    ))}
  </div>
);

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={"bg-white rounded-2xl shadow-lift w-full my-8 " + (wide ? "max-w-4xl" : "max-w-lg")}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const PageHead = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-6 no-print">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const Row = ({ k, v, bold }) => (
  <div className={"flex justify-between " + (bold ? "text-base" : "")}>
    <span className={bold ? "font-semibold text-slate-900" : "text-slate-500"}>{k}</span>
    <span className={"font-mono " + (bold ? "font-bold text-slate-900" : "text-slate-700")}>{v}</span>
  </div>
);

export const RowDoc = ({ k, v }) => (
  <div className="flex justify-between px-2">
    <span className="text-slate-500">{k}</span>
    <span className="font-mono text-slate-800">{v}</span>
  </div>
);

// Robust numeric input — never goes uncontrolled (fixes blank sq.ft fields)
export const NumIn = ({ label, v, on, w = "w-28" }) => (
  <div>
    <span className="block text-[11px] text-slate-500 mb-1">{label}</span>
    <input type="number" inputMode="decimal" value={v ?? 0}
      onChange={(e) => on(e.target.value === "" ? 0 : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
      className={inputCls + " " + w + " font-mono"} />
  </div>
);

// Company logo with monogram fallback
export const Logo = ({ src, size = 36, className = "" }) => {
  const s = { width: size, height: size };
  if (src) return <img src={src} alt="logo" style={s} className={"rounded-xl object-cover bg-white " + className} />;
  return (
    <div style={s} className={"rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold " + className}>T</div>
  );
};
