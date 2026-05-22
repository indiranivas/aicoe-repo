"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/cn"
import {
  CATEGORY_COLORS, CATEGORY_BG, STATUS_COLORS,
  ALL_STATUSES, ALL_PRIORITIES, ALL_CATEGORIES, PRIORITY_COLORS,
} from "@/lib/types"
import type { NodeStatus, NodePriority, NodeCategory } from "@/lib/types"
import { format } from "date-fns"

interface ActivityDetail {
  id: string
  title: string
  description: string
  category: NodeCategory
  owner: string
  status: NodeStatus
  priority: NodePriority
  progress: number
  startDate: string | null
  dueDate: string | null
  tags: string[]
  notes: string
  links: string[]
  artifacts: string[]
  createdAt: string
  updatedAt: string
  updates: Array<{
    id: string; text: string; author: string; createdAt: string
  }>
  milestones: Array<{
    id: string; title: string; dueDate: string | null; completed: boolean; createdAt: string
  }>
}

interface RelatedEdge {
  id: string
  source: string
  target: string
  relationship: string
  relatedNode?: { id: string; title: string; category: NodeCategory; status: NodeStatus }
}

type Tab = "overview" | "milestones" | "updates" | "relationships"

export default function ActivityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [relatedEdges, setRelatedEdges] = useState<RelatedEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<ActivityDetail>>({})
  const [saving, setSaving] = useState(false)

  // New update form
  const [newUpdate, setNewUpdate] = useState("")
  const [newUpdateAuthor, setNewUpdateAuthor] = useState("")

  // New milestone form
  const [newMilestone, setNewMilestone] = useState({ title: "", dueDate: "" })

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/nodes/${id}`)
      if (!res.ok) { router.push("/"); return }
      const data = await res.json()
      setActivity(data)
      setEditForm(data)
    } catch {
      router.push("/")
    }
  }, [id, router])

  const fetchRelated = useCallback(async () => {
    try {
      const res = await fetch("/api/nodes")
      if (!res.ok) return
      const data = await res.json()
      const edges = (data.edges as RelatedEdge[]).filter(
        (e) => e.source === id || e.target === id
      )
      // Annotate with related node info
      const nodes = data.nodes as Array<{ id: string; title: string; category: NodeCategory; status: NodeStatus }>
      edges.forEach((e) => {
        const relatedId = e.source === id ? e.target : e.source
        e.relatedNode = nodes.find((n) => n.id === relatedId)
      })
      setRelatedEdges(edges)
    } catch { /* ignore */ }
  }, [id])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchActivity(), fetchRelated()]).finally(() => setLoading(false))
  }, [fetchActivity, fetchRelated])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast.success("Activity updated")
        setEditing(false)
        fetchActivity()
      } else {
        toast.error("Failed to save")
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!newUpdate.trim()) return
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: id, text: newUpdate, author: newUpdateAuthor }),
      })
      if (res.ok) {
        toast.success("Update added")
        setNewUpdate("")
        fetchActivity()
      }
    } catch {
      toast.error("Failed to add update")
    }
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMilestone.title.trim()) return
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          title: newMilestone.title,
          dueDate: newMilestone.dueDate || null,
        }),
      })
      if (res.ok) {
        toast.success("Milestone added")
        setNewMilestone({ title: "", dueDate: "" })
        fetchActivity()
      }
    } catch {
      toast.error("Failed to add milestone")
    }
  }

  async function toggleMilestone(msId: string, completed: boolean) {
    try {
      await fetch(`/api/milestones/${msId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      })
      fetchActivity()
    } catch { /* ignore */ }
  }

  async function deleteUpdate(updateId: string) {
    try {
      await fetch(`/api/updates/${updateId}`, { method: "DELETE" })
      fetchActivity()
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Activity not found</p>
      </div>
    )
  }

  const completedMilestones = activity.milestones.filter((m) => m.completed).length
  const totalMilestones = activity.milestones.length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div
        className="px-6 py-5 border-b border-gray-800"
        style={{ borderTopColor: CATEGORY_COLORS[activity.category], borderTopWidth: 3 }}
      >
        <button onClick={() => router.back()} className="text-[10px] text-gray-600 hover:text-gray-400 mb-2 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", CATEGORY_BG[activity.category])}>
                {activity.category}
              </span>
              <span className={cn("text-[10px]", STATUS_COLORS[activity.status])}>{activity.status}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", PRIORITY_COLORS[activity.priority])}>
                {activity.priority}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-100">{activity.title}</h1>
            {activity.owner && (
              <p className="text-xs text-gray-500 mt-1">Owner: {activity.owner}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Progress circle */}
            <div className="text-center">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1f2937" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke={CATEGORY_COLORS[activity.category]}
                    strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(activity.progress / 100) * 150.8} 150.8`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-200">
                  {activity.progress}%
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-1 border-b border-gray-800 pt-1">
        {(["overview", "milestones", "updates", "relationships"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-xs font-medium transition-colors capitalize",
              tab === t
                ? "text-indigo-400 border-b-2 border-indigo-400"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {t}
            {t === "milestones" && totalMilestones > 0 && (
              <span className="ml-1 text-[9px] text-gray-600">({completedMilestones}/{totalMilestones})</span>
            )}
            {t === "updates" && activity.updates.length > 0 && (
              <span className="ml-1 text-[9px] text-gray-600">({activity.updates.length})</span>
            )}
            {t === "relationships" && relatedEdges.length > 0 && (
              <span className="ml-1 text-[9px] text-gray-600">({relatedEdges.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        {tab === "overview" && (
          <div className="space-y-6">
            {editing ? (
              /* Edit form */
              <div className="space-y-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Title</label>
                  <input
                    value={editForm.title ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={editForm.description ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Status</label>
                    <select
                      value={editForm.status ?? "Idea"}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as NodeStatus })}
                      className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    >
                      {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Priority</label>
                    <select
                      value={editForm.priority ?? "Medium"}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as NodePriority })}
                      className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    >
                      {ALL_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Category</label>
                    <select
                      value={editForm.category ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value as NodeCategory })}
                      className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    >
                      {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Owner</label>
                    <input
                      value={editForm.owner ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Progress ({editForm.progress ?? 0}%)</label>
                    <input
                      type="range" min={0} max={100}
                      value={editForm.progress ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={editForm.notes ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50">
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button onClick={() => { setEditing(false); setEditForm(activity) }}
                    className="px-4 py-1.5 text-xs text-gray-400 hover:text-gray-200">
                    Discard
                  </button>
                </div>
              </div>
            ) : (
              /* Read view */
              <>
                {activity.description && (
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2">Description</h3>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{activity.description}</p>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Start Date", value: activity.startDate ? format(new Date(activity.startDate), "MMM d, yyyy") : "—" },
                    { label: "Due Date", value: activity.dueDate ? format(new Date(activity.dueDate), "MMM d, yyyy") : "—" },
                    { label: "Created", value: format(new Date(activity.createdAt), "MMM d, yyyy") },
                    { label: "Updated", value: format(new Date(activity.updatedAt), "MMM d, yyyy") },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-gray-900 border border-gray-800 rounded-xl">
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                      <p className="text-xs text-gray-300 mt-1 font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                {activity.tags.length > 0 && (
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {activity.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {activity.notes && (
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2">Notes</h3>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap">{activity.notes}</p>
                  </div>
                )}

                {/* Links */}
                {activity.links.length > 0 && (
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2">Links</h3>
                    <div className="space-y-1">
                      {activity.links.map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                          className="block text-xs text-indigo-400 hover:text-indigo-300 truncate">
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "milestones" && (
          <div className="space-y-4">
            {/* Add milestone */}
            <form onSubmit={handleAddMilestone} className="flex gap-2 items-end">
              <div className="flex-1">
                <input
                  placeholder="New milestone…"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <input
                type="date"
                value={newMilestone.dueDate}
                onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200"
              />
              <button type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shrink-0">
                Add
              </button>
            </form>

            {/* Milestones list */}
            <div className="space-y-2">
              {activity.milestones.map((ms) => {
                const overdue = !ms.completed && ms.dueDate && new Date(ms.dueDate) < new Date()
                return (
                  <div key={ms.id} className={cn(
                    "flex items-center gap-3 p-3 bg-gray-900 border rounded-xl transition-colors",
                    overdue ? "border-red-500/30" : "border-gray-800"
                  )}>
                    <button
                      onClick={() => toggleMilestone(ms.id, ms.completed)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        ms.completed
                          ? "bg-emerald-500 border-emerald-500"
                          : overdue
                          ? "border-red-500/50 hover:border-red-500"
                          : "border-gray-600 hover:border-indigo-500"
                      )}
                    >
                      {ms.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className={cn("text-xs", ms.completed ? "text-gray-600 line-through" : "text-gray-200")}>
                        {ms.title}
                      </p>
                      {ms.dueDate && (
                        <p className={cn("text-[10px] mt-0.5", overdue ? "text-red-400" : "text-gray-600")}>
                          Due: {format(new Date(ms.dueDate), "MMM d, yyyy")}
                          {overdue && " (overdue)"}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              {activity.milestones.length === 0 && (
                <p className="text-center text-gray-600 text-xs py-8">No milestones yet</p>
              )}
            </div>
          </div>
        )}

        {tab === "updates" && (
          <div className="space-y-4">
            {/* Add update */}
            <form onSubmit={handleAddUpdate} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Add an update…"
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <div className="flex gap-2 items-center">
                <input
                  placeholder="Author name"
                  value={newUpdateAuthor}
                  onChange={(e) => setNewUpdateAuthor(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
                <button type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">
                  Post
                </button>
              </div>
            </form>

            {/* Updates list */}
            <div className="space-y-3">
              {activity.updates.map((upd) => (
                <div key={upd.id} className="p-3 bg-gray-900 border border-gray-800 rounded-xl group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-300">{upd.text}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                        {upd.author && <span>{upd.author}</span>}
                        <span>·</span>
                        <span>{format(new Date(upd.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteUpdate(upd.id)}
                      className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-[10px] p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {activity.updates.length === 0 && (
                <p className="text-center text-gray-600 text-xs py-8">No updates yet</p>
              )}
            </div>
          </div>
        )}

        {tab === "relationships" && (
          <div className="space-y-3">
            {relatedEdges.map((edge) => {
              const isSource = edge.source === id
              return (
                <a
                  key={edge.id}
                  href={`/activities/${isSource ? edge.target : edge.source}`}
                  className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
                >
                  <div className="text-[10px] text-gray-500 w-24 shrink-0">
                    {isSource ? edge.relationship.replace(/_/g, " ") : `← ${edge.relationship.replace(/_/g, " ")}`}
                  </div>
                  {edge.relatedNode && (
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[edge.relatedNode.category] }}
                      />
                      <span className="text-xs text-gray-300">{edge.relatedNode.title}</span>
                      <span className={cn("text-[9px] ml-auto", STATUS_COLORS[edge.relatedNode.status])}>
                        {edge.relatedNode.status}
                      </span>
                    </div>
                  )}
                </a>
              )
            })}
            {relatedEdges.length === 0 && (
              <p className="text-center text-gray-600 text-xs py-8">No relationships yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
