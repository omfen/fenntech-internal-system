import { type Category, type InsertCategory, type UpdateCategory, type User, type InsertUser, type PricingSession, type InsertPricingSession, type AmazonPricingSession, type InsertAmazonPricingSession, type CustomerInquiry, type InsertCustomerInquiry, type QuotationRequest, type InsertQuotationRequest, type WorkOrder, type InsertWorkOrder, type Ticket, type InsertTicket, type CallLog, type InsertCallLog, type Task, type InsertTask, type UpdateTask, type TaskLog, type InsertTaskLog, type ChangeLog, type InsertChangeLog, type CompanySettings, type InsertCompanySettings, type Client, type InsertClient, type Quotation, type InsertQuotation, type Invoice, type InsertInvoice, type Notification, type InsertNotification, categories, users, pricingSessions, amazonPricingSessions, customerInquiries, quotationRequests, workOrders, tickets, callLogs, tasks, taskLogs, changeLog, companySettings, clients, quotations, invoices, notifications } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: 'user' | 'administrator'): Promise<User | undefined>;
  updateUserStatus(id: string, isActive: boolean): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(category: UpdateCategory): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Pricing Sessions
  getPricingSessions(): Promise<PricingSession[]>;
  getPricingSessionById(id: string): Promise<PricingSession | undefined>;
  createPricingSession(session: InsertPricingSession): Promise<PricingSession>;
  updatePricingSessionEmailSent(id: string): Promise<void>;

  // Amazon Pricing Sessions
  getAmazonPricingSessions(): Promise<AmazonPricingSession[]>;
  getAmazonPricingSessionById(id: string): Promise<AmazonPricingSession | undefined>;
  createAmazonPricingSession(session: InsertAmazonPricingSession): Promise<AmazonPricingSession>;
  updateAmazonPricingSessionEmailSent(id: string): Promise<void>;

  // Customer Inquiries
  getCustomerInquiries(): Promise<CustomerInquiry[]>;
  getCustomerInquiryById(id: string): Promise<CustomerInquiry | undefined>;
  createCustomerInquiry(inquiry: InsertCustomerInquiry): Promise<CustomerInquiry>;
  updateCustomerInquiry(id: string, updates: Partial<CustomerInquiry>): Promise<CustomerInquiry | undefined>;
  deleteCustomerInquiry(id: string): Promise<boolean>;

  // Quotation Requests
  getQuotationRequests(): Promise<QuotationRequest[]>;
  getQuotationRequestById(id: string): Promise<QuotationRequest | undefined>;
  createQuotationRequest(request: InsertQuotationRequest): Promise<QuotationRequest>;
  updateQuotationRequest(id: string, updates: Partial<QuotationRequest>): Promise<QuotationRequest | undefined>;
  deleteQuotationRequest(id: string): Promise<boolean>;

  // Work Orders
  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrderById(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder, userId?: string, userName?: string): Promise<WorkOrder>;
  updateWorkOrder(id: string, updates: Partial<WorkOrder>, userId?: string, userName?: string): Promise<WorkOrder | undefined>;
  deleteWorkOrder(id: string): Promise<boolean>;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicketById(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;
  getTicketsByAssignedUser(userId: string): Promise<Ticket[]>;

  // Call Logs
  getCallLogs(): Promise<CallLog[]>;
  getCallLogById(id: string): Promise<CallLog | undefined>;
  createCallLog(callLog: InsertCallLog): Promise<CallLog>;
  updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog | undefined>;
  deleteCallLog(id: string): Promise<boolean>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  createTask(taskData: InsertTask & { createdById: string; createdByName: string }): Promise<Task>;
  updateTask(id: string, updates: UpdateTask & { updatedById?: string; updatedByName?: string }): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  getTaskLogs(taskId: string): Promise<TaskLog[]>;
  createTaskLog(logData: InsertTaskLog): Promise<TaskLog>;

  // Change Log
  getChangeLog(limit?: number): Promise<ChangeLog[]>;
  createChangeLog(log: InsertChangeLog): Promise<ChangeLog>;

  // Admin user management
  adminCreateUser(userData: InsertUser & { requiresAdminApproval?: boolean }): Promise<User>;
  getUsersPendingApproval(): Promise<User[]>;
  approveUser(id: string): Promise<User | undefined>;

  // Company settings operations
  getCompanySettings(): Promise<CompanySettings | undefined>;
  createOrUpdateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;

  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Quotation operations
  getQuotations(): Promise<Quotation[]>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  deleteQuotation(id: string): Promise<boolean>;
  generateQuoteNumber(): Promise<string>;

  // Invoice operations
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  generateInvoiceNumber(): Promise<string>;

  // Notifications
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    
    // Check if email requires admin approval
    const requiresApproval = !userData.email.endsWith("@fenntechltd.com") && 
                            !userData.email.endsWith("@876get.com");
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
        requiresAdminApproval: requiresApproval,
        isActive: !requiresApproval, // Auto-activate for allowed domains
      })
      .returning();
    return user;
  }

  // Admin create user (allows any domain)
  async adminCreateUser(userData: InsertUser & { requiresAdminApproval?: boolean }): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
        requiresAdminApproval: userData.requiresAdminApproval || false,
        isActive: true, // Admin can create active users
      })
      .returning();
    return user;
  }

  // Get users pending approval
  async getUsersPendingApproval(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.requiresAdminApproval, true));
  }

  // Approve user
  async approveUser(id: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ 
        requiresAdminApproval: false,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(id: string, role: 'user' | 'administrator'): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Customer Inquiries methods
  async getCustomerInquiries(): Promise<CustomerInquiry[]> {
    return await db.select().from(customerInquiries).orderBy(customerInquiries.createdAt);
  }

  async getCustomerInquiryById(id: string): Promise<CustomerInquiry | undefined> {
    const [inquiry] = await db.select().from(customerInquiries).where(eq(customerInquiries.id, id));
    return inquiry || undefined;
  }

  async createCustomerInquiry(inquiryData: InsertCustomerInquiry): Promise<CustomerInquiry> {
    const [inquiry] = await db
      .insert(customerInquiries)
      .values(inquiryData)
      .returning();
    return inquiry;
  }

  async updateCustomerInquiry(id: string, updates: Partial<CustomerInquiry>): Promise<CustomerInquiry | undefined> {
    const [inquiry] = await db
      .update(customerInquiries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(customerInquiries.id, id))
      .returning();
    return inquiry || undefined;
  }

  async deleteCustomerInquiry(id: string): Promise<boolean> {
    const result = await db.delete(customerInquiries).where(eq(customerInquiries.id, id));
    return result.rowCount > 0;
  }

  // Quotation Requests methods
  async getQuotationRequests(): Promise<QuotationRequest[]> {
    return await db.select().from(quotationRequests).orderBy(quotationRequests.createdAt);
  }

  async getQuotationRequestById(id: string): Promise<QuotationRequest | undefined> {
    const [request] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, id));
    return request || undefined;
  }

  async createQuotationRequest(requestData: InsertQuotationRequest): Promise<QuotationRequest> {
    const [request] = await db
      .insert(quotationRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async updateQuotationRequest(id: string, updates: Partial<QuotationRequest>): Promise<QuotationRequest | undefined> {
    const [request] = await db
      .update(quotationRequests)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(quotationRequests.id, id))
      .returning();
    return request || undefined;
  }

  async deleteQuotationRequest(id: string): Promise<boolean> {
    const result = await db.delete(quotationRequests).where(eq(quotationRequests.id, id));
    return result.rowCount > 0;
  }

  async getCategories(): Promise<Category[]> {
    const result = await db.select().from(categories).orderBy(categories.name);
    return result;
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(updateCategory: UpdateCategory): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set({
        name: updateCategory.name,
        markupPercentage: updateCategory.markupPercentage,
      })
      .where(eq(categories.id, updateCategory.id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPricingSessions(): Promise<PricingSession[]> {
    const result = await db.select().from(pricingSessions).orderBy(pricingSessions.createdAt);
    return result;
  }

  async getPricingSessionById(id: string): Promise<PricingSession | undefined> {
    const [session] = await db.select().from(pricingSessions).where(eq(pricingSessions.id, id));
    return session || undefined;
  }

  async createPricingSession(insertSession: InsertPricingSession): Promise<PricingSession> {
    const [session] = await db
      .insert(pricingSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updatePricingSession(id: string, updateData: Partial<InsertPricingSession>): Promise<PricingSession | undefined> {
    const [session] = await db
      .update(pricingSessions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(pricingSessions.id, id))
      .returning();
    return session || undefined;
  }

  async updatePricingSessionEmailSent(id: string): Promise<void> {
    await db
      .update(pricingSessions)
      .set({ emailSent: new Date() })
      .where(eq(pricingSessions.id, id));
  }

  // Amazon Pricing Sessions
  async getAmazonPricingSessions(): Promise<AmazonPricingSession[]> {
    const result = await db.select().from(amazonPricingSessions).orderBy(amazonPricingSessions.createdAt);
    return result;
  }

  async getAmazonPricingSessionById(id: string): Promise<AmazonPricingSession | undefined> {
    const [session] = await db.select().from(amazonPricingSessions).where(eq(amazonPricingSessions.id, id));
    return session || undefined;
  }

  async createAmazonPricingSession(insertSession: InsertAmazonPricingSession): Promise<AmazonPricingSession> {
    const [session] = await db
      .insert(amazonPricingSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateAmazonPricingSession(id: string, updateData: Partial<InsertAmazonPricingSession>): Promise<AmazonPricingSession | undefined> {
    const [session] = await db
      .update(amazonPricingSessions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(amazonPricingSessions.id, id))
      .returning();
    return session || undefined;
  }

  async updateAmazonPricingSessionEmailSent(id: string): Promise<void> {
    await db
      .update(amazonPricingSessions)
      .set({ emailSent: new Date() })
      .where(eq(amazonPricingSessions.id, id));
  }

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    return await db.select().from(workOrders).orderBy(workOrders.createdAt);
  }

  async getWorkOrderById(id: string): Promise<WorkOrder | undefined> {
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return workOrder || undefined;
  }

  async createWorkOrder(workOrder: InsertWorkOrder, userId?: string, userName?: string): Promise<WorkOrder> {
    const [newWorkOrder] = await db.insert(workOrders).values(workOrder).returning();
    
    // Log work order creation
    if (userId && userName) {
      await this.logWorkOrderChange(
        newWorkOrder.id,
        'created',
        null,
        null,
        null,
        userId,
        userName,
        `Work order created for customer "${newWorkOrder.customerName}"`
      );
    }
    
    return newWorkOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>, userId?: string, userName?: string): Promise<WorkOrder | undefined> {
    // Get current work order for comparison
    const currentWorkOrder = await this.getWorkOrderById(id);
    if (!currentWorkOrder) return undefined;

    const [workOrder] = await db.update(workOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();

    // Log changes if user info is provided
    if (userId && userName && workOrder) {
      for (const [field, newValue] of Object.entries(updates)) {
        if (field === 'updatedAt') continue; // Skip auto-generated fields
        
        const oldValue = currentWorkOrder[field as keyof WorkOrder];
        if (oldValue !== newValue) {
          let description = "";
          
          switch (field) {
            case 'status':
              description = `Status changed from "${oldValue}" to "${newValue}"`;
              break;
            case 'assignedUserId':
              const oldUser = oldValue ? await this.getUserById(oldValue as string) : null;
              const newUser = newValue ? await this.getUserById(newValue as string) : null;
              const oldUserName = oldUser ? `${oldUser.firstName} ${oldUser.lastName}` : 'Unassigned';
              const newUserName = newUser ? `${newUser.firstName} ${newUser.lastName}` : 'Unassigned';
              description = `Assignment changed from "${oldUserName}" to "${newUserName}"`;
              break;
            case 'notes':
              description = `Notes updated`;
              break;
            case 'dueDate':
              description = `Due date changed from "${oldValue}" to "${newValue}"`;
              break;
            default:
              description = `${field} changed from "${oldValue}" to "${newValue}"`;
          }

          await this.logWorkOrderChange(
            id,
            'updated',
            field,
            oldValue ? String(oldValue) : null,
            newValue ? String(newValue) : null,
            userId,
            userName,
            description
          );
        }
      }
    }

    return workOrder || undefined;
  }

  async updateWorkOrderEmailSent(id: string): Promise<void> {
    await db
      .update(workOrders)
      .set({ lastEmailSent: new Date() })
      .where(eq(workOrders.id, id));
  }

  async deleteWorkOrder(id: string): Promise<boolean> {
    const result = await db.delete(workOrders).where(eq(workOrders.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(tickets.createdAt);
  }



  async getTicketById(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const [ticket] = await db.update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result = await db.delete(tickets).where(eq(tickets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTicketsByAssignedUser(userId: string): Promise<Ticket[]> {
    return await db.select().from(tickets).where(eq(tickets.assignedUserId, userId)).orderBy(tickets.createdAt);
  }

  // Call Logs operations
  async getCallLogs(): Promise<CallLog[]> {
    return await db.select().from(callLogs).orderBy(callLogs.createdAt);
  }

  async getCallLogById(id: string): Promise<CallLog | undefined> {
    const [callLog] = await db.select().from(callLogs).where(eq(callLogs.id, id));
    return callLog || undefined;
  }

  async createCallLog(callLog: InsertCallLog): Promise<CallLog> {
    const [newCallLog] = await db.insert(callLogs).values(callLog).returning();
    return newCallLog;
  }

  async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog | undefined> {
    const [callLog] = await db.update(callLogs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(callLogs.id, id))
      .returning();
    return callLog || undefined;
  }

  async deleteCallLog(id: string): Promise<boolean> {
    const result = await db.delete(callLogs).where(eq(callLogs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(taskData: InsertTask & { createdById: string; createdByName: string }): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    
    // Log task creation
    await this.createTaskLog({
      taskId: task.id,
      action: "created",
      description: `Task "${task.title}" was created`,
      userId: taskData.createdById,
      userName: taskData.createdByName,
    });

    return task;
  }

  async updateTask(id: string, updates: UpdateTask & { updatedById?: string; updatedByName?: string }): Promise<Task | null> {
    const currentTask = await this.getTaskById(id);
    if (!currentTask) return null;

    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    // Log task update
    if (updates.updatedById && updates.updatedByName) {
      await this.createTaskLog({
        taskId: id,
        action: "updated",
        description: `Task "${updatedTask.title}" was updated`,
        userId: updates.updatedById,
        userName: updates.updatedByName,
      });

      // Set completion time if marked as completed
      if (updates.status === "completed" && currentTask.status !== "completed") {
        await db
          .update(tasks)
          .set({ completedAt: new Date() })
          .where(eq(tasks.id, id));
      }
    }

    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Task Logs
  async getTaskLogs(taskId: string): Promise<TaskLog[]> {
    return await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.taskId, taskId))
      .orderBy(desc(taskLogs.createdAt));
  }

  async createTaskLog(logData: InsertTaskLog): Promise<TaskLog> {
    const [log] = await db.insert(taskLogs).values(logData).returning();
    return log;
  }

  // Change Log methods
  async getChangeLog(limit: number = 50): Promise<ChangeLog[]> {
    return await db.select()
      .from(changeLog)
      .orderBy(desc(changeLog.createdAt))
      .limit(limit);
  }

  async createChangeLog(logData: InsertChangeLog): Promise<ChangeLog> {
    const [log] = await db.insert(changeLog).values(logData).returning();
    return log;
  }

  // Helper method to log changes for any entity
  async logEntityChange(
    entityType: string,
    entityId: string,
    action: string,
    fieldChanged: string | null,
    oldValue: string | null,
    newValue: string | null,
    userId: string,
    userName: string,
    description: string
  ): Promise<void> {
    await this.createChangeLog({
      entityType,
      entityId,
      action,
      fieldChanged,
      oldValue,
      newValue,
      userId,
      userName,
      description,
    });
  }

  // Helper method to log changes for work orders
  async logWorkOrderChange(
    workOrderId: string,
    action: string,
    fieldChanged: string | null,
    oldValue: string | null,
    newValue: string | null,
    userId: string | null,
    userName: string,
    description: string
  ): Promise<void> {
    await this.createChangeLog({
      entityType: "work_order",
      entityId: workOrderId,
      action,
      fieldChanged,
      oldValue,
      newValue,
      userId,
      userName,
      description,
    });
  }

  // Initialize with predefined categories if none exist
  async initializeCategories(): Promise<void> {
    const existingCategories = await this.getCategories();
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Accessories", markupPercentage: "100.00" },
        { name: "Ink", markupPercentage: "45.00" },
        { name: "Sub Woofers", markupPercentage: "35.00" },
        { name: "Speakers", markupPercentage: "45.00" },
        { name: "Headphones", markupPercentage: "65.00" },
        { name: "UPS", markupPercentage: "50.00" },
        { name: "Laptop Bags", markupPercentage: "50.00" },
        { name: "Laptops", markupPercentage: "25.00" },
        { name: "Desktops", markupPercentage: "25.00" },
        { name: "Adaptors", markupPercentage: "65.00" },
        { name: "Routers", markupPercentage: "50.00" },
      ];

      for (const cat of defaultCategories) {
        await this.createCategory(cat);
      }
    }
  }

  // Company Settings methods
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings || undefined;
  }

  async createOrUpdateCompanySettings(settingsData: InsertCompanySettings): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    
    if (existing) {
      const [updated] = await db
        .update(companySettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(companySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(companySettings).values(settingsData).returning();
      return created;
    }
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Quotation methods
  async getQuotations(): Promise<Quotation[]> {
    return await db.select().from(quotations).orderBy(desc(quotations.createdAt));
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation || undefined;
  }

  async createQuotation(quotationData: InsertQuotation): Promise<Quotation> {
    // Convert string dates to Date objects for database insertion
    const processedData = {
      ...quotationData,
      quoteDate: new Date(quotationData.quoteDate),
      expirationDate: new Date(quotationData.expirationDate),
    };
    const [quotation] = await db.insert(quotations).values(processedData).returning();
    return quotation;
  }

  async updateQuotation(id: string, quotationData: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    // Convert string dates to Date objects if they exist
    const processedData: any = { ...quotationData };
    if (quotationData.quoteDate) {
      processedData.quoteDate = new Date(quotationData.quoteDate);
    }
    if (quotationData.expirationDate) {
      processedData.expirationDate = new Date(quotationData.expirationDate);
    }
    
    const [updated] = await db
      .update(quotations)
      .set({ ...processedData, updatedAt: new Date() })
      .where(eq(quotations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteQuotation(id: string): Promise<boolean> {
    const result = await db.delete(quotations).where(eq(quotations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async generateQuoteNumber(): Promise<string> {
    const count = await db.select().from(quotations);
    const nextNumber = count.length + 1;
    return `Q${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;
  }

  // Invoice methods
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(invoiceData).returning();
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async generateInvoiceNumber(): Promise<string> {
    const count = await db.select().from(invoices);
    const nextNumber = count.length + 1;
    return `INV${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;
  }

  // Notification methods
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
