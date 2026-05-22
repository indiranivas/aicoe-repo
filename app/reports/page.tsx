"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { cn } from "@/lib/cn"
import { CATEGORY_COLORS, ALL_CATEGORIES, ALL_STATUSES, STATUS_COLORS } from "@/lib/types"
import type { NodeCategory, NodeStatus } from "@/lib/types"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"

interface ReportData {
  summary: {
    total: number
    avgProgress: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
  categoryStats: Array<{
    category: string; count: number; avgProgress: number
    completed: number; blocked: number
  }>
  milestoneHealth: {
    total: number; completed: number; overdue: number
    upcoming: Array<{
      id: string; title: string; dueDate: string | null
      nodeTitle: string; nodeCategory: string
    }>
  }
  weeklyCompletions: Array<{ week: string; count: number }>
  teamWorkload: Array<{
    id: string; name: string; department: string
    ownedCount: number; assignedCount: number
  }>
  recentUpdates: Array<{
    id: string; text: string; author: string; createdAt: string
    nodeTitle: string; nodeCategory: string
  }>
}

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#ec4899"]

const STATUS_CHART_COLORS: Record<string, string> = {
  Idea: "#6b7280",
  Planned: "#3b82f6",
  "In Progress": "#10b981",
  Blocked: "#ef4444",
  Completed: "#4b5563",
}

const PRIORITY_CHART_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#6b7280",
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const printRef = useRef<HTMLDivElement>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set("category", categoryFilter)
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [categoryFilter, statusFilter])

  useEffect(() => { fetchReport() }, [fetchReport])

  function exportCSV() {
    if (!data) return
    const rows = [
      ["Category", "Count", "Avg Progress", "Completed", "Blocked"],
      ...data.categoryStats.map((c) =>
        [c.category, c.count, `${c.avgProgress}%`, c.completed, c.blocked]
      ),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `aicoe-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Failed to load report data</p>
      </div>
    )
  }

  const statusData = Object.entries(data.summary.byStatus).map(([name, value]) => ({ name, value }))
  const priorityData = Object.entries(data.summary.byPriority).map(([name, value]) => ({ name, value }))

  return (
    <div className="flex-1 overflow-y-auto p-6 print:p-2 print:bg-white print:text-black" ref={printRef}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-100 print:text-black">Reports</h1>
            <p className="text-xs text-gray-500 mt-1 print:text-gray-600">
              AI CoE Activity Analytics • Generated {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200"
            >
              <option value="">All Categories</option>
              {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={exportCSV}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Export CSV
            </button>
            <button onClick={printReport}
              className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">
              Print PDF
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Activities", value: data.summary.total, color: "text-indigo-400" },
            { label: "Avg Progress", value: `${data.summary.avgProgress}%`, color: "text-emerald-400" },
            { label: "Milestones Due", value: data.milestoneHealth.overdue, color: "text-red-400" },
            { label: "Milestones Done", value: data.milestoneHealth.completed, color: "text-blue-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="p-4 bg-gray-900 border border-gray-800 rounded-xl print:border-gray-300">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{kpi.label}</p>
              <p className={cn("text-2xl font-bold mt-1", kpi.color, "print:text-black")}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl print:border-gray-300">
            <h3 className="text-xs font-semibold text-gray-400 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  paddingAngle={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: "#d1d5db" }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Breakdown */}
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl print:border-gray-300">
            <h3 className="text-xs font-semibold text-gray-400 mb-4">Priority Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="value" name="Activities">
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_CHART_COLORS[entry.name] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Health */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl mb-6 print:border-gray-300">
          <h3 className="text-xs font-semibold text-gray-400 mb-4">Category Health</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.categoryStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis dataKey="category" type="category" width={130} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="count" name="Total" fill="#6366f1" />
              <Bar dataKey="completed" name="Completed" fill="#10b981" />
              <Bar dataKey="blocked" name="Blocked" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Completion Trend */}
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl print:border-gray-300">
            <h3 className="text-xs font-semibold text-gray-400 mb-4">Weekly Completions (12 weeks)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.weeklyCompletions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="week" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 11 }}
                />
                <Line
                  type="monotone" dataKey="count" name="Completed"
                  stroke="#10b981" strokeWidth={2} dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Milestone Health */}
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl print:border-gray-300">
            <h3 className="text-xs font-semibold text-gray-400 mb-4">Milestone Health</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                <p className="text-lg font-bold text-gray-200">{data.milestoneHealth.total}</p>
                <p className="text-[9px] text-gray-500">Total</p>
              </div>
              <div className="text-center p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <p className="text-lg font-bold text-emerald-400">{data.milestoneHealth.completed}</p>
                <p className="text-[9px] text-gray-500">Done</p>
              </div>
              <div className="text-center p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                <p className="text-lg font-bold text-red-400">{data.milestoneHealth.overdue}</p>
                <p className="text-[9px] text-gray-500">Overdue</p>
              </div>
            </div>
            {data.milestoneHealth.upcoming.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-2">Upcoming</p>
                <div className="space-y-1">
                  {data.milestoneHealth.upcoming.slice(0, 5).map((ms) => (
                    <div key={ms.id} className="flex items-center gap-2 text-[10px]">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[ms.nodeCategory as NodeCategory] ?? "#6b7280" }}
                      />
                      <span className="text-gray-400 truncate flex-1">{ms.title}</span>
                      <span className="text-gray-600 shrink-0">
                        {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Workload */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl mb-6 print:border-gray-300">
          <h3 className="text-xs font-semibold text-gray-400 mb-4">Team Workload</h3>
          {data.teamWorkload.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(150, data.teamWorkload.length * 35)}>
              <BarChart data={data.teamWorkload} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="ownedCount" name="Owned" fill="#6366f1" stackId="a" />
                <Bar dataKey="assignedCount" name="Assigned" fill="#0ea5e9" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-600 text-xs py-8">No team data available</p>
          )}
        </div>

        {/* Recent Updates */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl print:border-gray-300">
          <h3 className="text-xs font-semibold text-gray-400 mb-4">Recent Updates</h3>
          <div className="space-y-2">
            {data.recentUpdates.map((u) => (
              <div key={u.id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-800/30">
                <div
                  className="w-1.5 h-full rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: CATEGORY_COLORS[u.nodeCategory as NodeCategory] ?? "#6b7280" }}
                />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-300">{u.text}</p>
                  <div className="flex gap-2 mt-1 text-[9px] text-gray-600">
                    <span>{u.nodeTitle}</span>
                    {u.author && <><span>·</span><span>{u.author}</span></>}
                    <span>·</span>
                    <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.recentUpdates.length === 0 && (
              <p className="text-center text-gray-600 text-xs py-4">No recent updates</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
