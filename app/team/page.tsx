"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/cn"
import { CATEGORY_COLORS, ALL_CATEGORIES, STATUS_COLORS, ALL_STATUSES } from "@/lib/types"
import type { NodeCategory, NodeStatus } from "@/lib/types"

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  isActive: boolean
  _count: { ownedActivities: number; assignedActivities: number }
}

interface MemberDetail {
  id: string
  name: string
  email: string
  role: string
  department: string
  ownedActivities: Array<{
    id: string; title: string; category: NodeCategory
    status: NodeStatus; priority: string; progress: number
  }>
  assignedActivities: Array<{
    id: string; title: string; category: NodeCategory
    status: NodeStatus; priority: string; progress: number
  }>
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) setMembers(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function viewMember(id: string) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/users/${id}`)
      if (res.ok) setSelectedMember(await res.json())
    } catch { /* ignore */ }
    finally { setDetailLoading(false) }
  }

  const filtered = members.filter((m) =>
    m.isActive && (
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase())
    )
  )

  // Workload data for heatmap
  const maxLoad = Math.max(1, ...members.map((m) => m._count.ownedActivities + m._count.assignedActivities))

  const ROLE_BADGE: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    manager: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    member: "bg-gray-800 text-gray-400 border-gray-700",
    viewer: "bg-gray-800/50 text-gray-500 border-gray-700",
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Team</h1>
            <p className="text-xs text-gray-500 mt-1">
              {members.filter((m) => m.isActive).length} active members
            </p>
          </div>
          <div className="relative">
            <input
              type="text" placeholder="Search team…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 px-3 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Grid */}
            <div className="lg:col-span-2">
              {/* Workload Heatmap */}
              <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
                <h2 className="text-xs font-semibold text-gray-400 mb-3">Workload Overview</h2>
                <div className="flex flex-wrap gap-2">
                  {filtered.map((m) => {
                    const load = m._count.ownedActivities + m._count.assignedActivities
                    const intensity = load / maxLoad
                    return (
                      <button
                        key={m.id}
                        onClick={() => viewMember(m.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                        style={{ backgroundColor: `rgba(99, 102, 241, ${0.05 + intensity * 0.25})` }}
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-indigo-300">
                            {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] text-gray-300 font-medium leading-none">{m.name}</p>
                          <p className="text-[9px] text-gray-600 mt-0.5">{load} activities</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Member Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => viewMember(m.id)}
                    className={cn(
                      "text-left p-4 bg-gray-900 border rounded-xl transition-all hover:border-gray-600",
                      selectedMember?.id === m.id ? "border-indigo-500" : "border-gray-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-300">
                          {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{m.name}</p>
                        <p className="text-[10px] text-gray-600 truncate">{m.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "px-2 py-0.5 text-[9px] font-medium rounded-full border",
                            ROLE_BADGE[m.role] ?? ROLE_BADGE.member
                          )}>
                            {m.role}
                          </span>
                          {m.department && (
                            <span className="text-[9px] text-gray-600">{m.department}</span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                          <span>{m._count.ownedActivities} owned</span>
                          <span>{m._count.assignedActivities} assigned</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {filtered.length === 0 && (
                <p className="text-center text-gray-600 text-xs py-12">No team members found</p>
              )}
            </div>

            {/* Member Detail Panel */}
            <div className="lg:col-span-1">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedMember ? (
                <div className="sticky top-6 space-y-4">
                  {/* Profile card */}
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-indigo-300">
                          {selectedMember.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-100">{selectedMember.name}</p>
                        <p className="text-[10px] text-gray-500">{selectedMember.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-medium rounded-full border",
                        ROLE_BADGE[selectedMember.role] ?? ROLE_BADGE.member
                      )}>
                        {selectedMember.role}
                      </span>
                      {selectedMember.department && (
                        <span className="px-2 py-0.5 text-[9px] text-gray-500 bg-gray-800 rounded-full">
                          {selectedMember.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <h3 className="text-xs font-semibold text-gray-400 mb-3">
                      Activities ({selectedMember.ownedActivities.length + selectedMember.assignedActivities.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {[...selectedMember.ownedActivities, ...selectedMember.assignedActivities]
                        .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
                        .map((a) => (
                          <a
                            key={a.id}
                            href={`/activities/${a.id}`}
                            className="block p-2 rounded-lg hover:bg-gray-800/60 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[a.category] }}
                              />
                              <p className="text-[11px] text-gray-300 truncate flex-1">{a.title}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-3.5">
                              <span className={cn("text-[9px]", STATUS_COLORS[a.status])}>{a.status}</span>
                              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500/60"
                                  style={{ width: `${a.progress}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-600">{a.progress}%</span>
                            </div>
                          </a>
                        ))}
                      {selectedMember.ownedActivities.length + selectedMember.assignedActivities.length === 0 && (
                        <p className="text-[10px] text-gray-600 text-center py-4">No activities assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <p className="text-xs text-gray-600">Select a team member to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
