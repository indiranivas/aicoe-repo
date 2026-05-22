"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useGraphStore } from "@/store/graphStore"
import { ALL_RELATIONSHIPS } from "@/lib/types"
import type { ActivityEdge, RelationshipType } from "@/lib/types"

export default function RelationshipModal() {
  const pendingConnection = useGraphStore((s) => s.pendingConnection)
  const setPendingConnection = useGraphStore((s) => s.setPendingConnection)
  const addActivityEdge = useGraphStore((s) => s.addActivityEdge)
  const getNode = useGraphStore((s) => s.getActivityNode)

  const [relationship, setRelationship] = useState<RelationshipType>("RELATED_TO")
  const [saving, setSaving] = useState(false)

  if (!pendingConnection) return null

  const sourceNode = getNode(pendingConnection.source)
  const targetNode = getNode(pendingConnection.target)

  async function handleCreate() {
    if (!pendingConnection) return
    setSaving(true)

    const edge: ActivityEdge = {
      id: crypto.randomUUID(),
      source: pendingConnection.source,
      target: pendingConnection.target,
      relationship,
    }

    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "edge", edge }),
      })
      if (!res.ok) throw new Error("Save failed")
      addActivityEdge(edge)
      setPendingConnection(null)
      setRelationship("RELATED_TO")
    } catch {
      toast.error("Could not save — check the server.")
      setSaving(false)
    }
  }

  function handleCancel() {
    setPendingConnection(null)
    setRelationship("RELATED_TO")
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-100 mb-1">Create Relationship</h3>

        {/* Connection preview */}
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
          <span className="text-xs text-gray-300 truncate max-w-[100px]">
            {sourceNode?.title ?? pendingConnection.source}
          </span>
          <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="text-xs text-gray-300 truncate max-w-[100px]">
            {targetNode?.title ?? pendingConnection.target}
          </span>
        </div>

        {/* Relationship type picker */}
        <div className="mb-4 space-y-1.5">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Relationship type
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_RELATIONSHIPS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRelationship(r)}
                className={`h-7 px-2 text-[10px] font-mono rounded border transition-all text-left ${
                  relationship === r
                    ? "bg-indigo-500/20 border-indigo-500/60 text-indigo-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 h-8 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            {saving ? "Creating…" : "Create edge"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 h-8 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
