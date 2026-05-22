"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useGraphStore } from "@/store/graphStore"
import { cn } from "@/lib/cn"
import {
  ALL_CATEGORIES, ALL_STATUSES, ALL_PRIORITIES,
  CATEGORY_COLORS, CATEGORY_DOT, CATEGORY_ACCENT, CATEGORY_BORDER_L, PRIORITY_COLORS,
} from "@/lib/types"
import type { ActivityNode, NodeCategory, NodeStatus, NodePriority, NodeUpdate, Milestone } from "@/lib/types"
import { format } from "date-fns"

interface Props {
  node: ActivityNode
  onClose: () => void
}

export default function NodeForm({ node, onClose }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const deleteActivityNode = useGraphStore((s) => s.deleteActivityNode)

  const [form, setForm] = useState<ActivityNode>(node)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [titleError, setTitleError] = useState(false)

  // Updates & milestones
  const [updates, setUpdates] = useState<NodeUpdate[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [newUpdate, setNewUpdate] = useState("")
  const [updateAuthor, setUpdateAuthor] = useState("")
  const [newMilestone, setNewMilestone] = useState("")
  const [newMilestoneDue, setNewMilestoneDue] = useState("")
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then((users) => {
      if (Array.isArray(users)) setTeamMembers(users.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setForm(node)
    setDirty(false)
    setConfirmDelete(false)
    setTitleError(false)

    // Load updates and milestones
    fetch(`/api/updates?nodeId=${node.id}`).then((r) => r.json()).then(setUpdates).catch(() => {})
    fetch(`/api/nodes/${node.id}`).then((r) => r.json()).then((d) => {
      if (d.milestones) setMilestones(d.milestones)
    }).catch(() => {})
  }, [node.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof ActivityNode>(key: K, value: ActivityNode[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { setTitleError(true); return }
    setTitleError(false)
    setSaving(true)
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      updateNodeData(node.id, form)
      setDirty(false)
      toast.success("Node saved")
    } catch {
      toast.error("Could not save — check the server")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await fetch(`/api/nodes/${node.id}`, { method: "DELETE" })
      deleteActivityNode(node.id)
      onClose()
      toast.success("Node deleted")
    } catch {
      toast.error("Could not delete — check the server")
    }
  }

  async function handleAddUpdate() {
    if (!newUpdate.trim()) return
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, text: newUpdate.trim(), author: updateAuthor.trim() }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setUpdates((prev) => [created, ...prev])
      setNewUpdate("")
      toast.success("Update logged")
    } catch {
      toast.error("Failed to log update")
    }
  }

  async function handleAddMilestone() {
    if (!newMilestone.trim()) return
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, title: newMilestone.trim(), dueDate: newMilestoneDue || null }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setMilestones((prev) => [...prev, created])
      setNewMilestone("")
      setNewMilestoneDue("")
    } catch {
      toast.error("Failed to add milestone")
    }
  }

  async function toggleMilestone(id: string, completed: boolean) {
    try {
      await fetch(`/api/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      })
      setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, completed } : m))
    } catch {
      toast.error("Failed to update milestone")
    }
  }

  async function deleteMilestone(id: string) {
    try {
      await fetch(`/api/milestones/${id}`, { method: "DELETE" })
      setMilestones((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error("Failed to delete milestone")
    }
  }

  const cat = form.category as NodeCategory

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-3 border-b border-gray-800 border-l-[3px] shrink-0", CATEGORY_BORDER_L[cat])}>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Edit Node</span>
        <button type="button" onClick={onClose} aria-label="Close drawer" className="p-1 text-gray-600 hover:text-gray-300 rounded transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800">

        <Field label="Title">
          <input
            value={form.title}
            placeholder="Activity title"
            onChange={(e) => { update("title", e.target.value); setTitleError(false) }}
            className={cn(inputCls, titleError && "border-red-500 focus:border-red-500")}
          />
          {titleError && <p className="text-[11px] text-red-400 mt-1">Title is required.</p>}
        </Field>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder="Describe this activity…" className={cn(inputCls, "resize-none")} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <div className="relative">
              <select aria-label="Category" value={form.category} onChange={(e) => update("category", e.target.value as NodeCategory)} className={selectCls}>
                {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronIcon />
            </div>
          </Field>
          <Field label="Status">
            <div className="relative">
              <select aria-label="Status" value={form.status} onChange={(e) => update("status", e.target.value as NodeStatus)} className={selectCls}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronIcon />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <div className="relative">
              <select aria-label="Priority" value={form.priority ?? "Medium"} onChange={(e) => update("priority" as keyof ActivityNode, e.target.value as NodePriority)} className={selectCls}>
                {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronIcon />
            </div>
          </Field>
          <Field label="Owner">
            <div className="relative">
              <select aria-label="Owner" value={teamMembers.find((u) => u.name === form.owner)?.id ?? ""} onChange={(e) => {
                const member = teamMembers.find((u) => u.id === e.target.value)
                update("owner", member?.name ?? "")
                update("assigneeId" as keyof ActivityNode, e.target.value || null)
              }} className={selectCls}>
                <option value="">Unassigned</option>
                {teamMembers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <ChevronIcon />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input
              type="date"
              aria-label="Start date"
              value={form.startDate ? form.startDate.substring(0, 10) : ""}
              onChange={(e) => update("startDate" as keyof ActivityNode, e.target.value || null)}
              className={cn(inputCls, "appearance-none")}
            />
          </Field>
          <Field label="Due Date">
            <input
              type="date"
              aria-label="Due date"
              value={form.dueDate ? form.dueDate.substring(0, 10) : ""}
              onChange={(e) => update("dueDate" as keyof ActivityNode, e.target.value || null)}
              className={cn(inputCls, "appearance-none")}
            />
          </Field>
        </div>

        <Field label={`Progress — ${form.progress}%`}>
          <input
            type="range" min={0} max={100} value={form.progress}
            aria-label={`Progress ${form.progress}%`}
            onChange={(e) => update("progress", Number(e.target.value))}
            className={cn("w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-800", CATEGORY_ACCENT[cat])}
          />
          <div className="mt-2 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-200", CATEGORY_DOT[cat])}
              style={{ width: `${form.progress}%` }}
            />
          </div>
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            value={form.tags.join(", ")}
            onChange={(e) => update("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            placeholder="llm, automation, internal"
            className={inputCls}
          />
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {form.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded border border-gray-700">{tag}</span>
              ))}
            </div>
          )}
        </Field>

        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={4} placeholder="Working notes, decisions, blockers…" className={cn(inputCls, "resize-none")} />
        </Field>

        <Field label="Links (one per line)">
          <textarea
            value={form.links.join("\n")}
            onChange={(e) => update("links", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
            rows={2} placeholder="https://…"
            className={cn(inputCls, "resize-none font-mono text-[11px]")}
          />
        </Field>

        {/* Milestones */}
        <div className="pt-2 border-t border-gray-800">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Milestones</p>
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1.5 group">
              <button type="button" onClick={() => toggleMilestone(m.id, !m.completed)} className="shrink-0">
                <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors", m.completed ? "bg-indigo-600 border-indigo-600" : "border-gray-600")}>
                  {m.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
              <span className={cn("text-xs flex-1", m.completed ? "text-gray-600 line-through" : "text-gray-300")}>{m.title}</span>
              {m.dueDate && <span className="text-[10px] text-gray-600">{format(new Date(m.dueDate), "MMM d")}</span>}
              <button type="button" aria-label="Delete milestone" onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add milestone…" className={cn(inputCls, "flex-1")} onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()} />
            <input type="date" aria-label="Milestone due date" value={newMilestoneDue} onChange={(e) => setNewMilestoneDue(e.target.value)} className={cn(inputCls, "w-32 appearance-none")} />
            <button type="button" onClick={handleAddMilestone} disabled={!newMilestone.trim()} className="h-[30px] px-2 text-xs bg-gray-800 border border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-300 rounded-md transition-colors disabled:opacity-40">+</button>
          </div>
        </div>

        {/* Updates log */}
        <div className="pt-2 border-t border-gray-800">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity Log</p>
          <div className="space-y-1 mb-2">
            <textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} rows={2} placeholder="Log progress, decision, or blocker…" className={cn(inputCls, "resize-none")} />
            <div className="flex gap-2">
              <input value={updateAuthor} onChange={(e) => setUpdateAuthor(e.target.value)} placeholder="Your name" className={cn(inputCls, "flex-1")} />
              <button type="button" onClick={handleAddUpdate} disabled={!newUpdate.trim()} className="h-[30px] px-3 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-md transition-colors">Log</button>
            </div>
          </div>
          {updates.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {updates.map((u) => (
                <div key={u.id} className="text-[11px] bg-gray-800/50 rounded-md px-2.5 py-2">
                  <p className="text-gray-300 leading-snug">{u.text}</p>
                  <p className="text-gray-600 mt-0.5">{u.author || "Anonymous"} · {format(new Date(u.createdAt), "MMM d, h:mm a")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-600 space-y-0.5">
          <p>Created: {new Date(node.createdAt).toLocaleDateString()}</p>
          <p>Updated: {new Date(node.updatedAt).toLocaleDateString()}</p>
          <p className="font-mono text-[10px] mt-1 text-gray-700">{node.id}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-800 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className={cn("flex-1 h-8 text-xs font-medium rounded-md transition-colors", dirty && !saving ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-gray-800 text-gray-600 cursor-not-allowed")}
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
          </button>
          <button type="button" onClick={onClose} className="h-8 px-3 text-xs text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors">
            Close
          </button>
        </div>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="w-full h-7 text-xs text-red-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
            Delete node
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={handleDelete} className="flex-1 h-8 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors">Confirm delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 h-8 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls = "w-full px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
const selectCls = "w-full px-2.5 py-1.5 pr-7 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
