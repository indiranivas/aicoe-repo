import { auth } from "@/auth"
import { NextResponse } from "next/server"

export type UserRole = "admin" | "manager" | "member" | "viewer"

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
}

/**
 * Get the authenticated session or return a 401 response.
 * Optionally require a minimum role level.
 */
export async function requireAuth(minRole?: UserRole) {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null }
  }

  if (minRole) {
    const userLevel = ROLE_HIERARCHY[(session.user.role as UserRole) ?? "viewer"] ?? 1
    const requiredLevel = ROLE_HIERARCHY[minRole]
    if (userLevel < requiredLevel) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null }
    }
  }

  return { error: null, session }
}

/**
 * Check if a user has at least the specified role.
 */
export function hasMinRole(userRole: string, minRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[(userRole as UserRole) ?? "viewer"] ?? 1
  return userLevel >= ROLE_HIERARCHY[minRole]
}
