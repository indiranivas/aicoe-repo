import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

// GET /api/audit — list audit logs (admin only)
export async function GET(req: Request) {
  const { error } = await requireAuth("admin")
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const entityType = searchParams.get("entityType")

  try {
    const logs = await prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(logs)
  } catch (err) {
    console.error("[api/audit] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
