export type NodeStatus = "Idea" | "Planned" | "In Progress" | "Blocked" | "Completed"
export type NodePriority = "Critical" | "High" | "Medium" | "Low"

export type NodeCategory =
  | "Customer Zero"
  | "Offering Creation"
  | "AI Governance"
  | "Enablement & Support"
  | "Research & Development"

export type RelationshipType =
  | "DEPENDS_ON"
  | "RELATED_TO"
  | "INFLUENCES"
  | "REUSES"
  | "BLOCKED_BY"
  | "COMPLIES_WITH"

export type UserRole = "admin" | "manager" | "member" | "viewer"

export type NotificationType =
  | "milestone_overdue"
  | "status_change"
  | "assignment"
  | "mention"
  | "update"
  | "blocked"

export interface NodePosition {
  x: number
  y: number
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  avatar: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ActivityNode {
  id: string
  title: string
  description: string
  category: NodeCategory
  owner: string
  ownerId?: string | null
  assigneeId?: string | null
  createdById?: string | null
  status: NodeStatus
  priority: NodePriority
  progress: number
  startDate: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
  notes: string
  links: string[]
  artifacts: string[]
  position: NodePosition
}

export interface NodeUpdate {
  id: string
  nodeId: string
  text: string
  author: string
  userId?: string | null
  createdAt: string
}

export interface Milestone {
  id: string
  nodeId: string
  title: string
  dueDate: string | null
  completed: boolean
  assigneeId?: string | null
  createdAt: string
}

export interface ActivityEdge {
  id: string
  source: string
  target: string
  relationship: RelationshipType
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  entityId: string | null
  entityType: string | null
  isRead: boolean
  createdAt: string
}

export interface Attachment {
  id: string
  nodeId: string
  userId: string | null
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt: string
}

export interface GraphData {
  nodes: ActivityNode[]
  edges: ActivityEdge[]
}

export interface CategoryNodeData {
  category: NodeCategory
  count: number
  isExpanded: boolean
}

export const ALL_ROLES: UserRole[] = ["admin", "manager", "member", "viewer"]

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  "Customer Zero": "#6366f1",
  "Offering Creation": "#10b981",
  "AI Governance": "#f59e0b",
  "Enablement & Support": "#0ea5e9",
  "Research & Development": "#f43f5e",
}

export const CATEGORY_BG: Record<NodeCategory, string> = {
  "Customer Zero": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "Offering Creation": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "AI Governance": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Enablement & Support": "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "Research & Development": "bg-rose-500/10 text-rose-400 border-rose-500/30",
}

export const CATEGORY_DOT: Record<NodeCategory, string> = {
  "Customer Zero": "bg-indigo-500",
  "Offering Creation": "bg-emerald-500",
  "AI Governance": "bg-amber-500",
  "Enablement & Support": "bg-sky-500",
  "Research & Development": "bg-rose-500",
}

export const CATEGORY_ACCENT: Record<NodeCategory, string> = {
  "Customer Zero": "accent-indigo-500",
  "Offering Creation": "accent-emerald-500",
  "AI Governance": "accent-amber-500",
  "Enablement & Support": "accent-sky-500",
  "Research & Development": "accent-rose-500",
}

export const CATEGORY_BORDER_L: Record<NodeCategory, string> = {
  "Customer Zero": "border-l-indigo-500",
  "Offering Creation": "border-l-emerald-500",
  "AI Governance": "border-l-amber-500",
  "Enablement & Support": "border-l-sky-500",
  "Research & Development": "border-l-rose-500",
}

export const STATUS_COLORS: Record<NodeStatus, string> = {
  Idea: "text-gray-400",
  Planned: "text-blue-400",
  "In Progress": "text-emerald-400",
  Blocked: "text-red-400",
  Completed: "text-gray-500",
}

export const ALL_CATEGORIES: NodeCategory[] = [
  "Customer Zero",
  "Offering Creation",
  "AI Governance",
  "Enablement & Support",
  "Research & Development",
]

export const ALL_STATUSES: NodeStatus[] = [
  "Idea",
  "Planned",
  "In Progress",
  "Blocked",
  "Completed",
]

export const ALL_PRIORITIES: NodePriority[] = ["Critical", "High", "Medium", "Low"]

export const PRIORITY_COLORS: Record<NodePriority, string> = {
  Critical: "text-red-400 border-red-500/40 bg-red-500/10",
  High: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  Medium: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  Low: "text-gray-400 border-gray-600 bg-gray-800",
}

export const ALL_RELATIONSHIPS: RelationshipType[] = [
  "DEPENDS_ON",
  "RELATED_TO",
  "INFLUENCES",
  "REUSES",
  "BLOCKED_BY",
  "COMPLIES_WITH",
]
