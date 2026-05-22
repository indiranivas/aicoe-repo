import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nodeId = searchParams.get("nodeId")
  try {
    const updates = await prisma.nodeUpdate.findMany({
      where: nodeId ? { nodeId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { node: { select: { title: true, category: true } } },
      take: 100,
    })
    return NextResponse.json(updates)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { nodeId, text, author } = await req.json()
  try {
    const update = await prisma.nodeUpdate.create({
      data: { nodeId, text, author: author ?? "" },
      include: { node: { select: { title: true, category: true } } },
    })
    return NextResponse.json(update)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}
