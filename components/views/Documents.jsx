"use client";
import React, { useState, useRef } from "react";
import { Upload, FolderArchive, FileText, Trash2, Eye, Download, AlertTriangle, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { Card, Btn, PageHead } from "../ui.jsx";

// Files are stored as data URLs inside document records (same pattern as the
// company logo in Settings). Anything under MAX_FILE is read fully so it can
// actually be opened/previewed/downloaded later — previously only the file's
// *name* was kept, which is why "opening" an uploaded file did nothing.
const MAX_FILE = 8 * 1024 * 1024; // 8MB per file (in-memory demo store)

function kindOf(name) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return "Image";
  if (/\.pdf$/i.test(name)) return "PDF";
  if (/\.(doc|docx)$/i.test(name)) return "Word";
  if (/\.(xls|xlsx|csv)$/i.test(name)) return "Sheet";
  return "File";
}
function fmtSize(bytes) {
  return bytes / 1024 / 1024 >= 1 ? (bytes / 1048576).toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";
}
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read " + file.name));
    reader.readAsDataURL(file);
  });
}

const ICONS = { Image: ImageIcon, PDF: FileText, Word: FileText, Sheet: FileText, File: FileIcon };

export default function DocumentsView({ ctx }) {
  const { docs, setDocs, projects, record } = ctx;
  const [pid, setPid] = useState(projects[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef();
  const projDocs = docs.filter((d) => d.projectId === pid);

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setNote(""); setBusy(true);
    const added = [];
    const skipped = [];
    for (const f of files) {
      if (f.size > MAX_FILE) { skipped.push(f.name); continue; }
      try {
        const dataUrl = await readAsDataUrl(f);
        added.push({
          id: "D" + (Date.now() + Math.random()).toString().slice(-7),
          projectId: pid, name: f.name, kind: kindOf(f.name), size: fmtSize(f.size),
          date: new Date().toISOString().slice(0, 10), type: f.type || "", dataUrl,
        });
      } catch {
        skipped.push(f.name);
      }
    }
    if (added.length) { setDocs((d) => [...d, ...added]); record(added.length + " file(s) uploaded to project"); }
    if (skipped.length) setNote("Skipped (too large or unreadable, max 8MB each): " + skipped.join(", "));
    setBusy(false);
  };

  const del = (id) => setDocs((d) => d.filter((x) => x.id !== id));

  const open = (d) => {
    if (!d.dataUrl) { setNote(d.name + " has no stored file content (it was added before file storage was enabled) — re-upload it to open or download it."); return; }
    const win = window.open();
    if (win) { win.document.title = d.name; win.location.href = d.dataUrl; }
  };

  const download = (d) => {
    if (!d.dataUrl) { setNote(d.name + " has no stored file content — re-upload it."); return; }
    const a = document.createElement("a");
    a.href = d.dataUrl; a.download = d.name;
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div>
      <PageHead title="Documents & Designs" sub="Store and organise site files — drawings, approvals, measurements.">
        <Btn onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={16} /> {busy ? "Uploading…" : "Upload files"}</Btn>
        <input ref={fileRef} type="file" multiple hidden onChange={onUpload} />
      </PageHead>

      {note && (
        <p className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {note}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-5 no-print">
        {projects.map((p) => (
          <button key={p.id} onClick={() => setPid(p.id)} className={"px-3.5 py-2 rounded-xl text-sm font-medium transition " + (pid === p.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{p.name}</button>
        ))}
      </div>
      {projDocs.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FolderArchive size={40} className="mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">No files yet for this project.</p>
          <p className="text-sm text-slate-400">Upload drawings, approvals or measurement sheets to get started.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projDocs.map((d) => {
            const Icon = ICONS[d.kind] || FileIcon;
            return (
              <Card key={d.id} className="p-4 flex items-start gap-3" hover>
                <button onClick={() => open(d)} title="Open" className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 hover:bg-indigo-100"><Icon size={18} /></button>
                <button onClick={() => open(d)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-slate-800 truncate hover:underline">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.kind} · {d.size} · {d.date}{!d.dataUrl && <span className="text-amber-500"> · not stored</span>}</p>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => open(d)} title="Open" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Eye size={15} /></button>
                  <button onClick={() => download(d)} title="Download" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Download size={15} /></button>
                  <button onClick={() => del(d.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400"><Trash2 size={15} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
