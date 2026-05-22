import { prisma } from "@/lib/prisma"

type NotifyParams = {
  userId: string
  type: string
  title: string
  message: string
  entityId?: string | null
  entityType?: string | null
}

export async function createNotification(params: NotifyParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityId: params.entityId ?? null,
      entityType: params.entityType ?? null,
    },
  })
}

/**
 * Notify relevant users when an activity status changes.
 */
export async function notifyStatusChange(
  nodeId: string,
  nodeTitle: string,
  oldStatus: string,
  newStatus: string,
  changedByUserId: string
) {
  const node = await prisma.activityNode.findUnique({
    where: { id: nodeId },
    select: { ownerId: true, assigneeId: true },
  })
  if (!node) return

  const userIds = new Set<string>()
  if (node.ownerId && node.ownerId !== changedByUserId) userIds.add(node.ownerId)
  if (node.assigneeId && node.assigneeId !== changedByUserId) userIds.add(node.assigneeId)

  const notifications = Array.from(userIds).map((uid) => ({
    userId: uid,
    type: "status_change",
    title: `Status Changed: ${nodeTitle}`,
    message: `Status changed from "${oldStatus}" to "${newStatus}"`,
    entityId: nodeId,
    entityType: "activity",
  }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

/**
 * Notify a user when assigned to an activity.
 */
export async function notifyAssignment(
  nodeId: string,
  nodeTitle: string,
  assigneeId: string,
  assignedByUserId: string
) {
  if (assigneeId === assignedByUserId) return

  await createNotification({
    userId: assigneeId,
    type: "assignment",
    title: `Assigned: ${nodeTitle}`,
    message: `You have been assigned to "${nodeTitle}"`,
    entityId: nodeId,
    entityType: "activity",
  })
}

/**
 * Check for overdue milestones and create notifications.
 */
export async function checkOverdueMilestones() {
  const overdue = await prisma.milestone.findMany({
    where: {
      completed: false,
      dueDate: { lt: new Date() },
    },
    include: {
      node: { select: { id: true, title: true, ownerId: true, assigneeId: true } },
    },
  })

  const notifications: Array<{
    userId: string
    type: string
    title: string
    message: string
    entityId: string | null
    entityType: string | null
  }> = []

  for (const ms of overdue) {
    const userIds = new Set<string>()
    if (ms.node.ownerId) userIds.add(ms.node.ownerId)
    if (ms.node.assigneeId) userIds.add(ms.node.assigneeId)
    if (ms.assigneeId) userIds.add(ms.assigneeId)

    for (const uid of userIds) {
      notifications.push({
        userId: uid,
        type: "milestone_overdue",
        title: `Overdue: ${ms.title}`,
        message: `Milestone "${ms.title}" for "${ms.node.title}" is overdue`,
        entityId: ms.node.id,
        entityType: "activity",
      })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  return notifications.length
}
