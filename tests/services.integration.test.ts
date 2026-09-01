// Integration tests against the real service layer + a real Postgres
// database — not runnable in this sandbox (no Docker/Postgres available
// here, see docs/ARCHITECTURE-AUDIT.md §5). CI runs these against a
// disposable Postgres service container (see .github/workflows/ci.yml).
//
// To run locally: `docker compose up -d postgres`, `npm run db:migrate`,
// then `RUN_DB_TESTS=1 npm test`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProjectInput } from "@/lib/validation/projects";

const RUN = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!RUN)("service layer against a real database", () => {
  let prisma: typeof import("@/lib/server/prisma").prisma;
  let clientsService: typeof import("@/services/clients.service");
  let projectsService: typeof import("@/services/projects.service");
  let quotesService: typeof import("@/services/quotes.service");
  let usersService: typeof import("@/services/users.service");
  let subscriptionService: typeof import("@/services/subscription.service");

  const TEST_PREFIX = "ITEST-";

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/server/prisma"));
    clientsService = await import("@/services/clients.service");
    projectsService = await import("@/services/projects.service");
    quotesService = await import("@/services/quotes.service");
    usersService = await import("@/services/users.service");
    subscriptionService = await import("@/services/subscription.service");
  });

  afterAll(async () => {
    // Clean up anything this file created, identified by the id prefix.
    await prisma.quote.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.project.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.client.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.user.deleteMany({ where: { userId: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  it("replaceClients upserts and removes missing rows in one transaction", async () => {
    const id = `${TEST_PREFIX}C1`;
    const before = await clientsService.listClients();
    const created = await clientsService.replaceClients([
      ...before,
      { id, name: "Integration Test Client", contact: "", gstin: "", stateCode: "27", phone: "", email: "", billing: "", shipping: "" },
    ]);
    expect(created.find((c) => c.id === id)).toBeDefined();

    // Removing it from the array should delete the row.
    const afterRemoval = await clientsService.replaceClients(before);
    expect(afterRemoval.find((c) => c.id === id)).toBeUndefined();
  });

  it("prevents deleting a client that a project still references (FK Restrict -> clean 409-mappable error)", async () => {
    const clientId = `${TEST_PREFIX}C2`;
    const projectId = `${TEST_PREFIX}P1`;
    const clients = await clientsService.listClients();
    await clientsService.replaceClients([
      ...clients,
      { id: clientId, name: "Has A Project", contact: "", gstin: "", stateCode: "27", phone: "", email: "", billing: "", shipping: "" },
    ]);
    // listProjects()'s DTO widens `status` to `string` for the JSON
    // response; replaceProjects() takes the stricter Zod-validated input
    // shape. Round-tripping existing rows back through it in a test is a
    // safe, deliberate narrowing — the values only ever came from that same
    // literal union in the first place.
    const projects = (await projectsService.listProjects()) as unknown as ProjectInput[];
    await projectsService.replaceProjects([
      ...projects,
      { id: projectId, name: "Blocking Project", clientId, status: "planning", progress: 0, start: "", due: "" },
    ]);

    // Attempting to remove the client (without removing the project first) must throw.
    const clientsWithoutTarget = (await clientsService.listClients()).filter((c) => c.id !== clientId);
    await expect(clientsService.replaceClients(clientsWithoutTarget)).rejects.toBeTruthy();

    // cleanup for afterAll ordering (project before client)
    const projectsWithoutTarget = ((await projectsService.listProjects()) as unknown as ProjectInput[]).filter(
      (p) => p.id !== projectId
    );
    await projectsService.replaceProjects(projectsWithoutTarget);
  });

  it("stores and reconciles a quote's nested rooms/items JSON tree exactly", async () => {
    const clientId = `${TEST_PREFIX}C3`;
    const clients = await clientsService.listClients();
    await clientsService.replaceClients([
      ...clients,
      { id: clientId, name: "Quote Client", contact: "", gstin: "", stateCode: "27", phone: "", email: "", billing: "", shipping: "" },
    ]);

    const quoteId = `${TEST_PREFIX}Q1`;
    const rooms = [{ id: 1, name: "Kitchen", items: [{ id: 1, desc: "Cabinet", hsn: "9403", mode: "sqft" as const, length: 5, width: 4, units: 1, rate: 1000 }] }];
    const saved = await quotesService.replaceQuotes([
      { id: quoteId, number: "ITEST/001", taxMode: "gst", clientId, projectId: "", date: new Date("2025-01-01T00:00:00.000Z"), status: "draft", gstRate: 18, discount: 0, rooms },
    ]);
    const quote = saved.find((q) => q.id === quoteId);
    expect(quote?.rooms).toEqual(rooms);
    expect(quote?.date).toBe("2025-01-01");
  });

  it("enforces the subscription singleton (id is always 1)", async () => {
    const now = Date.now();
    const saved = await subscriptionService.saveSubscription({
      plan: "Monthly",
      status: "active",
      startedAt: new Date(now),
      expiresAt: new Date(now + 30 * 86_400_000),
    });
    expect(saved.plan).toBe("Monthly");
    const rowCount = await prisma.subscription.count();
    expect(rowCount).toBe(1);
  });

  it("rejects creating a second user with a duplicate userId", async () => {
    const userId = `${TEST_PREFIX}dup`;
    await usersService.upsertUser({ id: "", userId, name: "First", role: "user", active: true, password: "somepassword123" });
    await expect(
      usersService.upsertUser({ id: "", userId, name: "Second", role: "user", active: true, password: "somepassword123" })
    ).rejects.toBeTruthy();
  });
});
