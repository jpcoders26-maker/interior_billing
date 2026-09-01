import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/server/http";
import type { UpsertUserInput } from "@/lib/validation/users";
import { Role } from "@prisma/client";

export interface PublicUserDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
}

function toPublic(row: { id: string; userId: string; name: string; email: string | null; role: Role; active: boolean }): PublicUserDTO {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email ?? "",
    role: row.role === Role.ADMIN ? "admin" : "user",
    active: row.active,
  };
}

export async function listUsers(): Promise<PublicUserDTO[]> {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toPublic);
}

export async function findUserByLoginId(idOrEmail: string) {
  const q = idOrEmail.toLowerCase();
  return prisma.user.findFirst({
    where: { OR: [{ userId: { equals: q, mode: "insensitive" } }, { email: { equals: q, mode: "insensitive" } }] },
  });
}

export async function upsertUser(input: UpsertUserInput): Promise<PublicUserDTO> {
  const role = input.role === "admin" ? Role.ADMIN : Role.USER;

  if (input.id) {
    const existing = await prisma.user.findUnique({ where: { id: input.id } });
    if (!existing) throw new NotFoundError("User not found");
    const data: { name: string; email: string | null; role: Role; active: boolean; passwordHash?: string } = {
      name: input.name,
      email: input.email || null,
      role,
      active: input.active,
    };
    if (input.password) data.passwordHash = await hashPassword(input.password);
    const updated = await prisma.user.update({ where: { id: input.id }, data });
    return toPublic(updated);
  }

  const clash = await findUserByLoginId(input.userId);
  if (clash) throw new ConflictError("That User ID already exists");
  const passwordHash = await hashPassword(input.password || crypto.randomUUID());
  const created = await prisma.user.create({
    data: { userId: input.userId, name: input.name, email: input.email || null, role, active: input.active, passwordHash },
  });
  return toPublic(created);
}

export async function deleteUser(id: string, requesterUserId: string): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("Not found");
  if (target.userId === requesterUserId) throw new BadRequestError("You cannot delete your own account");
  await prisma.user.delete({ where: { id } });
}
