"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { CATEGORY_COLORS } from "@/lib/types"
import type { NodeCategory } from "@/lib/types"
import { cn } from "@/lib/cn"

interface Update {
  id: string
  text: string
  author: string
  createdAt: string
  nodeId: string
  node: { title: string; category: string }
}

interface SimpleNode { id: string; title: string; category: string }

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([])
  const [nodes, setNodes] = useState<SimpleNode[]>([])
  const [text, setText] = useState("")
  const [author, setAuthor] = useState("")
  const [nodeId, setNodeId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/updates").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
    ]).then(([upd, data]) => {
      setUpdates(upd)
      setNodes(data.nodes.map((n: { id: string; title: string; category: string }) => ({ id: n.id, title: n.title, category: n.category })))
      if (data.nodes.length > 0) setNodeId(data.nodes[0].id)
    })
  }, [])

  async function handleAdd() {
    if (!text.trim() || !nodeId) return
    setSaving(true)
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, text: text.trim(), author: author.trim() }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setUpdates((prev) => [created, ...prev])
      setText("")
      toast.success("Update logged")
    } catch {
      toast.error("Failed to save update")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/updates/${id}`, { method: "DELETE" })
      setUpdates((prev) => prev.filter((u) => u.id !== id))
      toast.success("Update removed")
    } catch {
      toast.error("Failed to delete")
    }
  }

  // Group by date
  const grouped = updates.reduce<Record<string, Update[]>>((acc, u) => {
    const key = format(new Date(u.createdAt), "yyyy-MM-dd")
    ;(acc[key] = acc[key] ?? []).push(u)
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="px-6 py-4 border-b border-gray-800 shrink-0">
        <h1 className="text-base font-semibold text-gray-100">Updates & Accomplishments</h1>
        <p className="text-xs text-gray-500 mt-0.5">Log progress, wins, and blockers across activities</p>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">

        {/* Add update form */}
        <div className="w-72 shrink-0 border-r border-gray-800 p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Log Update</p>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Activity</label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              className="w-full px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Update</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened? What was accomplished? Any blockers?"
              rows={5}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !text.trim() || !nodeId}
            className={cn(
              "h-8 text-xs font-medium rounded-md transition-colors",
              text.trim() && nodeId
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            )}
          >
            {saving ? "Saving…" : "Log Update"}
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-sm">No updates yet</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {Object.entries(grouped).map(([date, dayUpdates]) => (
                <div key={date}>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </p>
                  <div className="space-y-3">
                    {dayUpdates.map((u) => {
                      const color = CATEGORY_COLORS[u.node.category as NodeCategory] ?? "#374151"
                      return (
                        <div key={u.id} className="flex gap-3 group">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                            <div className="w-px flex-1 bg-gray-800 mt-1" />
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs text-gray-200 leading-snug">{u.text}</p>
                                <p className="text-[10px] text-gray-600 mt-1">
                                  <span style={{ color }}>{u.node.title}</span>
                                  {u.author && <span> · {u.author}</span>}
                                  <span> · {format(new Date(u.createdAt), "h:mm a")}</span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDelete(u.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all p-1"
                                aria-label="Delete update"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
