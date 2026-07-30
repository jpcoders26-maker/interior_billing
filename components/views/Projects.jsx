"use client";
import React from "react";
import { Paperclip } from "lucide-react";
import { Card, Pill, PageHead } from "../ui.jsx";
import { inrShort } from "../../lib/format.js";

export default function ProjectsView({ ctx }) {
  const { projects, setProjects, clientById, docs } = ctx;
  const updateProgress = (id, val) => setProjects((ps) => ps.map((p) => p.id === id
    ? { ...p, progress: val, status: val >= 100 ? "completed" : val > 0 ? "active" : "planning" } : p));
  return (
    <div>
      <PageHead title="Projects" sub="Track delivery progress per site. Attach files in Documents." />
      <div className="space-y-4">
        {projects.map((p) => {
          const c = clientById(p.clientId);
          const fileCount = docs.filter((d) => d.projectId === p.id).length;
          return (
            <Card key={p.id} className="p-5" hover>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 flex-wrap"><h3 className="font-semibold text-slate-900">{p.name}</h3><Pill s={p.status} /></div>
                  <p className="text-sm text-slate-500 mt-0.5">{c?.name} · Due {p.due}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-slate-900">{inrShort(p.value)}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-0.5"><Paperclip size={12} /> {fileCount} files</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5"><span>Progress</span><span className="font-mono font-medium text-slate-700">{p.progress}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: p.progress + "%" }} /></div>
                <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => updateProgress(p.id, Number(e.target.value))} className="w-full mt-2 accent-indigo-600 no-print" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
