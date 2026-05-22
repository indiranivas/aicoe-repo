import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { nodeId, title, dueDate } = await req.json()
  try {
    const milestone = await prisma.milestone.create({
      data: { nodeId, title, dueDate: dueDate ? new Date(dueDate) : null },
    })
    return NextResponse.json(milestone)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}
