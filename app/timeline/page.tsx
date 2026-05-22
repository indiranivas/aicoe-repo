"use client"

import { useEffect, useState, useMemo } from "react"
import { format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns"
import { CATEGORY_COLORS, CATEGORY_BORDER_L, ALL_CATEGORIES } from "@/lib/types"
import type { ActivityNode, NodeCategory } from "@/lib/types"
import { cn } from "@/lib/cn"

export default function TimelinePage() {
  const [nodes, setNodes] = useState<ActivityNode[]>([])

  useEffect(() => {
    fetch("/api/nodes").then((r) => r.json()).then((d) => setNodes(d.nodes))
  }, [])

  const scheduled = useMemo(
    () => nodes.filter((n) => n.startDate || n.dueDate),
    [nodes]
  )

  const { months, minDate, maxDate } = useMemo(() => {
    if (scheduled.length === 0) {
      const now = new Date()
      return {
        minDate: startOfMonth(now),
        maxDate: endOfMonth(new Date(now.getFullYear(), now.getMonth() + 5, 1)),
        months: eachMonthOfInterval({ start: now, end: new Date(now.getFullYear(), now.getMonth() + 5, 1) }),
      }
    }
    const dates = scheduled.flatMap((n) => [n.startDate, n.dueDate].filter(Boolean).map((d) => new Date(d!)))
    const min = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))))
    const max = endOfMonth(new Date(Math.max(...dates.map((d) => d.getTime()))))
    return { minDate: min, maxDate: max, months: eachMonthOfInterval({ start: min, end: max }) }
  }, [scheduled])

  const totalDays = differenceInDays(maxDate, minDate) + 1
  const dayWidth = Math.max(24, Math.floor(1100 / totalDays))

  const byCategory = useMemo(
    () =>
      ALL_CATEGORIES.map((cat) => ({
        cat,
        nodes: scheduled.filter((n) => n.category === cat),
      })).filter((g) => g.nodes.length > 0),
    [scheduled]
  )

  const ganttCss = useMemo(() => {
    const calcOffset = (date: Date) => differenceInDays(date, minDate)
    const lines: string[] = []

    lines.push(`.gantt-wrap { min-width: ${160 + totalDays * dayWidth}px; }`)

    months.forEach((m, i) => {
      const days =
        differenceInDays(
          endOfMonth(m) > maxDate ? maxDate : endOfMonth(m),
          startOfMonth(m) < minDate ? minDate : startOfMonth(m)
        ) + 1
      lines.push(`.gantt-month-${i} { width: ${days * dayWidth}px; }`)
    })

    byCategory.forEach(({ nodes: catNodes }) => {
      catNodes.forEach((node) => {
        const start = node.startDate ? new Date(node.startDate) : null
        const end = node.dueDate ? new Date(node.dueDate) : null
        const barStart = start
          ? Math.max(0, calcOffset(start))
          : end
          ? Math.max(0, calcOffset(end))
          : 0
        const barWidth =
          start && end
            ? Math.max(dayWidth, (calcOffset(end) - calcOffset(start) + 1) * dayWidth)
            : dayWidth * 2
        const color = CATEGORY_COLORS[node.category as NodeCategory]
        const safeId = node.id.replace(/[^a-zA-Z0-9-]/g, "-")

        lines.push(
          `.gantt-row-${safeId} { height: 36px; width: ${totalDays * dayWidth}px; }`
        )
        lines.push(
          `.gantt-bar-${safeId} { left: ${barStart * dayWidth}px; width: ${barWidth}px; height: 22px; background-color: ${color}30; border: 1px solid ${color}60; }`
        )
        lines.push(
          `.gantt-fill-${safeId} { width: ${node.progress}%; background-color: ${color}50; }`
        )
      })
    })

    return lines.join("\n")
  }, [totalDays, dayWidth, months, minDate, maxDate, byCategory])

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <style suppressHydrationWarning>{ganttCss}</style>
      <div className="px-6 py-4 border-b border-gray-800 shrink-0">
        <h1 className="text-base font-semibold text-gray-100">Timeline</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Activities with start/due dates · set them in the node detail drawer
        </p>
      </div>

      {scheduled.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">No scheduled activities yet</p>
          <p className="text-xs text-gray-700">Open a node in the Graph view and set Start Date / Due Date</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="gantt-wrap">

            {/* Month header */}
            <div className="flex sticky top-0 z-10 bg-gray-950 border-b border-gray-800">
              <div className="w-40 shrink-0 px-3 py-2 border-r border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
                Category
              </div>
              <div className="flex">
                {months.map((m, i) => (
                  <div
                    key={m.toISOString()}
                    className={`gantt-month-${i} border-r border-gray-800 px-2 py-2 text-[10px] text-gray-400 font-medium`}
                  >
                    {format(m, "MMM yyyy")}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows per category */}
            {byCategory.map(({ cat, nodes: catNodes }) => (
              <div key={cat} className="border-b border-gray-800/50">
                {/* Category label */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 bg-gray-900/40 border-b border-gray-800/50 border-l-2",
                    CATEGORY_BORDER_L[cat as NodeCategory]
                  )}
                >
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{cat}</span>
                </div>

                {/* Activity bars */}
                {catNodes.map((node) => {
                  const safeId = node.id.replace(/[^a-zA-Z0-9-]/g, "-")
                  return (
                    <div key={node.id} className="flex items-center border-b border-gray-800/30 last:border-0">
                      <div className="w-40 shrink-0 px-3 py-2 border-r border-gray-800/50">
                        <p className="text-[11px] text-gray-300 truncate">{node.title}</p>
                        <p className="text-[10px] text-gray-600">{node.owner || "—"}</p>
                      </div>
                      <div className={`gantt-row-${safeId} relative`}>
                        <div
                          className={`gantt-bar-${safeId} absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2`}
                        >
                          <div className={`gantt-fill-${safeId} h-full rounded-sm absolute left-0 top-0`} />
                          <span className="text-[10px] text-gray-300 truncate relative z-10 leading-none">
                            {node.status === "Completed" ? "✓ " : ""}
                            {node.title}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
