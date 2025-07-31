import { type Category, type InsertCategory, type UpdateCategory, type User, type InsertUser, type PricingSession, type InsertPricingSession, type AmazonPricingSession, type InsertAmazonPricingSession, type CustomerInquiry, type InsertCustomerInquiry, type QuotationRequest, type InsertQuotationRequest, type WorkOrder, type InsertWorkOrder, type Ticket, type InsertTicket, type CallLog, type InsertCallLog, categories, users, pricingSessions, amazonPricingSessions, customerInquiries, quotationRequests, workOrders, tickets, callLogs } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | undefined>;
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
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
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

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [newWorkOrder] = await db.insert(workOrders).values(workOrder).returning();
    return newWorkOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | undefined> {
    const [workOrder] = await db.update(workOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();
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
}

export const storage = new DatabaseStorage();
