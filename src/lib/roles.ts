import type { AdminUser, UserRole } from "./types";

export const roleLabels: Record<UserRole, string> = { editor: "Éditeur", admin: "Administrateur", developer: "Développeur" };

/** Administrators and developers (who can do everything an administrator can). */
export const isAdmin = (user: Pick<AdminUser, "role"> | null | undefined) => user?.role === "admin" || user?.role === "developer";
export const isDeveloper = (user: Pick<AdminUser, "role"> | null | undefined) => user?.role === "developer";
