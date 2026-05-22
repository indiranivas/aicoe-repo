"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/cn"
import { ALL_ROLES } from "@/lib/types"
import type { AppUser, UserRole } from "@/lib/types"

type Tab = "users" | "audit"

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("users")
  const [users, setUsers] = useState<(AppUser & { _count?: { ownedActivities: number; assignedActivities: number } })[]>([])
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string; userId: string; action: string; entityType: string
    entityId: string | null; details: string; createdAt: string
    user: { name: string; email: string }
  }>>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "", role: "member" as UserRole, department: "" })
  const [saving, setSaving] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/")
    }
  }, [session, isAdmin, router])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) setUsers(await res.json())
    } catch { /* ignore */ }
  }, [])

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/audit?limit=100")
      if (res.ok) setAuditLogs(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchUsers(), fetchAudit()]).finally(() => setLoading(false))
  }, [fetchUsers, fetchAudit])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to create user")
        return
      }
      toast.success("User created successfully")
      setShowInvite(false)
      setInviteForm({ name: "", email: "", password: "", role: "member", department: "" })
      fetchUsers()
    } catch {
      toast.error("Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        toast.success(isActive ? "User deactivated" : "User activated")
        fetchUsers()
      }
    } catch {
      toast.error("Failed to update user")
    }
  }

  async function changeRole(userId: string, role: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        toast.success("Role updated")
        fetchUsers()
      }
    } catch {
      toast.error("Failed to update role")
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Admin access required</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Settings</h1>
            <p className="text-xs text-gray-500 mt-1">Manage users, roles, and system configuration</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 pb-px">
          {(["users", "audit"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-xs font-medium rounded-t-lg transition-colors",
                tab === t
                  ? "bg-gray-800 text-gray-100 border border-gray-700 border-b-gray-800 -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {t === "users" ? "User Management" : "Audit Log"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "users" ? (
          <div>
            {/* Invite button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                + Invite User
              </button>
            </div>

            {/* Invite form */}
            {showInvite && (
              <form onSubmit={handleInvite} className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Name</label>
                    <input
                      type="text" required value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Email</label>
                    <input
                      type="email" required value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Password</label>
                    <input
                      type="password" required minLength={8} value={inviteForm.password}
                      onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                      className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Department</label>
                    <input
                      type="text" value={inviteForm.department}
                      onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={saving}
                    className="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50">
                    {saving ? "Creating…" : "Create User"}
                  </button>
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="px-4 py-1.5 text-xs text-gray-400 hover:text-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Users table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Department</th>
                    <th className="text-center px-4 py-3 font-medium">Activities</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-200 font-medium">{u.name}</p>
                          <p className="text-gray-600 text-[10px]">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          disabled={u.id === session?.user?.id}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 disabled:opacity-50"
                        >
                          {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.department || "—"}</td>
                      <td className="px-4 py-3 text-center text-gray-400">
                        {(u._count?.ownedActivities ?? 0) + (u._count?.assignedActivities ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium",
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        )}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== session?.user?.id && (
                          <button
                            onClick={() => toggleUserActive(u.id, u.isActive)}
                            className={cn(
                              "text-[10px] px-2 py-1 rounded transition-colors",
                              u.isActive
                                ? "text-red-400 hover:bg-red-500/10"
                                : "text-emerald-400 hover:bg-emerald-500/10"
                            )}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-gray-600 py-8 text-xs">No users found</p>
              )}
            </div>
          </div>
        ) : (
          /* Audit Log Tab */
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{log.user.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium",
                        log.action === "create" && "bg-emerald-500/10 text-emerald-400",
                        log.action === "update" && "bg-blue-500/10 text-blue-400",
                        log.action === "delete" && "bg-red-500/10 text-red-400",
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{log.entityType}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {log.details !== "{}" ? log.details : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <p className="text-center text-gray-600 py-8 text-xs">No audit logs yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
