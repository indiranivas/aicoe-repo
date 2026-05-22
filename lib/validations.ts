import { z } from "zod"

// ─── Enums ───────────────────────────────────────────────────
export const NodeStatusEnum = z.enum(["Idea", "Planned", "In Progress", "Blocked", "Completed"])
export const NodePriorityEnum = z.enum(["Critical", "High", "Medium", "Low"])
export const NodeCategoryEnum = z.enum([
  "Customer Zero",
  "Offering Creation",
  "AI Governance",
  "Enablement & Support",
  "Research & Development",
])
export const RelationshipTypeEnum = z.enum([
  "DEPENDS_ON", "RELATED_TO", "INFLUENCES", "REUSES", "BLOCKED_BY", "COMPLIES_WITH",
])
export const UserRoleEnum = z.enum(["admin", "manager", "member", "viewer"])
export const NotificationTypeEnum = z.enum([
  "milestone_overdue", "status_change", "assignment", "mention", "update", "blocked",
])

// ─── User Schemas ────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: UserRoleEnum.default("member"),
  department: z.string().trim().max(100).default(""),
})

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(200).optional(),
  role: UserRoleEnum.optional(),
  department: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional(),
})

// ─── Activity Node Schemas ───────────────────────────────────
export const createNodeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).default(""),
  category: NodeCategoryEnum,
  owner: z.string().max(100).default(""),
  ownerId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  status: NodeStatusEnum.default("Idea"),
  priority: NodePriorityEnum.default("Medium"),
  progress: z.number().int().min(0).max(100).default(0),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: z.string().max(10000).default(""),
  links: z.array(z.string().url().max(2000)).max(20).default([]),
  artifacts: z.array(z.string().max(500)).max(50).default([]),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
})

export const updateNodeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: NodeCategoryEnum.optional(),
  owner: z.string().max(100).optional(),
  ownerId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  status: NodeStatusEnum.optional(),
  priority: NodePriorityEnum.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(10000).optional(),
  links: z.array(z.string().max(2000)).max(20).optional(),
  artifacts: z.array(z.string().max(500)).max(50).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
})

// ─── Edge Schemas ────────────────────────────────────────────
export const createEdgeSchema = z.object({
  id: z.string().uuid().optional(),
  source: z.string().uuid("Invalid source node ID"),
  target: z.string().uuid("Invalid target node ID"),
  relationship: RelationshipTypeEnum.default("RELATED_TO"),
})

// ─── Update Schemas ──────────────────────────────────────────
export const createUpdateSchema = z.object({
  nodeId: z.string().uuid("Invalid node ID"),
  text: z.string().trim().min(1, "Text is required").max(5000),
  author: z.string().max(100).default(""),
})

// ─── Milestone Schemas ───────────────────────────────────────
export const createMilestoneSchema = z.object({
  nodeId: z.string().uuid("Invalid node ID"),
  title: z.string().trim().min(1, "Title is required").max(200),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
})

export const updateMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
})

// ─── Notification Schemas ────────────────────────────────────
export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: NotificationTypeEnum,
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  entityId: z.string().uuid().nullable().optional(),
  entityType: z.enum(["activity", "milestone", "update"]).nullable().optional(),
})

// ─── Settings Schemas ────────────────────────────────────────
export const updateSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(5000),
})

// ─── Setup Schema ────────────────────────────────────────────
export const setupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
})
