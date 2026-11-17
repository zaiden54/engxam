import { AppError } from "../../lib/errors";
export type Role = "admin" | "teacher" | "student";
export type Actor = { id: string; authId: string | null; email: string; fullName: string; role: Role; active: boolean; version: number };
export function requireRole(actor: Actor, role: Role) {
  if (!actor.active || actor.role !== role) throw new AppError("FORBIDDEN", "Действие недоступно.");
}
export function canReadEnrollment(actor: Actor, enrollment: { studentId: string; teacherId: string }) {
  return actor.active && (actor.role === "admin" || (actor.role === "teacher" && enrollment.teacherId === actor.id) || (actor.role === "student" && enrollment.studentId === actor.id));
}
