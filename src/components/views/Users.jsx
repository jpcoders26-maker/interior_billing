"use client";
import React, { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import { Card, Btn, Field, inputCls, Modal, PageHead, Pill } from "../ui.jsx";
import { api } from "../../lib/api.js";

export default function UsersView({ ctx }) {
  const { users, refreshUsers, user: me, record } = ctx;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const blank = { id: "", userId: "", name: "", email: "", role: "user", active: true, password: "" };

  const save = async (f) => {
    setBusy(true); setErr("");
    try {
      await api.saveUser(f);
      await refreshUsers();
      record((f.id ? "Updated" : "Added") + " user " + f.userId);
      setOpen(false);
    } catch (e) { setErr(e.message || "Could not save"); }
    setBusy(false);
  };
  const del = async (u) => {
    if (!confirm("Delete user " + u.userId + "?")) return;
    try { await api.deleteUser(u.id); await refreshUsers(); record("Deleted user " + u.userId); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <PageHead title="User management" sub="Admin-only. Create accounts and control roles and access.">
        <Btn onClick={() => { setEditing(blank); setErr(""); setOpen(true); }}><Plus size={16} /> Add user</Btn>
      </PageHead>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">User ID</th>
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-left font-medium px-5 py-3">Email</th>
                <th className="text-left font-medium px-5 py-3">Role</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono font-medium text-slate-800">{u.userId}</td>
                  <td className="px-5 py-3 text-slate-700">{u.name}{u.userId === me.userId && <span className="text-xs text-slate-400"> (you)</span>}</td>
                  <td className="px-5 py-3 text-slate-500">{u.email || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={"inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full " + (u.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600")}>
                      {u.role === "admin" ? <ShieldCheck size={12} /> : <UserIcon size={12} />}{u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3"><Pill s={u.active ? "active" : "onhold"} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing({ ...u, password: "" }); setErr(""); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil size={15} /></button>
                      <button onClick={() => del(u)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Edit user" : "Add user"}>
        {editing && <UserForm initial={editing} onSave={save} onCancel={() => setOpen(false)} busy={busy} err={err} />}
      </Modal>
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, busy, err }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="User ID" hint={f.id ? "Cannot be changed" : "Used to sign in"}>
          <input className={inputCls + " font-mono"} value={f.userId} onChange={set("userId")} disabled={!!f.id} />
        </Field>
        <Field label="Role">
          <select className={inputCls} value={f.role} onChange={set("role")}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </div>
      <Field label="Full name"><input className={inputCls} value={f.name} onChange={set("name")} /></Field>
      <Field label="Email"><input className={inputCls} value={f.email} onChange={set("email")} /></Field>
      <Field label={f.id ? "Reset password (leave blank to keep)" : "Password"}>
        <input type="password" className={inputCls} value={f.password} onChange={set("password")} placeholder={f.id ? "••••••••" : "Set a password"} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-indigo-600" /> Active (can sign in)
      </label>
      {err && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(f)} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : null} Save</Btn>
      </div>
    </div>
  );
}
