"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/cn"
import { format, formatDistanceToNow } from "date-fns"
import type { Notification as NotifType } from "@/lib/types"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotifType[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const fetchNotifications = useCallback(async () => {
    try {
      const params = filter === "unread" ? "?unread=true" : ""
      const res = await fetch(`/api/notifications${params}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      fetchNotifications()
    } catch { /* ignore */ }
  }

  async function toggleRead(id: string, isRead: boolean) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !isRead }),
      })
      fetchNotifications()
    } catch { /* ignore */ }
  }

  async function deleteNotification(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch { /* ignore */ }
  }

  const TYPE_ICON: Record<string, { icon: string; color: string }> = {
    milestone_overdue: { icon: "⏰", color: "text-red-400 bg-red-500/10 border-red-500/30" },
    status_change: { icon: "🔄", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    assignment: { icon: "👤", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
    mention: { icon: "@", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    update: { icon: "💬", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    blocked: { icon: "🚫", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Notifications</h1>
            <p className="text-xs text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-medium rounded-md transition-colors capitalize",
                    filter === f
                      ? "bg-gray-800 text-gray-200"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-1.5 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-gray-500">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const typeStyle = TYPE_ICON[n.type] ?? TYPE_ICON.update
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border transition-colors group",
                    n.isRead
                      ? "bg-gray-900/50 border-gray-800/50"
                      : "bg-gray-900 border-gray-800"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 text-sm",
                    typeStyle.color
                  )}>
                    {typeStyle.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={cn(
                          "text-xs",
                          n.isRead ? "text-gray-500" : "text-gray-200 font-medium"
                        )}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{n.message}</p>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0 whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {n.entityId && n.entityType === "activity" && (
                        <a href={`/activities/${n.entityId}`}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300">
                          View activity →
                        </a>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => toggleRead(n.id, n.isRead)}
                        className="text-[9px] text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {n.isRead ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="text-[9px] text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
