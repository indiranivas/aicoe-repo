import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

// GET /api/settings
export async function GET() {
  const { error } = await requireAuth("admin")
  if (error) return error

  try {
    const settings = await prisma.appSetting.findMany()
    const map: Record<string, string> = {}
    settings.forEach((s) => { map[s.key] = s.value })
    return NextResponse.json(map)
  } catch (err) {
    console.error("[api/settings] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PATCH /api/settings — update a setting
export async function PATCH(req: Request) {
  const { error, session } = await requireAuth("admin")
  if (error) return error

  try {
    const body = await req.json()
    const { key, value } = body

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }

    await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value ?? "") },
      create: { key, value: String(value ?? "") },
    })

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: "update",
        entityType: "setting",
        entityId: key,
        details: JSON.stringify({ key, value }),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/settings] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}
