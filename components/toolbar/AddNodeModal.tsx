"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useGraphStore } from "@/store/graphStore"
import { cn } from "@/lib/cn"
import { ALL_CATEGORIES, ALL_STATUSES } from "@/lib/types"
import type { ActivityNode, NodeCategory, NodeStatus } from "@/lib/types"

interface Props {
  onClose: () => void
}

export default function AddNodeModal({ onClose }: Props) {
  const nodes = useGraphStore((s) => s.nodes)
  const addActivityNode = useGraphStore((s) => s.addActivityNode)
  const selectNode = useGraphStore((s) => s.selectNode)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<NodeCategory>("Customer Zero")
  const [status, setStatus] = useState<NodeStatus>("Idea")
  const [description, setDescription] = useState("")
  const [owner, setOwner] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [progress, setProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then((users) => {
      if (Array.isArray(users)) setTeamMembers(users.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    setSaving(true)
    setTitleError(false)

    const id = crypto.randomUUID()
    const position = getNewNodePosition(nodes.map((n) => n.position))

    const node: ActivityNode = {
      id,
      title: title.trim(),
      description,
      category,
      owner: ownerName,
      assigneeId: owner || null,
      status,
      progress,
      priority: "Medium",
      startDate: null,
      dueDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      notes: "",
      links: [],
      artifacts: [],
      position,
    }

    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node }),
      })
      if (!res.ok) throw new Error("Save failed")
      addActivityNode(node)
      selectNode(id)
      onClose()
    } catch {
      toast.error("Could not save — check the server.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-100">New Node</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-600 hover:text-gray-300 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Title *">
            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
              placeholder="e.g. AI Risk Framework"
              className={cn(inputCls, titleError && "border-red-500 focus:border-red-500")}
            />
            {titleError && <p className="text-[11px] text-red-400 mt-1">Title is required.</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NodeCategory)}
                  className={selectCls}
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </Field>
            <Field label="Status">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as NodeStatus)}
                  className={selectCls}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this about?"
              className={cn(inputCls, "resize-none")}
            />
          </Field>

          <Field label="Owner">
            <div className="relative">
              <select
                value={owner}
                onChange={(e) => {
                  const member = teamMembers.find((u) => u.id === e.target.value)
                  setOwner(e.target.value)
                  setOwnerName(member?.name ?? "")
                }}
                className={selectCls}
              >
                <option value="">Select owner</option>
                {teamMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </Field>

          <Field label={`Progress — ${progress}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </Field>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-9 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? "Adding…" : "Add Node"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function getNewNodePosition(positions: Array<{ x: number; y: number }>) {
  if (positions.length === 0) return { x: 400, y: 300 }
  const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length
  const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length
  const angle = Math.random() * Math.PI * 2
  const radius = 180 + Math.random() * 80
  return {
    x: Math.round(avgX + Math.cos(angle) * radius),
    y: Math.round(avgY + Math.sin(angle) * radius),
  }
}

const inputCls =
  "w-full px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"

const selectCls =
  "w-full px-2.5 py-1.5 pr-7 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
