import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createUserSchema, updateSettingSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

// GET /api/users — list all users (any authenticated user)
export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, avatar: true, isActive: true,
        createdAt: true, updatedAt: true,
        _count: {
          select: {
            ownedActivities: true,
            assignedActivities: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(users)
  } catch (err) {
    console.error("[api/users] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// POST /api/users — invite/create a new user (admin only)
export async function POST(req: Request) {
  const { error, session } = await requireAuth("admin")
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, role, department } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hash,
        role,
        department: department ?? "",
      },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, isActive: true, createdAt: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: "create",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({ name, email, role }),
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error("[api/users] POST error:", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
