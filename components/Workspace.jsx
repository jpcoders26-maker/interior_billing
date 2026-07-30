"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "../lib/api.js";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Dashboard from "./views/Dashboard.jsx";
import ClientsView from "./views/Clients.jsx";
import ProjectsView from "./views/Projects.jsx";
import QuotationsView from "./views/Quotations.jsx";
import InvoicesView from "./views/Invoices.jsx";
import ManpowerView from "./views/Manpower.jsx";
import AttendanceView from "./views/Attendance.jsx";
import DocumentsView from "./views/Documents.jsx";
import SettingsView from "./views/Settings.jsx";
import SubscriptionView from "./views/Subscription.jsx";
import AdminView from "./views/Admin.jsx";
import UsersView from "./views/Users.jsx";
import { subStatus } from "../lib/plans.js";

const VIEWS = {
  dashboard: Dashboard, clients: ClientsView, projects: ProjectsView,
  quotes: QuotationsView, invoices: InvoicesView, manpower: ManpowerView,
  attendance: AttendanceView, documents: DocumentsView, settings: SettingsView,
  subscription: SubscriptionView, admin: AdminView, users: UsersView,
};

export default function Workspace() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState("subscription");
  const [drawer, setDrawer] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    try {
      const me = await api.me();        // 401 here => not logged in
      setUser(me.user);
      try {
        const d = await api.data();
        setData(d.data);
      } catch (e) {
        setErr("Could not load your data. " + (e.message || ""));
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-amber-500" size={28} />
          <p className="text-slate-700 mt-3">{err}</p>
          <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold">Retry</button>
        </div>
      </div>
    );
  }
  if (!user || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading your workspace…
      </div>
    );
  }
  return <Shell user={user} initial={data} view={view} setView={setView} drawer={drawer} setDrawer={setDrawer} router={router} />;
}

function usePersisted(key, initial) {
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  const timer = useRef(null);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { api.putState(key, value).catch(() => {}); }, 500);
    return () => clearTimeout(timer.current);
  }, [key, value]);
  return [value, setValue];
}

function Shell({ user, initial, view, setView, drawer, setDrawer, router }) {
  const role = user.role;
  const [company, setCompany] = usePersisted("company", initial.company);
  const [clients, setClients] = usePersisted("clients", initial.clients);
  const [projects, setProjects] = usePersisted("projects", initial.projects);
  const [quotes, setQuotes] = usePersisted("quotes", initial.quotes);
  const [invoices, setInvoices] = usePersisted("invoices", initial.invoices);
  const [workers, setWorkers] = usePersisted("workers", initial.workers);
  const [alloc, setAlloc] = usePersisted("alloc", initial.alloc);
  const [documents, setDocuments] = usePersisted("documents", initial.documents);
  const [attendance, setAttendance] = usePersisted("attendance", initial.attendance || []);
  const [subscription, setSubscription] = usePersisted("subscription", initial.subscription);
  const [log, setLog] = usePersisted("log", initial.log);

  // users are admin-managed via a dedicated endpoint
  const [users, setUsers] = useState([]);
  const refreshUsers = useCallback(async () => {
    if (role !== "admin") return;
    try { const r = await api.listUsers(); setUsers(r.users); } catch {}
  }, [role]);
  useEffect(() => { refreshUsers(); }, [refreshUsers]);

  const clientById = useCallback((id) => clients.find((c) => c.id === id), [clients]);
  const projectById = useCallback((id) => projects.find((p) => p.id === id), [projects]);
  const record = useCallback((action) =>
    setLog((l) => [{ who: user.name + " (" + role + ")", action, at: "Just now" }, ...l]),
    [setLog, user.name, role]);

  const logout = async () => { await api.logout().catch(() => {}); router.push("/login"); router.refresh(); };

  const ctx = {
    role, user, company, setCompany, clients, setClients, projects, setProjects,
    quotes, setQuotes, invoices, setInvoices, workers, setWorkers, alloc, setAlloc,
    docs: documents, setDocs: setDocuments, attendance, setAttendance,
    subscription, setSubscription, users, refreshUsers,
    clientById, projectById, record, setView, log,
  };

  let active = view;
  if ((view === "admin" || view === "users") && role !== "admin") active = "dashboard";

  // Subscription paywall: admins always have free, full access (per product
  // requirement). Everyone else is confined to Subscription & Billing once
  // their plan is inactive/expired — they can still view billing to renew
  // (an admin has to action the renewal) but nothing else opens.
  const { expired: subExpired } = subStatus(subscription);
  const locked = role !== "admin" && subExpired;
  if (locked) active = "subscription";

  const Active = VIEWS[active] || Dashboard;

  return (
    <div className="min-h-screen flex print:block">
      <Sidebar view={active} setView={setView} role={role} open={drawer} onClose={() => setDrawer(false)} user={user} company={company} locked={locked} />
      <main className="flex-1 min-w-0">
        <Topbar view={active} user={user} company={company} subscription={subscription} locked={locked} onMenu={() => setDrawer(true)} onLogout={logout} onSubscription={() => setView("subscription")} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
          <Active ctx={ctx} />
        </div>
      </main>
    </div>
  );
}
