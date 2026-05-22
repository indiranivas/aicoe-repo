"use client"

import { useEffect, useState } from "react"
import { CATEGORY_COLORS, ALL_CATEGORIES } from "@/lib/types"
import { format } from "date-fns"

interface DashboardData {
  total: number
  avgProgress: number
  byStatus: Record<string, number>
  categoryStats: { category: string; count: number; avgProgress: number }[]
  recentUpdates: { id: string; text: string; author: string; createdAt: string; node: { title: string; category: string } }[]
  upcomingMilestones: { id: string; title: string; dueDate: string; node: { title: string; category: string } }[]
}

const STATUS_ORDER = ["Idea", "Planned", "In Progress", "Blocked", "Completed"]
const STATUS_COLORS: Record<string, string> = {
  Idea: "#6b7280",
  Planned: "#3b82f6",
  "In Progress": "#10b981",
  Blocked: "#ef4444",
  Completed: "#6366f1",
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData)
  }, [])

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        Loading dashboard…
      </div>
    )
  }

  const blocked = data.byStatus["Blocked"] ?? 0
  const completed = data.byStatus["Completed"] ?? 0
  const inProgress = data.byStatus["In Progress"] ?? 0

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">AI CoE activity overview</p>
      </div>

      <div className="p-6 space-y-6 max-w-6xl">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Activities" value={data.total} sub="across all categories" color="#6366f1" />
          <KpiCard label="In Progress" value={inProgress} sub={`${data.total ? Math.round((inProgress / data.total) * 100) : 0}% of total`} color="#10b981" />
          <KpiCard label="Completed" value={completed} sub={`${data.total ? Math.round((completed / data.total) * 100) : 0}% of total`} color="#6366f1" />
          <KpiCard label="Avg Progress" value={`${data.avgProgress}%`} sub={blocked > 0 ? `${blocked} blocked` : "No blockers"} color={blocked > 0 ? "#ef4444" : "#10b981"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Status breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Status Breakdown</h2>
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = data.byStatus[status] ?? 0
                const pct = data.total ? Math.round((count / data.total) * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{status}</span>
                      <span className="text-gray-500">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category health */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Category Health</h2>
            <div className="space-y-3">
              {ALL_CATEGORIES.map((cat) => {
                const stat = data.categoryStats.find((s) => s.category === cat)
                const color = CATEGORY_COLORS[cat]
                const prog = stat?.avgProgress ?? 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 truncate max-w-[200px]">{cat}</span>
                      <span className="text-gray-500 shrink-0 ml-2">{stat?.count ?? 0} · {prog}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${prog}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent updates */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Recent Updates</h2>
            {data.recentUpdates.length === 0 ? (
              <p className="text-xs text-gray-600">No updates yet. Log progress from a node's detail panel.</p>
            ) : (
              <div className="space-y-3">
                {data.recentUpdates.map((u) => (
                  <div key={u.id} className="flex gap-3">
                    <div
                      className="w-1.5 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: CATEGORY_COLORS[u.node.category as keyof typeof CATEGORY_COLORS] ?? "#374151", minHeight: "100%" }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-300 leading-snug">{u.text}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {u.node.title} · {u.author || "Anonymous"} · {format(new Date(u.createdAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming milestones */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Upcoming Milestones</h2>
            {data.upcomingMilestones.length === 0 ? (
              <p className="text-xs text-gray-600">No upcoming milestones. Add them in a node's detail panel.</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingMilestones.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-800 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 truncate">{m.title}</p>
                      <p className="text-[10px] text-gray-500">{m.node.title}</p>
                    </div>
                    <span className="text-[10px] text-amber-400 shrink-0">
                      {m.dueDate ? format(new Date(m.dueDate), "MMM d") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-gray-600 mt-1">{sub}</p>
    </div>
  )
}
