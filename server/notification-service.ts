import { db } from './db';
import { notifications, users, tasks, tickets, workOrders, callLogs, customerInquiries, quotationRequests } from '@shared/schema';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import type { InsertNotification } from '@shared/schema';

export class NotificationService {
  // Create a new notification
  static async createNotification(notification: InsertNotification) {
    try {
      const [newNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning();
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notifications for due dates
  static async createDueDateNotifications() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    try {
      // Check tasks due tomorrow or today
      const dueTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          dueDate: tasks.dueDate,
          assignedUserId: tasks.assignedUserId,
        })
        .from(tasks)
        .where(
          and(
            or(
              and(tasks.dueDate !== null, lt(tasks.dueDate, tomorrow)),
            ),
            eq(tasks.status, 'pending')
          )
        );

      // Check tickets due tomorrow or today
      const dueTickets = await db
        .select({
          id: tickets.id,
          title: tickets.title,
          dueDate: tickets.dueDate,
          assignedUserId: tickets.assignedUserId,
        })
        .from(tickets)
        .where(
          and(
            or(
              and(tickets.dueDate !== null, lt(tickets.dueDate, tomorrow)),
            ),
            eq(tickets.status, 'open')
          )
        );

      // Check work orders due tomorrow or today
      const dueWorkOrders = await db
        .select({
          id: workOrders.id,
          customerName: workOrders.customerName,
          dueDate: workOrders.dueDate,
          assignedUserId: workOrders.assignedUserId,
        })
        .from(workOrders)
        .where(
          and(
            or(
              and(workOrders.dueDate !== null, lt(workOrders.dueDate, tomorrow)),
            ),
            eq(workOrders.status, 'in_progress')
          )
        );

      const notificationsToCreate: InsertNotification[] = [];

      // Create notifications for due tasks
      for (const task of dueTasks) {
        if (task.assignedUserId && task.dueDate) {
          const isOverdue = task.dueDate < new Date();
          const isDueToday = task.dueDate <= today;
          
          notificationsToCreate.push({
            userId: task.assignedUserId,
            type: isOverdue ? 'overdue' : 'due_date',
            title: isOverdue ? 'Task Overdue' : isDueToday ? 'Task Due Today' : 'Task Due Tomorrow',
            message: `Task "${task.title}" is ${isOverdue ? 'overdue' : isDueToday ? 'due today' : 'due tomorrow'}`,
            entityType: 'task',
            entityId: task.id,
            priority: isOverdue ? 'urgent' : 'high',
            actionUrl: `/tasks`,
            metadata: { dueDate: task.dueDate.toISOString() },
          });
        }
      }

      // Create notifications for due tickets
      for (const ticket of dueTickets) {
        if (ticket.assignedUserId && ticket.dueDate) {
          const isOverdue = ticket.dueDate < new Date();
          const isDueToday = ticket.dueDate <= today;
          
          notificationsToCreate.push({
            userId: ticket.assignedUserId,
            type: isOverdue ? 'overdue' : 'due_date',
            title: isOverdue ? 'Ticket Overdue' : isDueToday ? 'Ticket Due Today' : 'Ticket Due Tomorrow',
            message: `Ticket "${ticket.title}" is ${isOverdue ? 'overdue' : isDueToday ? 'due today' : 'due tomorrow'}`,
            entityType: 'ticket',
            entityId: ticket.id,
            priority: isOverdue ? 'urgent' : 'high',
            actionUrl: `/tickets`,
            metadata: { dueDate: ticket.dueDate.toISOString() },
          });
        }
      }

      // Create notifications for due work orders
      for (const workOrder of dueWorkOrders) {
        if (workOrder.assignedUserId && workOrder.dueDate) {
          const isOverdue = workOrder.dueDate < new Date();
          const isDueToday = workOrder.dueDate <= today;
          
          notificationsToCreate.push({
            userId: workOrder.assignedUserId,
            type: isOverdue ? 'overdue' : 'due_date',
            title: isOverdue ? 'Work Order Overdue' : isDueToday ? 'Work Order Due Today' : 'Work Order Due Tomorrow',
            message: `Work order for "${workOrder.customerName}" is ${isOverdue ? 'overdue' : isDueToday ? 'due today' : 'due tomorrow'}`,
            entityType: 'work_order',
            entityId: workOrder.id,
            priority: isOverdue ? 'urgent' : 'high',
            actionUrl: `/work-orders`,
            metadata: { dueDate: workOrder.dueDate.toISOString() },
          });
        }
      }

      // Batch create notifications
      if (notificationsToCreate.length > 0) {
        await db.insert(notifications).values(notificationsToCreate);
        console.log(`Created ${notificationsToCreate.length} due date notifications`);
      }

    } catch (error) {
      console.error('Error creating due date notifications:', error);
    }
  }

  // Create notification for status changes
  static async createStatusChangeNotification(
    entityType: string,
    entityId: string,
    entityTitle: string,
    oldStatus: string,
    newStatus: string,
    assignedUserId?: string,
    createdById?: string
  ) {
    if (!assignedUserId && !createdById) return;

    const usersToNotify = [assignedUserId, createdById].filter(Boolean);

    try {
      const notificationsToCreate: InsertNotification[] = usersToNotify.map(userId => ({
        userId: userId!,
        type: 'status_change',
        title: `${entityType.replace('_', ' ')} Status Updated`,
        message: `"${entityTitle}" status changed from ${oldStatus} to ${newStatus}`,
        entityType,
        entityId,
        priority: 'medium',
        actionUrl: `/${entityType.replace('_', '-')}s`,
        metadata: { oldStatus, newStatus },
      }));

      await db.insert(notifications).values(notificationsToCreate);
    } catch (error) {
      console.error('Error creating status change notification:', error);
    }
  }

  // Create notification for assignments
  static async createAssignmentNotification(
    entityType: string,
    entityId: string,
    entityTitle: string,
    assignedUserId: string,
    assignedByUserId: string
  ) {
    if (assignedUserId === assignedByUserId) return;

    try {
      // Get assigner's name
      const [assigner] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, assignedByUserId));

      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Someone';

      await this.createNotification({
        userId: assignedUserId,
        type: 'assignment',
        title: `New ${entityType.replace('_', ' ')} Assigned`,
        message: `${assignerName} assigned "${entityTitle}" to you`,
        entityType,
        entityId,
        priority: 'medium',
        actionUrl: `/${entityType.replace('_', '-')}s`,
        metadata: { assignedBy: assignerName },
      });
    } catch (error) {
      console.error('Error creating assignment notification:', error);
    }
  }

  // Create system alert notification
  static async createSystemAlert(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    actionUrl?: string
  ) {
    try {
      await this.createNotification({
        userId,
        type: 'system_alert',
        title,
        message,
        priority,
        actionUrl,
        metadata: {},
      });
    } catch (error) {
      console.error('Error creating system alert:', error);
    }
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const result = await db
        .delete(notifications)
        .where(lt(notifications.createdAt, thirtyDaysAgo));

      console.log(`Cleaned up old notifications`);
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: string, limit = 50) {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt)
        .limit(limit);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.id, notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string) {
    try {
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}