// Orchestrates the "whole-slice state" contract that GET /api/data and
// PUT /api/state/[key] expose to the client — see
// docs/ARCHITECTURE-AUDIT.md §4.4/§4.5 for why this shape was kept instead
// of moving to per-record REST endpoints (it's components/Workspace.jsx's
// entire data-loading/persistence model; changing it means rewriting all 15
// view components with no way to browser-test the result here).
import { ForbiddenError } from "@/lib/server/session";
import { getCompany, saveCompany } from "./company.service";
import { getSubscription, saveSubscription } from "./subscription.service";
import { listClients, replaceClients } from "./clients.service";
import { listProjects, replaceProjects } from "./projects.service";
import { listWorkers, replaceWorkers, listAllocations, replaceAllocations } from "./workers.service";
import { listAttendance, replaceAttendance } from "./attendance.service";
import { listDocuments, replaceDocuments } from "./documents.service";
import { listActivity, appendActivity } from "./activity.service";
import { listQuotes, replaceQuotes } from "./quotes.service";
import { listInvoices, replaceInvoices } from "./invoices.service";

import { companySchema } from "@/lib/validation/company";
import { subscriptionSchema } from "@/lib/validation/subscription";
import { clientListSchema } from "@/lib/validation/clients";
import { projectListSchema } from "@/lib/validation/projects";
import { workerListSchema, allocationListSchema } from "@/lib/validation/workers";
import { attendanceListSchema } from "@/lib/validation/attendance";
import { documentListSchema } from "@/lib/validation/documents";
import { activityListSchema } from "@/lib/validation/activity";
import { quoteListSchema } from "@/lib/validation/quotes";
import { invoiceListSchema } from "@/lib/validation/invoices";

export const STATE_KEYS = [
  "company",
  "clients",
  "projects",
  "quotes",
  "invoices",
  "workers",
  "alloc",
  "documents",
  "log",
  "subscription",
  "attendance",
] as const;
export type StateKey = (typeof STATE_KEYS)[number];

export interface WorkspaceRole {
  role: "admin" | "user";
}

/** Full aggregate for GET /api/data — never includes users/password hashes. */
export async function getWorkspaceState() {
  const [company, clients, projects, quotes, invoices, workers, alloc, documents, log, subscription, attendance] =
    await Promise.all([
      getCompany(),
      listClients(),
      listProjects(),
      listQuotes(),
      listInvoices(),
      listWorkers(),
      listAllocations(),
      listDocuments(),
      listActivity(),
      getSubscription(),
      listAttendance(),
    ]);
  return { company, clients, projects, quotes, invoices, workers, alloc, documents, log, subscription, attendance };
}

/**
 * Validates + persists one state slice. `subscription` is admin-only — the
 * old code let any authenticated user change it via this same endpoint even
 * though the UI hid the control for non-admins (see
 * docs/ARCHITECTURE-AUDIT.md §2.1). Every other key follows the app's
 * existing shared-workspace model: any authenticated staff member can edit
 * the shared business data, matching what the UI already allowed.
 */
export async function saveStateSlice(key: StateKey, value: unknown, actor: WorkspaceRole) {
  switch (key) {
    case "subscription": {
      if (actor.role !== "admin") throw new ForbiddenError("Only admins can change the subscription plan");
      return saveSubscription(subscriptionSchema.parse(value));
    }
    case "company":
      return saveCompany(companySchema.parse(value));
    case "clients":
      return replaceClients(clientListSchema.parse(value));
    case "projects":
      return replaceProjects(projectListSchema.parse(value));
    case "quotes":
      return replaceQuotes(quoteListSchema.parse(value));
    case "invoices":
      return replaceInvoices(invoiceListSchema.parse(value));
    case "workers":
      return replaceWorkers(workerListSchema.parse(value));
    case "alloc":
      return replaceAllocations(allocationListSchema.parse(value));
    case "documents":
      return replaceDocuments(documentListSchema.parse(value));
    case "attendance":
      return replaceAttendance(attendanceListSchema.parse(value));
    case "log":
      return appendActivity(activityListSchema.parse(value));
  }
}
