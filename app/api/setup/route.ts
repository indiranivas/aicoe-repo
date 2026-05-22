import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { setupSchema } from "@/lib/validations"

export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({ needsSetup: count === 0 })
  } catch {
    return NextResponse.json({ needsSetup: true })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = setupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Name, email, and password (min 8 chars) required", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    // Use a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.count()
      if (existing > 0) {
        return { error: "Setup already complete" }
      }

      const hash = await bcrypt.hash(password, 12)
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hash,
          role: "admin",
        },
      })
      return { ok: true, id: user.id }
    })

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
