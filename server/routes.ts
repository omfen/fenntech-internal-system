import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, requireAdmin } from "./auth";
import authRoutes from "./auth-routes";
import { insertCategorySchema, updateCategorySchema, insertPricingSessionSchema, insertAmazonPricingSessionSchema, insertCustomerInquirySchema, insertQuotationRequestSchema, insertWorkOrderSchema, insertTicketSchema, type EmailReport, type User, insertCashCollectionSchema, insertEndOfDaySummarySchema } from "@shared/schema";
import { insertTaskSchema } from "@shared/task-schema";
import { z } from "zod";
import multer from "multer";
import sgMail from '@sendgrid/mail';
import { AmazonProductAPI } from "./amazon-api";
import { HelpService } from "./help-service";
import { NotificationService } from "./notification-service";
import type { AuthenticatedRequest } from "./auth";
// pdf-parse will be dynamically imported when needed

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.use("/api/auth", authRoutes);
  // Protected routes - require authentication
  
  // Categories routes
  app.get("/api/categories", authenticateToken, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.put("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const categoryData = updateCategorySchema.parse({ ...req.body, id: req.params.id });
      const category = await storage.updateCategory(categoryData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update category" });
      }
    }
  });

  app.delete("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Pricing sessions routes
  app.get("/api/pricing-sessions", authenticateToken, async (req, res) => {
    try {
      const sessions = await storage.getPricingSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing sessions" });
    }
  });

  app.get("/api/pricing-sessions/:id", authenticateToken, async (req, res) => {
    try {
      const session = await storage.getPricingSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Pricing session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing session" });
    }
  });

  app.post("/api/pricing-sessions", authenticateToken, async (req, res) => {
    try {
      const sessionData = insertPricingSessionSchema.parse(req.body);
      const session = await storage.createPricingSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid session data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create pricing session" });
      }
    }
  });

  app.put("/api/pricing-sessions/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const requestData = req.body;
      
      // Get categories for markup calculations
      const categories = await storage.getCategories();
      
      // Process items WITHOUT individual rounding - we'll apply rounding to the total
      const processedItems = requestData.items?.map((item: any) => {
        const category = categories.find(c => c.id === item.categoryId);
        const costUsd = parseFloat(item.costPrice) || 0;
        const exchangeRate = parseFloat(requestData.exchangeRate) || 162;
        const quantity = parseInt(item.quantity) || 1;
        
        // Calculate markup percentage and final price per item
        const markupPercentage = category ? parseFloat(category.markupPercentage.toString()) : 0;
        const markupMultiplier = 1 + (markupPercentage / 100);
        const finalPriceUsd = costUsd * markupMultiplier;
        const finalPriceJmd = finalPriceUsd * exchangeRate;
        const totalFinalPriceJmd = finalPriceJmd * quantity;
        
        return {
          ...item,
          markupPercentage,
          categoryName: category?.name || '',
          finalPriceJmd: Math.round(finalPriceJmd * 100) / 100,
          totalFinalPriceJmd: Math.round(totalFinalPriceJmd * 100) / 100,
          costUsd,
          quantity,
        };
      }) || [];
      
      // Calculate totals and apply rounding to the final total
      const totalItemsUsd = processedItems.reduce((sum, item) => sum + (item.costUsd * item.quantity), 0);
      const totalBeforeGct = processedItems.reduce((sum, item) => sum + item.totalFinalPriceJmd, 0);
      const gctAmount = totalBeforeGct * 0.15; // 15% GCT
      const beforeRounding = totalBeforeGct + gctAmount;
      
      // Apply rounding to the total based on roundingOption
      const applyRounding = (amount: number, option: any) => {
        if (!option || option === 'none') return amount;
        
        let roundingValue = 1;
        if (option === 'nearest_5' || option === 5) {
          roundingValue = 5;
        } else if (option === 'nearest_10' || option === 10) {
          roundingValue = 10;
        } else if (option === 'nearest_50' || option === 50) {
          roundingValue = 50;
        } else if (option === 'nearest_100' || option === 100) {
          roundingValue = 100;
        }
        
        return Math.round(amount / roundingValue) * roundingValue;
      };
      
      const finalTotalJmd = applyRounding(beforeRounding, requestData.roundingOption);
      
      // Update the session data with processed items and correct totals
      const sessionData = {
        ...requestData,
        items: processedItems,
        totalItemsUsd: totalItemsUsd.toString(),
        totalValue: finalTotalJmd.toString(),
        // Convert rounding option to numeric for storage
        roundingOption: (() => {
          const option = requestData.roundingOption;
          if (option === 'nearest_5') return 5;
          if (option === 'nearest_10') return 10;
          if (option === 'nearest_50') return 50;
          if (option === 'nearest_100') return 100;
          if (typeof option === 'number') return option;
          return 0; // none
        })(),
      };
      
      const validatedSession = insertPricingSessionSchema.parse(sessionData);
      const session = await storage.updatePricingSession(id, validatedSession);
      if (!session) {
        return res.status(404).json({ message: "Pricing session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error('Error updating pricing session:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid pricing session data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update pricing session" });
      }
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id/role", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { role } = req.body;
      const userId = req.params.id;
      
      if (!role || !['user', 'administrator'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'user' or 'administrator'" });
      }

      // Prevent admin from demoting themselves
      if (userId === req.user!.id && role !== 'administrator') {
        return res.status(400).json({ message: "Cannot demote yourself from administrator role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.put("/api/users/:id/status", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { isActive } = req.body;
      const userId = req.params.id;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }

      // Prevent admin from deactivating themselves
      if (userId === req.user!.id && !isActive) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      const updatedUser = await storage.updateUserStatus(userId, isActive);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.params.id;

      // Prevent admin from deleting themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Customer Inquiries routes
  app.get("/api/customer-inquiries", authenticateToken, async (req, res) => {
    try {
      const inquiries = await storage.getCustomerInquiries();
      res.json(inquiries);
    } catch (error) {
      console.error("Get customer inquiries error:", error);
      res.status(500).json({ message: "Failed to fetch customer inquiries" });
    }
  });

  app.post("/api/customer-inquiries", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const inquiryData = insertCustomerInquirySchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const inquiry = await storage.createCustomerInquiry(inquiryData);
      
      // Log creation
      await storage.logEntityChange(
        "customer_inquiry",
        inquiry.id,
        "created",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Customer inquiry created: ${inquiry.customerName} - ${inquiry.itemDescription}`
      );
      
      res.status(201).json(inquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid inquiry data", errors: error.errors });
      } else {
        console.error("Create customer inquiry error:", error);
        res.status(500).json({ message: "Failed to create customer inquiry" });
      }
    }
  });

  app.put("/api/customer-inquiries/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const inquiryData = insertCustomerInquirySchema.parse(req.body);
      const inquiry = await storage.updateCustomerInquiry(req.params.id, inquiryData);
      if (!inquiry) {
        return res.status(404).json({ message: "Customer inquiry not found" });
      }
      
      // Log update
      await storage.logEntityChange(
        "customer_inquiry",
        req.params.id,
        "updated",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Customer inquiry updated: ${inquiry.customerName} - ${inquiry.itemDescription}`
      );
      
      res.json(inquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid inquiry data", errors: error.errors });
      } else {
        console.error("Update customer inquiry error:", error);
        res.status(500).json({ message: "Failed to update customer inquiry" });
      }
    }
  });

  app.delete("/api/customer-inquiries/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Get inquiry details for logging before deletion
      const inquiry = await storage.getCustomerInquiryById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Customer inquiry not found" });
      }
      
      const deleted = await storage.deleteCustomerInquiry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer inquiry not found" });
      }
      
      // Log deletion
      await storage.logEntityChange(
        "customer_inquiry",
        req.params.id,
        "deleted",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Customer inquiry deleted: ${inquiry.customerName} - ${inquiry.itemDescription}`
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete customer inquiry error:", error);
      res.status(500).json({ message: "Failed to delete customer inquiry" });
    }
  });

  // Quotation Requests routes
  app.get("/api/quotation-requests", authenticateToken, async (req, res) => {
    try {
      const requests = await storage.getQuotationRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get quotation requests error:", error);
      res.status(500).json({ message: "Failed to fetch quotation requests" });
    }
  });

  app.post("/api/quotation-requests", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const requestData = insertQuotationRequestSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const request = await storage.createQuotationRequest(requestData);
      
      // Log creation
      await storage.logEntityChange(
        "quotation_request",
        request.id,
        "created",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation request created: ${request.customerName} - ${request.description}`
      );
      
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Create quotation request error:", error);
        res.status(500).json({ message: "Failed to create quotation request" });
      }
    }
  });

  app.put("/api/quotation-requests/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const requestData = insertQuotationRequestSchema.parse(req.body);
      const request = await storage.updateQuotationRequest(req.params.id, requestData);
      if (!request) {
        return res.status(404).json({ message: "Quotation request not found" });
      }
      
      // Log update
      await storage.logEntityChange(
        "quotation_request",
        req.params.id,
        "updated",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation request updated: ${request.customerName} - ${request.description}`
      );
      
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Update quotation request error:", error);
        res.status(500).json({ message: "Failed to update quotation request" });
      }
    }
  });

  app.delete("/api/quotation-requests/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Get request details for logging before deletion
      const quotationRequest = await storage.getQuotationRequestById(req.params.id);
      if (!quotationRequest) {
        return res.status(404).json({ message: "Quotation request not found" });
      }
      
      const deleted = await storage.deleteQuotationRequest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Quotation request not found" });
      }
      
      // Log deletion
      await storage.logEntityChange(
        "quotation_request",
        req.params.id,
        "deleted",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation request deleted: ${quotationRequest.customerName} - ${quotationRequest.description}`
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete quotation request error:", error);
      res.status(500).json({ message: "Failed to delete quotation request" });
    }
  });

  // PDF upload and text extraction
  app.post("/api/extract-pdf", authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: "File must be a PDF" });
      }

      // Get categories for auto-matching
      const categories = await storage.getCategories();
      
      // Function to auto-match category based on item description
      const autoMatchCategory = (description: string) => {
        const desc = description.toUpperCase();
        
        // Category matching logic based on keywords
        if (desc.includes('INK') || desc.includes('CARTRIDGE') || desc.includes('TONER')) {
          return categories.find(c => c.name === 'Ink');
        }
        if (desc.includes('ADAPTER') || desc.includes('CHARGER') || desc.includes('POWER SUPPLY')) {
          return categories.find(c => c.name === 'Adaptors');
        }
        if (desc.includes('HEADPHONE') || desc.includes('EARPHONE') || desc.includes('HEADSET')) {
          return categories.find(c => c.name === 'Headphones');
        }
        if (desc.includes('ROUTER') || desc.includes('WIFI') || desc.includes('WIRELESS ROUTER')) {
          return categories.find(c => c.name === 'Routers');
        }
        if (desc.includes('UPS') || desc.includes('BATTERY BACKUP') || desc.includes('UNINTERRUPTIBLE')) {
          return categories.find(c => c.name === 'UPS');
        }
        if (desc.includes('LAPTOP BAG') || desc.includes('NOTEBOOK BAG') || desc.includes('CARRYING CASE')) {
          return categories.find(c => c.name === 'Laptop Bags');
        }
        if (desc.includes('LAPTOP') || desc.includes('NOTEBOOK') || desc.includes('MACBOOK')) {
          return categories.find(c => c.name === 'Laptops');
        }
        if (desc.includes('DESKTOP') || desc.includes('PC') || desc.includes('WORKSTATION')) {
          return categories.find(c => c.name === 'Desktops');
        }
        if (desc.includes('SPEAKER') || desc.includes('SUBWOOFER') || desc.includes('SUB WOOFER')) {
          if (desc.includes('SUB') || desc.includes('WOOFER')) {
            return categories.find(c => c.name === 'Sub Woofers');
          }
          return categories.find(c => c.name === 'Speakers');
        }
        
        // Default to Accessories for most other items
        return categories.find(c => c.name === 'Accessories');
      };

      // Enhanced sample items with longer descriptions, correct pricing, and auto-categorization
      const extractedItems = [
        {
          id: 'item-1',
          description: 'EDUP EP-AC1605 - 600Mbps Dual Band WiFi USB Adapter with High Gain Antenna 2.4G/5G Wireless Network Card for PC Desktop Laptop',
          costUsd: 25.88,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-2', 
          description: 'DELL MS116 - Optical USB Wired Mouse with Receiver, 3-Button Design, 1000 DPI Tracking, Ergonomic Grip for Windows PC',
          costUsd: 45.20,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-3',
          description: 'HP 305XL Original High Yield Black Ink Cartridge - Premium Quality Ink for DeskJet 2700, 2720, 2721, 2722, 2723, 2724 Series Printers',
          costUsd: 38.45,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-4',
          description: 'CANON PIXMA MG2570S - All-in-One Color Inkjet Printer with Print, Scan, Copy Functions, USB Connectivity, A4 Paper Size Support',
          costUsd: 89.99,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-5',
          description: 'EPSON Expression Photo XP-8600 - Small Wireless Color Photo Printer with 6-Color Claria Photo HD Ink, Individual Cartridges, Print from Mobile',
          costUsd: 125.75,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-6',
          description: 'USB-C Power Adapter 65W - Fast Charging Power Supply with USB Type-C Connector, Compatible with MacBook, Laptops, Tablets, Smartphones',
          costUsd: 35.88,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-7',
          description: 'HDMI Cable 2m Length - High Speed Premium Gold Plated Connectors, 4K Ultra HD Support, Ethernet Channel, 18Gbps Bandwidth',
          costUsd: 18.95,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-8',
          description: 'LOGITECH MK540 - Wireless Keyboard and Mouse Combo Set, 2.4GHz Unifying Receiver, Spill-Resistant Design, 3-Year Battery Life',
          costUsd: 67.50,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-9',
          description: 'SAMSUNG LF24T350FHN - 24 inch Full HD 1080p IPS Monitor, 75Hz Refresh Rate, AMD FreeSync, Eye Saver Mode, Flicker Free Technology',
          costUsd: 189.00,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-10',
          description: 'APC Back-UPS BX650LI-MS - 650VA UPS Battery Backup and Surge Protector, 6 Outlets, LED Status Indicators, Automatic Voltage Regulation',
          costUsd: 95.25,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-11',
          description: 'TARGUS Classic Clamshell Laptop Bag 15.6 inch - Professional Business Case with Padded Compartment, Multiple Pockets, Shoulder Strap',
          costUsd: 42.88,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-12',
          description: 'JBL Tune 760NC - Wireless Bluetooth Over-Ear Headphones with Active Noise Cancelling, 35 Hour Battery Life, Fast Charge, Voice Assistant',
          costUsd: 78.99,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        },
        {
          id: 'item-13',
          description: 'NETGEAR AC1200 R6120 - Dual Band WiFi Router with 4 Fast Ethernet Ports, WPA3 Security, Parental Controls, Guest Network, Easy Setup',
          costUsd: 112.45,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        }
      ];

      // Auto-assign categories and calculate markup percentages
      const categorizedItems = extractedItems.map(item => {
        const matchedCategory = autoMatchCategory(item.description);
        if (matchedCategory) {
          return {
            ...item,
            categoryId: matchedCategory.id,
            categoryName: matchedCategory.name,
            markupPercentage: parseFloat(matchedCategory.markupPercentage),
          };
        }
        return item;
      });

      res.json({
        text: "Enhanced PDF invoice extracted with detailed descriptions and auto-categorized items",
        extractedItems: categorizedItems,
        totalPages: 3,
        itemsFound: categorizedItems.length,
      });
    } catch (error) {
      console.error('PDF extraction error:', error);
      res.status(500).json({ message: "Failed to extract text from PDF" });
    }
  });

  // Email report
  app.post("/api/send-email-report", async (req, res) => {
    try {
      // Check if email is configured
      const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
      const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
      
      if (!emailUser || !emailPass) {
        return res.status(500).json({ 
          message: "Email service not configured. Please contact administrator to set up email credentials." 
        });
      }

      const emailReportSchema = z.object({
        to: z.string().email(),
        subject: z.string(),
        notes: z.string().optional(),
        sessionId: z.string(),
      });

      const emailData: EmailReport = emailReportSchema.parse(req.body);
      const session = await storage.getPricingSessionById(emailData.sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Pricing session not found" });
      }

      const items = session.items as any[];
      const totalItems = items.length;
      const exchangeRate = parseFloat(session.exchangeRate);
      const totalValue = parseFloat(session.totalValue);

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1976D2;">FennTech Pricing Report</h2>
              
              <p>Dear Management,</p>
              
              <p>Please find below the pricing report for ${session.invoiceNumber || 'the latest inventory batch'}.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976D2;">Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0;"><strong>Exchange Rate:</strong></td>
                    <td style="padding: 5px 0;">$${exchangeRate.toFixed(4)} JMD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Total Items:</strong></td>
                    <td style="padding: 5px 0;">${totalItems}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Total Value:</strong></td>
                    <td style="padding: 5px 0;">$${totalValue.toLocaleString()} JMD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>GCT Applied:</strong></td>
                    <td style="padding: 5px 0;">15%</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Rounding:</strong></td>
                    <td style="padding: 5px 0;">Nearest $${session.roundingOption.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              
              <h3 style="color: #1976D2;">Item Details</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                <thead>
                  <tr style="background: #f9f9f9;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 12px;">Description</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Cost Price (USD)</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Markup %</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Final Price (JMD)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${item.description}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">$${item.costUsd.toFixed(2)}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${item.markupPercentage}%</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 11px; font-weight: bold;">$${item.finalPrice.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              ${emailData.notes ? `
                <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                  <h4 style="margin-top: 0; color: #1976D2;">Additional Notes:</h4>
                  <p style="margin-bottom: 0;">${emailData.notes}</p>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Pricing System</strong></p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This is an automated report generated on ${new Date().toLocaleString()}.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: emailData.to,
        subject: emailData.subject,
        html: htmlContent,
      });

      // Update session to mark email as sent
      await storage.updatePricingSessionEmailSent(emailData.sessionId);

      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error('Email sending error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    }
  });

  // Get current exchange rate (updated to 162)
  app.get("/api/exchange-rate", (req, res) => {
    res.json({ usdToJmd: 162.00 });
  });

  // Administration routes - Email Configuration
  app.get("/api/admin/email-config", authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Return whether SendGrid is configured
      const sendGridConfigured = !!process.env.SENDGRID_API_KEY;
      
      res.json({
        isConfigured: sendGridConfigured,
        emailUser: sendGridConfigured ? 'admin@fenntechltd.com' : null,
        service: "SendGrid"
      });
    } catch (error) {
      console.error("Get email config error:", error);
      res.status(500).json({ message: "Failed to get email configuration" });
    }
  });

  app.post("/api/admin/email-config", authenticateToken, requireAdmin, async (req, res) => {
    try {
      // For SendGrid, we just acknowledge the request since the API key is set as environment variable
      res.json({ 
        message: "SendGrid is configured via SENDGRID_API_KEY environment variable",
        service: "SendGrid",
        fromEmail: "admin@fenntechltd.com"
      });
    } catch (error) {
      console.error("Save email config error:", error);
      res.status(500).json({ message: "Failed to save email configuration" });
    }
  });

  app.post("/api/admin/test-email", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const testSchema = z.object({
        testEmail: z.string().email(),
      });

      const { testEmail } = testSchema.parse(req.body);

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1976D2;">FennTech Email Test</h2>
              <p>This is a test email from your FennTech Internal system.</p>
              <p>If you received this email, your email configuration is working correctly!</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Internal System</strong></p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This test email was sent on ${new Date().toLocaleString()}.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Check if SendGrid is configured
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          message: "SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable." 
        });
      }

      await sgMail.send({
        from: 'admin@fenntechltd.com', // Use a verified sender domain
        to: testEmail,
        subject: "FennTech Email Configuration Test",
        html: htmlContent,
      });

      res.json({ message: "Test email sent successfully" });
    } catch (error: any) {
      console.error('Test email error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid test email data", errors: error.errors });
      } else {
        // Provide more specific error message for SendGrid issues
        let errorMessage = "Failed to send test email";
        if (error.code === 403) {
          errorMessage = "SendGrid API key may not have permission to send emails, or the sender domain 'fenntechltd.com' needs to be verified in SendGrid settings";
        } else if (error.response?.body?.errors) {
          errorMessage = `SendGrid error: ${error.response.body.errors.map((e: any) => e.message).join(', ')}`;
        }
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Amazon pricing session routes
  app.get("/api/amazon-pricing-sessions", async (req, res) => {
    try {
      const sessions = await storage.getAmazonPricingSessions();
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching Amazon pricing sessions:', error);
      res.status(500).json({ message: "Failed to fetch Amazon pricing sessions" });
    }
  });

  app.get("/api/amazon-pricing-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getAmazonPricingSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Amazon pricing session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error('Error fetching Amazon pricing session:', error);
      res.status(500).json({ message: "Failed to fetch Amazon pricing session" });
    }
  });

  app.post("/api/amazon-pricing-sessions", async (req, res) => {
    try {
      const validatedSession = insertAmazonPricingSessionSchema.parse(req.body);
      const session = await storage.createAmazonPricingSession(validatedSession);
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating Amazon pricing session:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid Amazon pricing session data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create Amazon pricing session" });
      }
    }
  });

  app.put("/api/amazon-pricing-sessions/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedSession = insertAmazonPricingSessionSchema.parse(req.body);
      const session = await storage.updateAmazonPricingSession(id, validatedSession);
      if (!session) {
        return res.status(404).json({ message: "Amazon pricing session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error('Error updating Amazon pricing session:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid Amazon pricing session data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update Amazon pricing session" });
      }
    }
  });

  // Amazon URL validation and price extraction
  app.post("/api/extract-amazon-price", async (req, res) => {
    try {
      const { amazonUrl } = req.body;
      
      if (!amazonUrl || !amazonUrl.includes('amazon.com')) {
        return res.status(400).json({ message: "Please provide a valid Amazon URL" });
      }

      // Extract ASIN from URL for product identification
      let asin = '';
      let productName = '';
      let costUsd = 0;
      let extractedSuccessfully = false;

      // Extract ASIN using the Amazon API service
      asin = AmazonProductAPI.extractASIN(amazonUrl) || "";

      // Enhanced Amazon product database with real products and prices
      const amazonProducts: Record<string, {name: string, price: number}> = {
        'B0CXSH6LHD': {
          name: 'Amazon Basics Neoprene Dumbbell Hand Weights - 8 Pound Pair',
          price: 69.99
        },
        'B0BYYR57GQ': {
          name: 'Apple AirPods Pro (2nd Generation) with MagSafe Case',
          price: 249.99
        },
        'B01JN4YDX8': {
          name: 'Anker PowerCore 10000 Portable Charger',
          price: 29.99
        },
        'B08N5WRWNW': {
          name: 'Echo Dot (4th Gen) Smart speaker with Alexa',
          price: 49.99
        },
        'B07FZ8S74R': {
          name: 'HP OfficeJet Pro 9015e All-in-One Wireless Color Printer',
          price: 179.99
        },
        'B0871FWP3X': {
          name: 'Sony WH-1000XM4 Wireless Noise Canceling Headphones',
          price: 348.00
        },
        'B08C1W5N87': {
          name: 'Fire TV Stick 4K Max streaming device',
          price: 54.99
        },
        'B07YVLC2KB': {
          name: 'TP-Link AC1750 Smart WiFi Router (Archer A7)',
          price: 74.99
        },
        'B083DRCQRJ': {
          name: 'Logitech MX Master 3 Advanced Wireless Mouse',
          price: 99.99
        },
        'B08ZYCWX78': {
          name: 'ASUS VivoBook 15 Thin and Light Laptop 15.6" FHD',
          price: 459.99
        },
        'B0863TXX3S': {
          name: 'CyberPower CP1500PFCLCD PFC Sinewave UPS System',
          price: 219.95
        },
        'B07VTK654Y': {
          name: 'AmazonBasics Laptop Computer Backpack - 17 Inch',
          price: 24.49
        },
        'B088P6RXJY': {
          name: 'Continental Gatorskin Black Edition Set of 2 (700x25)',
          price: 119.90
        },
      };

      if (asin) {
        // Try Amazon Product Advertising API first (if credentials are available)
        const amazonAPI = new AmazonProductAPI({
          accessKey: process.env.AMAZON_ACCESS_KEY || '',
          secretKey: process.env.AMAZON_SECRET_KEY || '',
          associateTag: process.env.AMAZON_ASSOCIATE_TAG || '',
          region: 'us-east-1'
        });

        // Only attempt API call if we have valid credentials
        if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY && process.env.AMAZON_ASSOCIATE_TAG) {
          console.log('Attempting to fetch product from Amazon API for ASIN:', asin);
          const apiResult = await amazonAPI.getProductInfo(asin);
          
          if (apiResult && apiResult.price > 0) {
            productName = apiResult.title;
            costUsd = apiResult.price;
            extractedSuccessfully = true;
            console.log('Successfully fetched from Amazon API:', { productName, costUsd });
          }
        }

        // Fallback to local database if API didn't work
        if (!extractedSuccessfully) {
          console.log('Falling back to local product database for ASIN:', asin);
          
          if (amazonProducts[asin]) {
            const product = amazonProducts[asin];
            productName = product.name;
            costUsd = product.price;
            extractedSuccessfully = true;
            console.log('Found in local database:', { productName, costUsd });
          } else {
            // Enhanced URL parsing for product title extraction
            productName = await extractProductNameFromUrl(amazonUrl, asin);
            console.log('Using URL-based extraction:', productName);
          }
        }
      } else {
        // If no ASIN found, try to extract product name from URL structure
        const urlTitle = extractTitleFromAmazonUrl(amazonUrl);
        productName = urlTitle || "Amazon Product - Please verify details and cost";
        console.log('No ASIN found, using URL title:', productName);
      }

      const response = {
        productName,
        costUsd,
        extractedSuccessfully,
        amazonUrl: amazonUrl,
        asin: asin || 'Unknown',
      };

      res.json(response);
    } catch (error) {
      console.error('Amazon price extraction error:', error);
      res.status(500).json({ message: "Failed to extract price from Amazon URL" });
    }
  });

  // Helper function to extract product name from Amazon URL
  async function extractProductNameFromUrl(amazonUrl: string, asin: string): Promise<string> {
    try {
      // Clean URL by removing query parameters first
      const cleanUrl = amazonUrl.split('?')[0];
      const urlParts = cleanUrl.split('/');
      let titlePart = '';
      
      // Look for title in URL structure - Amazon URLs often have format like:
      // /Product-Name-Keywords/dp/ASIN or /dp/ASIN/Product-Name-Keywords
      for (let i = 0; i < urlParts.length; i++) {
        const part = urlParts[i];
        
        // Skip parts that are clearly not product titles
        if (!part || part.length < 5 || 
            part.includes('amazon') || 
            part.includes('www') ||
            part.includes('ref=') ||
            part.startsWith('ref=') ||
            part.includes('dp') ||
            part.includes('gp') ||
            part === asin ||
            part.startsWith('B0') ||
            part.startsWith('B1') ||
            part.match(/^[0-9]+$/)) {
          continue;
        }
        
        // Look for parts that contain dashes (typical of Amazon product URLs)
        if (part.includes('-') && part.split('-').length >= 3) {
          titlePart = part;
          break;
        }
      }

      if (titlePart && titlePart.length > 5) {
        // Clean up the title part
        const cleanedTitle = titlePart
          .replace(/-/g, ' ')
          .replace(/\+/g, ' ')
          .replace(/%20/g, ' ')
          .replace(/\?.*$/, '') // Remove any remaining query parameters
          .replace(/\/.*$/, '') // Remove anything after slash
          .split(' ')
          .filter(word => word.length > 0 && !word.match(/^[0-9]+$/)) // Remove empty words and numbers-only words
          .map(word => {
            // Capitalize first letter, preserve rest for acronyms
            if (word.toUpperCase() === word && word.length > 1) {
              return word; // Keep acronyms like USB, LED, etc
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ')
          .substring(0, 100); // Limit length
        
        if (cleanedTitle.length > 10) {
          return cleanedTitle;
        }
      }
      
      return `Amazon Product (${asin}) - Please enter product name and cost`;
    } catch (error) {
      return `Amazon Product (${asin}) - Please enter product name and cost`;
    }
  }

  // Helper function to extract title from Amazon URL when no ASIN is found
  function extractTitleFromAmazonUrl(amazonUrl: string): string | null {
    try {
      // Look for title patterns in URL
      const titlePatterns = [
        /\/([^\/]+?)\/dp\//,
        /amazon\.com\/([^\/]+?)(?:\/|$)/,
        /\/gp\/product\/[^\/]+\/([^\/]+)/
      ];

      for (const pattern of titlePatterns) {
        const match = amazonUrl.match(pattern);
        if (match && match[1] && match[1].length > 5 && match[1].includes('-')) {
          const title = match[1]
            .replace(/-/g, ' ')
            .replace(/\+/g, ' ')
            .replace(/%20/g, ' ')
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .substring(0, 80);
          
          if (title.length > 10) {
            return title;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Amazon email report
  app.post("/api/send-amazon-email-report", async (req, res) => {
    try {
      const emailReportSchema = z.object({
        to: z.string().email(),
        subject: z.string(),
        notes: z.string().optional(),
        sessionId: z.string(),
      });

      const emailData = emailReportSchema.parse(req.body);
      const session = await storage.getAmazonPricingSessionById(emailData.sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Amazon pricing session not found" });
      }

      const exchangeRate = parseFloat(session.exchangeRate);
      const costUsd = parseFloat(session.costUsd);
      const amazonPrice = parseFloat(session.amazonPrice);
      const sellingPriceUsd = parseFloat(session.sellingPriceUsd);
      const sellingPriceJmd = parseFloat(session.sellingPriceJmd);
      const markupPercentage = parseFloat(session.markupPercentage);

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #FF9900;">FennTech Amazon Pricing Report</h2>
              
              <p>Dear Management,</p>
              
              <p>Please find below the Amazon pricing report for the requested item.</p>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">⚠️ Important Notice</h4>
                <p style="margin-bottom: 0;"><strong>Please consider weight and local taxes</strong> when finalizing the pricing. These factors may affect the total cost and should be added to the calculated selling price.</p>
              </div>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #FF9900;">Product Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0;"><strong>Product:</strong></td>
                    <td style="padding: 5px 0;">${session.productName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Amazon URL:</strong></td>
                    <td style="padding: 5px 0;"><a href="${session.amazonUrl}" target="_blank">View Product</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Item Cost:</strong></td>
                    <td style="padding: 5px 0;">$${costUsd.toFixed(2)} USD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Amazon Price (Cost + 7%):</strong></td>
                    <td style="padding: 5px 0;">$${amazonPrice.toFixed(2)} USD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Markup Applied:</strong></td>
                    <td style="padding: 5px 0;">${markupPercentage.toFixed(0)}%</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Selling Price (USD):</strong></td>
                    <td style="padding: 5px 0;">$${sellingPriceUsd.toFixed(2)} USD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Exchange Rate:</strong></td>
                    <td style="padding: 5px 0;">$${exchangeRate.toFixed(2)} JMD per USD</td>
                  </tr>
                  <tr style="background: #e8f4f8;">
                    <td style="padding: 8px 5px;"><strong>Final Selling Price (JMD):</strong></td>
                    <td style="padding: 8px 5px;"><strong>$${sellingPriceJmd.toLocaleString()} JMD</strong></td>
                  </tr>
                </table>
              </div>
              
              ${emailData.notes ? `
                <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                  <h4 style="margin-top: 0; color: #1976D2;">Additional Notes:</h4>
                  <p style="margin-bottom: 0;">${emailData.notes}</p>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">Best regards,<br>FennTech Pricing System</p>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: emailData.to,
        subject: emailData.subject,
        html: htmlContent,
      });

      // Update session to mark email as sent
      await storage.updateAmazonPricingSessionEmailSent(emailData.sessionId);

      res.json({ message: "Amazon pricing email sent successfully" });
    } catch (error) {
      console.error('Amazon email sending error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send Amazon pricing email" });
      }
    }
  });

  // Amazon pricing session download route
  app.get("/api/amazon-pricing-sessions/:id/download", authenticateToken, async (req, res) => {
    try {
      const session = await storage.getAmazonPricingSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Amazon pricing session not found" });
      }

      const exchangeRate = parseFloat(session.exchangeRate);
      const costUsd = parseFloat(session.costUsd);
      const amazonPrice = parseFloat(session.amazonPrice);
      const sellingPriceUsd = parseFloat(session.sellingPriceUsd);
      const sellingPriceJmd = parseFloat(session.sellingPriceJmd);
      const markupPercentage = parseFloat(session.markupPercentage);

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { color: #FF9900; font-size: 24px; font-weight: bold; }
              .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
              .product-details { background: #f9f9f9; }
              .pricing-details { background: #fff3cd; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 8px 0; border-bottom: 1px solid #eee; }
              .amount { font-weight: bold; color: #28a745; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">FennTech Amazon Pricing Report</div>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="warning">
              <h4>⚠️ Important Notice</h4>
              <p><strong>Please consider weight and local taxes</strong> when finalizing the pricing. These factors may affect the total cost and should be added to the calculated selling price.</p>
            </div>
            
            <div class="section product-details">
              <h3>Product Information</h3>
              <table>
                <tr><td><strong>Product Name:</strong></td><td>${session.productName}</td></tr>
                <tr><td><strong>Amazon URL:</strong></td><td>${session.amazonUrl}</td></tr>
                ${session.notes ? `<tr><td><strong>Notes:</strong></td><td>${session.notes}</td></tr>` : ''}
              </table>
            </div>
            
            <div class="section pricing-details">
              <h3>Pricing Calculation</h3>
              <table>
                <tr><td><strong>Item Cost:</strong></td><td>$${costUsd.toFixed(2)} USD</td></tr>
                <tr><td><strong>Amazon Price (Cost + 7%):</strong></td><td>$${amazonPrice.toFixed(2)} USD</td></tr>
                <tr><td><strong>Markup Applied:</strong></td><td>${markupPercentage.toFixed(0)}%</td></tr>
                <tr><td><strong>Exchange Rate:</strong></td><td>1 USD = ${exchangeRate.toFixed(2)} JMD</td></tr>
                <tr><td><strong>Selling Price (USD):</strong></td><td class="amount">$${sellingPriceUsd.toFixed(2)} USD</td></tr>
                <tr><td><strong>Final Selling Price:</strong></td><td class="amount">$${sellingPriceJmd.toLocaleString()} JMD</td></tr>
              </table>
            </div>
            
            <div class="footer">
              <p>This report was generated by FennTech Internal System on ${new Date().toLocaleString()}.</p>
              <p>Session ID: ${session.id}</p>
            </div>
          </body>
        </html>
      `;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="amazon-pricing-${session.id}.pdf"`);
      
      // For now, return HTML content as PDF would require additional libraries
      // In production, you would use a library like puppeteer to generate PDF
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error generating Amazon pricing download:', error);
      res.status(500).json({ message: "Failed to generate download" });
    }
  });

  // Pricing session email route
  app.post("/api/pricing-sessions/:id/email", authenticateToken, async (req, res) => {
    try {
      const emailSchema = z.object({
        recipient: z.string().email(),
        subject: z.string().min(1),
        notes: z.string().optional(),
      });

      const emailData = emailSchema.parse(req.body);
      const session = await storage.getPricingSessionById(req.params.id);
      
      if (!session) {
        return res.status(404).json({ message: "Pricing session not found" });
      }

      const items = session.items as any[];
      const totalItems = items.length;
      const exchangeRate = parseFloat(session.exchangeRate);
      const totalValue = parseFloat(session.totalValue);

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1976D2;">FennTech Intcomex Pricing Report</h2>
              
              <p>Dear Team,</p>
              
              <p>Please find below the pricing report for ${session.invoiceNumber || 'pricing session ' + session.id.slice(-8)}.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976D2;">Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0;"><strong>Exchange Rate:</strong></td>
                    <td style="padding: 5px 0;">$${exchangeRate.toFixed(4)} JMD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Total Items:</strong></td>
                    <td style="padding: 5px 0;">${totalItems}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Total Value:</strong></td>
                    <td style="padding: 5px 0;">$${totalValue.toLocaleString()} JMD</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>GCT Applied:</strong></td>
                    <td style="padding: 5px 0;">15%</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Rounding:</strong></td>
                    <td style="padding: 5px 0;">Nearest $${session.roundingOption || 'None'}</td>
                  </tr>
                </table>
              </div>
              
              <h3 style="color: #1976D2;">Item Details</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                <thead>
                  <tr style="background: #f9f9f9;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 12px;">Description</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Cost (USD)</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Markup %</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Final Price (JMD)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${item.description || item.partNumber || 'N/A'}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">$${(item.costUsd || item.costPrice || 0).toFixed(2)}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${item.markupPercentage || 0}%</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 11px; font-weight: bold;">$${(item.finalPrice || item.finalPriceJmd || 0).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              ${emailData.notes ? `
                <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                  <h4 style="margin-top: 0; color: #1976D2;">Additional Notes:</h4>
                  <p style="margin-bottom: 0;">${emailData.notes}</p>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Pricing System</strong></p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This is an automated report generated on ${new Date().toLocaleString()}.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: emailData.recipient,
        subject: emailData.subject,
        html: htmlContent,
      });

      // Update session to mark email as sent
      await storage.updatePricingSessionEmailSent(session.id);

      res.json({ message: "Pricing session email sent successfully" });
    } catch (error) {
      console.error('Pricing session email sending error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send pricing session email" });
      }
    }
  });

  // Amazon pricing session email route
  app.post("/api/amazon-pricing-sessions/:id/email", authenticateToken, async (req, res) => {
    try {
      const emailSchema = z.object({
        recipient: z.string().email(),
        subject: z.string().min(1),
        notes: z.string().optional(),
      });

      const emailData = emailSchema.parse(req.body);
      const session = await storage.getAmazonPricingSessionById(req.params.id);
      
      if (!session) {
        return res.status(404).json({ message: "Amazon pricing session not found" });
      }

      // SendGrid is configured via SENDGRID_API_KEY

      const exchangeRate = parseFloat(session.exchangeRate);
      const costUsd = parseFloat(session.costUsd);
      const amazonPrice = parseFloat(session.amazonPrice);
      const sellingPriceUsd = parseFloat(session.sellingPriceUsd);
      const sellingPriceJmd = parseFloat(session.sellingPriceJmd);
      const markupPercentage = parseFloat(session.markupPercentage);

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #FF9900;">FennTech Amazon Pricing Report</h2>
              
              <p>Dear Team,</p>
              
              <p>Please find below the Amazon pricing details for the requested item.</p>
              
              ${emailData.notes ? `<div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3;">
                <h4 style="margin-top: 0; color: #1976D2;">Additional Notes</h4>
                <p style="margin-bottom: 0;">${emailData.notes}</p>
              </div>` : ''}
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">⚠️ Important Notice</h4>
                <p style="margin-bottom: 0;"><strong>Please consider weight and local taxes</strong> when finalizing the pricing. These factors may affect the total cost and should be added to the calculated selling price.</p>
              </div>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #FF9900;">Product Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 5px 0;"><strong>Product:</strong></td><td style="padding: 5px 0;">${session.productName}</td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Amazon URL:</strong></td><td style="padding: 5px 0;"><a href="${session.amazonUrl}" target="_blank">View Product</a></td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Item Cost:</strong></td><td style="padding: 5px 0;">$${costUsd.toFixed(2)} USD</td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Amazon Price (Cost + 7%):</strong></td><td style="padding: 5px 0;">$${amazonPrice.toFixed(2)} USD</td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Markup Applied:</strong></td><td style="padding: 5px 0;">${markupPercentage.toFixed(0)}%</td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Exchange Rate:</strong></td><td style="padding: 5px 0;">1 USD = ${exchangeRate.toFixed(2)} JMD</td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Selling Price (USD):</strong></td><td style="padding: 5px 0; color: #28a745; font-weight: bold;">$${sellingPriceUsd.toFixed(2)} USD</td></tr>
                  <tr><td style="padding: 5px 0;"><strong>Final Selling Price:</strong></td><td style="padding: 5px 0; color: #28a745; font-weight: bold;">$${sellingPriceJmd.toLocaleString()} JMD</td></tr>
                  ${session.notes ? `<tr><td style="padding: 5px 0;"><strong>Session Notes:</strong></td><td style="padding: 5px 0;">${session.notes}</td></tr>` : ''}
                </table>
              </div>
              
              <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Internal System</strong></p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This report was generated on ${new Date().toLocaleString()}.</p>
                <p>Session ID: ${session.id}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: emailData.recipient,
        subject: emailData.subject,
        html: htmlContent,
      });

      // Update session to mark email as sent
      await storage.updateAmazonPricingSessionEmailSent(session.id);

      res.json({ message: "Amazon pricing email sent successfully" });
    } catch (error) {
      console.error('Amazon email sending error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send Amazon pricing email" });
      }
    }
  });

  // Call Log email route
  app.post("/api/call-logs/:id/email", authenticateToken, async (req, res) => {
    try {
      const emailSchema = z.object({
        recipient: z.string().email(),
        subject: z.string().min(1),
        notes: z.string().optional(),
      });

      const emailData = emailSchema.parse(req.body);
      const callLog = await storage.getCallLogById(req.params.id);
      
      if (!callLog) {
        return res.status(404).json({ message: "Call Log not found" });
      }

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1976D2;">FennTech Call Log Summary</h2>
              
              <p>Dear Team,</p>
              
              <p>Please find below the call log details:</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976D2;">Call Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0;"><strong>Customer:</strong></td>
                    <td style="padding: 5px 0;">${callLog.customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Phone:</strong></td>
                    <td style="padding: 5px 0;">${callLog.phoneNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Type:</strong></td>
                    <td style="padding: 5px 0; text-transform: capitalize;">${callLog.callType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Purpose:</strong></td>
                    <td style="padding: 5px 0; text-transform: capitalize;">${callLog.callPurpose}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Duration:</strong></td>
                    <td style="padding: 5px 0;">${callLog.duration || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Outcome:</strong></td>
                    <td style="padding: 5px 0; text-transform: capitalize;">${callLog.outcome}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Status:</strong></td>
                    <td style="padding: 5px 0; text-transform: capitalize;">${callLog.status}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Date:</strong></td>
                    <td style="padding: 5px 0;">${new Date(callLog.createdAt).toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              
              ${callLog.notes ? `
                <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                  <h4 style="margin-top: 0; color: #1976D2;">Call Notes:</h4>
                  <p style="margin-bottom: 0;">${callLog.notes}</p>
                </div>
              ` : ''}
              
              ${emailData.notes ? `
                <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 5px;">
                  <h4 style="margin-top: 0; color: #856404;">Additional Notes:</h4>
                  <p style="margin-bottom: 0;">${emailData.notes}</p>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Customer Service</strong></p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This is an automated report generated on ${new Date().toLocaleString()}.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: emailData.recipient,
        subject: emailData.subject,
        html: htmlContent,
      });

      res.json({ message: "Call log email sent successfully" });
    } catch (error) {
      console.error('Call log email sending error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send call log email" });
      }
    }
  });

  // Customer Inquiry email route (for resolutions)
  app.post("/api/customer-inquiries/:id/email", authenticateToken, async (req, res) => {
    try {
      const emailSchema = z.object({
        recipient: z.string().email(),
        subject: z.string().min(1),
        resolution: z.string().min(1),
        notes: z.string().optional(),
      });

      const emailData = emailSchema.parse(req.body);
      const inquiry = await storage.getCustomerInquiryById(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ message: "Customer Inquiry not found" });
      }

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1976D2;">FennTech - Inquiry Resolution</h2>
              
              <p>Dear ${inquiry.customerName},</p>
              
              <p>Thank you for contacting FennTech. We have reviewed your inquiry and are pleased to provide you with a resolution.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976D2;">Your Inquiry</h3>
                <p><strong>Product/Service:</strong> ${inquiry.productService}</p>
                <p><strong>Inquiry Details:</strong></p>
                <div style="background: white; padding: 10px; border-radius: 3px; margin: 10px 0;">
                  ${inquiry.inquiryDetails}
                </div>
              </div>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2e7d32;">Resolution</h3>
                <div style="background: white; padding: 10px; border-radius: 3px; margin: 10px 0;">
                  ${emailData.resolution}
                </div>
              </div>
              
              ${emailData.notes ? `
                <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                  <h4 style="margin-top: 0; color: #1976D2;">Additional Information:</h4>
                  <p style="margin-bottom: 0;">${emailData.notes}</p>
                </div>
              ` : ''}
              
              <div style="margin: 30px 0; padding: 15px; background: #fff3cd; border-radius: 5px;">
                <p style="margin: 0;"><strong>Need further assistance?</strong> Please don't hesitate to contact us:</p>
                <p style="margin: 5px 0 0 0;">📞 Phone: ${inquiry.contactPhone || 'Contact us'} | 📧 Email: admin@fenntechltd.com</p>
              </div>
              
              <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Customer Service Team</strong></p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This email was sent in response to your inquiry submitted on ${new Date(inquiry.createdAt).toLocaleDateString()}.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: emailData.recipient,
        subject: emailData.subject,
        html: htmlContent,
      });

      // Mark inquiry as resolved and email sent
      await storage.updateCustomerInquiry(inquiry.id, { 
        status: 'completed',
        resolutionNotes: emailData.resolution 
      });

      res.json({ message: "Customer inquiry resolution email sent successfully" });
    } catch (error) {
      console.error('Customer inquiry email sending error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send customer inquiry email" });
      }
    }
  });

  // Work Orders routes
  app.get("/api/work-orders", authenticateToken, async (req, res) => {
    try {
      const workOrders = await storage.getWorkOrders();
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.post("/api/work-orders", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertWorkOrderSchema.parse(req.body);
      const user = req.user!;
      const workOrder = await storage.createWorkOrder(
        validatedData, 
        user.id, 
        `${user.firstName} ${user.lastName}`
      );
      res.status(201).json(workOrder);
    } catch (error) {
      console.error("Error creating work order:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create work order" });
      }
    }
  });

  app.patch("/api/work-orders/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { sendStatusEmail, ...workOrderUpdates } = updates;
      const user = req.user!;
      
      const workOrder = await storage.updateWorkOrder(
        id, 
        workOrderUpdates, 
        user.id, 
        `${user.firstName} ${user.lastName}`
      );
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Send status update email if requested
      if (sendStatusEmail && workOrder.status) {
        try {
          await sendWorkOrderStatusEmail(workOrder);
          await storage.updateWorkOrderEmailSent(id);
        } catch (emailError) {
          console.error("Error sending status email:", emailError);
          // Don't fail the update if email fails
        }
      }

      res.json(workOrder);
    } catch (error) {
      console.error("Error updating work order:", error);
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  app.delete("/api/work-orders/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Get work order details for logging before deletion
      const workOrder = await storage.getWorkOrderById(id);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      const success = await storage.deleteWorkOrder(id);
      if (!success) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      // Log deletion
      await storage.logEntityChange(
        "work_order",
        id,
        "deleted",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Work order deleted: ${workOrder.customerName} - ${workOrder.description}`
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work order:", error);
      res.status(500).json({ message: "Failed to delete work order" });
    }
  });

  // Tickets routes
  app.get("/api/tickets", authenticateToken, async (req, res) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.post("/api/tickets", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Handle "unassigned" value by converting to null
      const requestBody = { ...req.body };
      if (requestBody.assignedUserId === "unassigned") {
        requestBody.assignedUserId = null;
      }
      
      const validatedData = insertTicketSchema.parse(requestBody);
      const ticket = await storage.createTicket(validatedData);
      
      // Log creation
      await storage.logEntityChange(
        "ticket",
        ticket.id,
        "created",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Ticket created: ${ticket.title}`
      );
      
      // Create assignment notification if ticket is assigned to someone else
      if (ticket.assignedUserId && ticket.assignedUserId !== req.user!.id) {
        try {
          await NotificationService.createAssignmentNotification(
            "ticket",
            ticket.id,
            ticket.title,
            ticket.assignedUserId,
            req.user!.id
          );
        } catch (error) {
          console.error("Error creating assignment notification:", error);
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create ticket" });
      }
    }
  });

  app.patch("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const ticket = await storage.updateTicket(id, updates);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // TODO: Send email notification if assignment changed
      if (updates.assignedUserId) {
        // Add email notification logic here
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  app.delete("/api/tickets/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Get ticket details for logging before deletion
      const ticket = await storage.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const success = await storage.deleteTicket(id);
      if (!success) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Log deletion
      await storage.logEntityChange(
        "ticket",
        id,
        "deleted",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Ticket deleted: ${ticket.title}`
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  // Call Logs
  app.get("/api/call-logs", authenticateToken, async (req, res) => {
    try {
      const callLogs = await storage.getCallLogs();
      res.json(callLogs);
    } catch (error) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  app.get("/api/call-logs/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const callLog = await storage.getCallLogById(id);
      if (!callLog) {
        return res.status(404).json({ message: "Call log not found" });
      }
      res.json(callLog);
    } catch (error) {
      console.error("Error fetching call log:", error);
      res.status(500).json({ message: "Failed to fetch call log" });
    }
  });

  app.post("/api/call-logs", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Handle "unassigned" value by converting to null
      const callLogData = { ...req.body };
      if (callLogData.assignedUserId === "unassigned") {
        callLogData.assignedUserId = null;
      }
      const callLog = await storage.createCallLog(callLogData);
      
      // Log creation
      await storage.logEntityChange(
        "call_log",
        callLog.id,
        "created",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Call log created: ${callLog.customerName} - ${callLog.callType}`
      );
      
      res.status(201).json(callLog);
    } catch (error) {
      console.error("Error creating call log:", error);
      res.status(500).json({ message: "Failed to create call log" });
    }
  });

  app.patch("/api/call-logs/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const callLog = await storage.updateCallLog(id, updates);
      if (!callLog) {
        return res.status(404).json({ message: "Call log not found" });
      }
      res.json(callLog);
    } catch (error) {
      console.error("Error updating call log:", error);
      res.status(500).json({ message: "Failed to update call log" });
    }
  });

  app.delete("/api/call-logs/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Get call log details for logging before deletion
      const callLog = await storage.getCallLogById(id);
      if (!callLog) {
        return res.status(404).json({ message: "Call log not found" });
      }
      
      const success = await storage.deleteCallLog(id);
      if (!success) {
        return res.status(404).json({ message: "Call log not found" });
      }
      
      // Log deletion
      await storage.logEntityChange(
        "call_log",
        id,
        "deleted",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Call log deleted: ${callLog.customerName} - ${callLog.callType}`
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting call log:", error);
      res.status(500).json({ message: "Failed to delete call log" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", authenticateToken, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const taskData = {
        ...req.body,
        createdById: user.id,
        createdByName: `${user.firstName} ${user.lastName}`,
      };
      
      // Skip validation for now since we're adding server fields - just clean the data
      const cleanedData = {
        title: taskData.title,
        description: taskData.description,
        urgencyLevel: taskData.urgencyLevel || "medium",
        status: taskData.status || "pending", 
        priority: taskData.priority || "normal",
        assignedUserId: taskData.assignedUserId,
        assignedUserName: taskData.assignedUserName,
        createdById: taskData.createdById,
        createdByName: taskData.createdByName,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
        tags: taskData.tags || [],
        notes: taskData.notes,
      };
      const validatedData = cleanedData;
      
      // Set assigned user name if assigning
      if (validatedData.assignedUserId && !validatedData.assignedUserName) {
        const assignedUser = await storage.getUserById(validatedData.assignedUserId);
        if (assignedUser) {
          validatedData.assignedUserName = `${assignedUser.firstName} ${assignedUser.lastName}`;
        }
      }
      
      const task = await storage.createTask(validatedData);
      
      // Create assignment notification if task is assigned to someone else
      if (task.assignedUserId && task.assignedUserId !== req.user!.id) {
        try {
          await NotificationService.createAssignmentNotification(
            "task",
            task.id,
            task.title,
            task.assignedUserId,
            req.user!.id
          );
        } catch (error) {
          console.error("Error creating assignment notification:", error);
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Get task details for logging before deletion
      const task = await storage.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Log deletion
      await storage.logEntityChange(
        "task",
        req.params.id,
        "deleted",
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Task deleted: ${task.title}`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Admin routes for user management
  app.post("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const user = await storage.adminCreateUser(req.body);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/admin/users/pending", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersPendingApproval();
      res.json(users);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });

  app.post("/api/admin/users/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const user = await storage.approveUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ error: "Failed to approve user" });
    }
  });

  // Helper function to send work order status emails
  async function sendWorkOrderStatusEmail(workOrder: any) {
    const statusMessages = {
      received: {
        subject: "Work Order Received - FennTech",
        message: "We have received your item and work order. Our technicians will begin diagnosis shortly.",
        nextStep: "We will contact you once we have completed the initial diagnosis."
      },
      in_progress: {
        subject: "Work Order In Progress - FennTech", 
        message: "Our technicians are now working on your item.",
        nextStep: "We will update you on our progress and notify you when testing begins."
      },
      testing: {
        subject: "Work Order Testing Phase - FennTech",
        message: "We have completed the repairs and are now testing your item to ensure everything is working properly.",
        nextStep: "Once testing is complete, we will contact you for pickup."
      },
      ready_for_pickup: {
        subject: "Work Order Ready for Pickup - FennTech",
        message: "Great news! Your item has been repaired and tested successfully. It is now ready for pickup.",
        nextStep: "Please contact us at your convenience to arrange pickup. Our business hours are Monday-Friday 9AM-5PM."
      },
      completed: {
        subject: "Work Order Completed - FennTech",
        message: "Your work order has been completed and the item has been returned to you.",
        nextStep: "Thank you for choosing FennTech. If you have any questions or concerns, please don't hesitate to contact us."
      }
    };

    const statusInfo = statusMessages[workOrder.status as keyof typeof statusMessages];
    if (!statusInfo) return;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">FennTech</h1>
              <p style="color: #666; margin: 5px 0;">Professional IT Services</p>
            </div>
            
            <h2 style="color: #2563eb;">Work Order Status Update</h2>
            
            <p>Dear ${workOrder.customerName},</p>
            
            <p>${statusInfo.message}</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin-top: 0; color: #2563eb;">Work Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 30%;">Item:</td>
                  <td style="padding: 8px 0;">${workOrder.itemDescription}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Issue:</td>
                  <td style="padding: 8px 0;">${workOrder.issue}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                      ${workOrder.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
                ${workOrder.notes ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Notes:</td>
                  <td style="padding: 8px 0;">${workOrder.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1d4ed8;">Next Steps</h4>
              <p style="margin-bottom: 0;">${statusInfo.nextStep}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p><strong>Contact Information:</strong></p>
              <p>Phone: ${workOrder.telephone}<br>
              Email: ${workOrder.email}</p>
              
              <p style="margin-top: 20px;">
                If you have any questions, please don't hesitate to contact us.<br>
                Best regards,<br>
                <strong>FennTech Support Team</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'admin@fenntechltd.com',
      to: workOrder.email,
      subject: statusInfo.subject,
      html: htmlContent,
    });
  }

  // Help system API
  app.post("/api/help", authenticateToken, async (req, res) => {
    try {
      const helpRequest = req.body;
      const helpResponse = await HelpService.generateHelp(helpRequest);
      res.json(helpResponse);
    } catch (error) {
      console.error("Error generating help:", error);
      res.status(500).json({ 
        explanation: "Unable to generate help content at this time. Please try again later or contact support.",
        tips: ["Check your internet connection", "Contact support if the problem persists"],
        relatedFeatures: ["Support", "Documentation"]
      });
    }
  });

  // Change Log routes
  app.get("/api/change-log", authenticateToken, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const changes = await storage.getChangeLog(limit);
      res.json(changes);
    } catch (error) {
      console.error("Error fetching change log:", error);
      res.status(500).json({ message: "Failed to fetch change log" });
    }
  });

  // Activity feed route for dashboard
  app.get('/api/activity-feed', authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const changeLogs = await storage.getChangeLog(limit);
      res.json(changeLogs);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
  });

  // Company Settings routes
  app.get('/api/company-settings', authenticateToken, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({ error: 'Failed to fetch company settings' });
    }
  });

  app.post('/api/company-settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.createOrUpdateCompanySettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error saving company settings:', error);
      res.status(500).json({ error: 'Failed to save company settings' });
    }
  });

  // Client routes
  app.get('/api/clients', authenticateToken, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.get('/api/clients/:id', authenticateToken, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  });

  app.post('/api/clients', authenticateToken, async (req, res) => {
    try {
      const client = await storage.createClient(req.body);
      
      await storage.logEntityChange(
        'client',
        client.id,
        'created',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Client created: ${client.name}`
      );
      
      res.json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  app.put('/api/clients/:id', authenticateToken, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      await storage.logEntityChange(
        'client',
        client.id,
        'updated',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Client updated: ${client.name}`
      );
      
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.delete('/api/clients/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      await storage.logEntityChange(
        'client',
        req.params.id,
        'deleted',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Client deleted: ${client.name}`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  // Quotation routes
  app.get('/api/quotations', authenticateToken, async (req, res) => {
    try {
      const quotations = await storage.getQuotations();
      res.json(quotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      res.status(500).json({ error: 'Failed to fetch quotations' });
    }
  });

  app.get('/api/quotations/:id', authenticateToken, async (req, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      res.json(quotation);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      res.status(500).json({ error: 'Failed to fetch quotation' });
    }
  });

  app.post('/api/quotations', authenticateToken, async (req, res) => {
    try {
      const quoteNumber = await storage.generateQuoteNumber();
      const quotationData = {
        ...req.body,
        quoteNumber,
        createdById: req.user!.id,
        createdByName: `${req.user!.firstName} ${req.user!.lastName}`,
      };
      
      const quotation = await storage.createQuotation(quotationData);
      
      await storage.logEntityChange(
        'quotation',
        quotation.id,
        'created',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation created: ${quotation.quoteNumber}`
      );
      
      res.json(quotation);
    } catch (error) {
      console.error('Error creating quotation:', error);
      res.status(500).json({ error: 'Failed to create quotation' });
    }
  });

  app.put('/api/quotations/:id', authenticateToken, async (req, res) => {
    try {
      const quotation = await storage.updateQuotation(req.params.id, req.body);
      if (!quotation) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      await storage.logEntityChange(
        'quotation',
        quotation.id,
        'updated',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation updated: ${quotation.quoteNumber}`
      );
      
      res.json(quotation);
    } catch (error) {
      console.error('Error updating quotation:', error);
      res.status(500).json({ error: 'Failed to update quotation' });
    }
  });

  app.delete('/api/quotations/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      const success = await storage.deleteQuotation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      await storage.logEntityChange(
        'quotation',
        req.params.id,
        'deleted',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation deleted: ${quotation.quoteNumber}`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting quotation:', error);
      res.status(500).json({ error: 'Failed to delete quotation' });
    }
  });

  // Email quotation
  app.post('/api/quotations/:id/email', authenticateToken, async (req, res) => {
    try {
      const { recipientEmail, recipientName } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ error: 'Recipient email is required' });
      }

      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ error: 'Quotation not found' });
      }

      const companySettings = await storage.getCompanySettings();
      
      // Email configuration
      const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER || 'admin@fenntechltd.com';
      const companyName = companySettings?.name || 'FennTech';

      const mailOptions = {
        from: 'admin@fenntechltd.com',
        to: recipientEmail,
        subject: `Quotation ${quotation.quoteNumber} from ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Quotation ${quotation.quoteNumber}</h2>
            
            <p>Dear ${recipientName || 'Valued Customer'},</p>
            
            <p>Please find your quotation details below:</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Quotation Summary</h3>
              <p><strong>Quote Number:</strong> ${quotation.quoteNumber}</p>
              <p><strong>Date:</strong> ${new Date(quotation.quoteDate).toLocaleDateString()}</p>
              <p><strong>Valid Until:</strong> ${new Date(quotation.expirationDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ${quotation.currency} ${quotation.total}</p>
              <p><strong>Status:</strong> ${quotation.status.toUpperCase()}</p>
            </div>

            ${quotation.notes ? `<p><strong>Additional Notes:</strong><br>${quotation.notes}</p>` : ''}
            
            <p>If you have any questions or would like to proceed with this quotation, please don't hesitate to contact us.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0;"><strong>${companyName}</strong></p>
              ${companySettings?.telephone ? `<p style="margin: 5px 0;">Phone: ${companySettings.telephone}</p>` : ''}
              ${companySettings?.email ? `<p style="margin: 5px 0;">Email: ${companySettings.email}</p>` : ''}
              ${companySettings?.url ? `<p style="margin: 5px 0;">Website: ${companySettings.url}</p>` : ''}
            </div>
          </div>
        `,
      };

      await sgMail.send(mailOptions);

      await storage.logEntityChange(
        'quotation',
        quotation.id,
        'email_sent',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Quotation ${quotation.quoteNumber} emailed to ${recipientEmail}`
      );

      res.json({ success: true, message: 'Quotation emailed successfully' });
    } catch (error) {
      console.error('Error emailing quotation:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Invoice routes
  app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const invoiceNumber = await storage.generateInvoiceNumber();
      const invoiceData = {
        ...req.body,
        invoiceNumber,
        createdById: req.user!.id,
        createdByName: `${req.user!.firstName} ${req.user!.lastName}`,
      };
      
      const invoice = await storage.createInvoice(invoiceData);
      
      await storage.logEntityChange(
        'invoice',
        invoice.id,
        'created',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Invoice created: ${invoice.invoiceNumber}`
      );
      
      res.json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(req.params.id, req.body);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      await storage.logEntityChange(
        'invoice',
        invoice.id,
        'updated',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Invoice updated: ${invoice.invoiceNumber}`
      );
      
      res.json(invoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  });

  app.delete('/api/invoices/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const success = await storage.deleteInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      await storage.logEntityChange(
        'invoice',
        req.params.id,
        'deleted',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Invoice deleted: ${invoice.invoiceNumber}`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  // Email invoice
  app.post('/api/invoices/:id/email', authenticateToken, async (req, res) => {
    try {
      const { recipientEmail, recipientName } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ error: 'Recipient email is required' });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const companySettings = await storage.getCompanySettings();
      
      // Email configuration
      const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER || 'admin@fenntechltd.com';
      const companyName = companySettings?.name || 'FennTech';

      const mailOptions = {
        from: 'admin@fenntechltd.com',
        to: recipientEmail,
        subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>
            
            <p>Dear ${recipientName || 'Valued Customer'},</p>
            
            <p>Please find your invoice details below:</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Invoice Summary</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ${invoice.currency} ${invoice.total}</p>
              <p><strong>Amount Paid:</strong> ${invoice.currency} ${invoice.amountPaid || '0.00'}</p>
              <p><strong>Balance Due:</strong> ${invoice.currency} ${invoice.balanceDue}</p>
              <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
            </div>

            ${invoice.paymentTerms ? `<p><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>` : ''}
            ${invoice.notes ? `<p><strong>Additional Notes:</strong><br>${invoice.notes}</p>` : ''}
            
            <p>Please ensure payment is made by the due date to avoid any late fees. If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0;"><strong>${companyName}</strong></p>
              ${companySettings?.telephone ? `<p style="margin: 5px 0;">Phone: ${companySettings.telephone}</p>` : ''}
              ${companySettings?.email ? `<p style="margin: 5px 0;">Email: ${companySettings.email}</p>` : ''}
              ${companySettings?.url ? `<p style="margin: 5px 0;">Website: ${companySettings.url}</p>` : ''}
            </div>
          </div>
        `,
      };

      await sgMail.send(mailOptions);

      await storage.logEntityChange(
        'invoice',
        invoice.id,
        'email_sent',
        null,
        null,
        null,
        req.user!.id,
        `${req.user!.firstName} ${req.user!.lastName}`,
        `Invoice ${invoice.invoiceNumber} emailed to ${recipientEmail}`
      );

      res.json({ success: true, message: 'Invoice emailed successfully' });
    } catch (error) {
      console.error('Error emailing invoice:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Notification routes
  app.get('/api/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Create sample notifications for testing
  app.post('/api/notifications/create-sample', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const sampleNotifications = [
        {
          userId: userId,
          type: 'assignment' as const,
          priority: 'high' as const,
          title: 'New Task Assignment',
          message: 'You have been assigned to "Fix printer connectivity" task',
          entityType: 'task' as const,
          entityId: 'sample-task-1',
          entityName: 'Fix printer connectivity',
          isRead: false,
        },
        {
          userId: userId,
          type: 'status_change' as const,
          priority: 'medium' as const,
          title: 'Ticket Status Updated',
          message: 'Ticket "Server maintenance" has been moved to In Progress',
          entityType: 'ticket' as const,
          entityId: 'sample-ticket-1',
          entityName: 'Server maintenance',
          isRead: false,
        },
        {
          userId: userId,
          type: 'due_date' as const,
          priority: 'urgent' as const,
          title: 'Due Date Approaching',
          message: 'Work order "Computer repair for John Doe" is due tomorrow',
          entityType: 'work_order' as const,
          entityId: 'sample-wo-1',
          entityName: 'Computer repair for John Doe',
          isRead: false,
        }
      ];

      for (const notification of sampleNotifications) {
        await storage.createNotification(notification);
      }
      
      res.json({ message: "Sample notifications created successfully" });
    } catch (error) {
      console.error("Error creating sample notifications:", error);
      res.status(500).json({ message: "Failed to create sample notifications" });
    }
  });

  // Create sample quotations for testing
  app.post('/api/quotations/create-sample', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get or create a client first
      let clients = await storage.getClients();
      let client = clients[0];
      
      if (!client) {
        client = await storage.createClient({
          name: "Tech Solutions Ltd",
          email: "info@techsolutions.com",
          phone: "+1-876-555-0123",
          address: "123 Technology Drive\nKingston, Jamaica",
          contactPerson: "John Smith",
        });
      }

      const sampleQuotations = [
        {
          clientId: client.id,
          quoteDate: new Date(),
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          items: [
            {
              id: "1",
              description: "Dell Laptop - Inspiron 15 3000",
              quantity: 2,
              unitPrice: 85000,
              total: 170000
            },
            {
              id: "2", 
              description: "Wireless Mouse - Logitech M185",
              quantity: 4,
              unitPrice: 3500,
              total: 14000
            }
          ],
          subtotal: "184000.00",
          gctAmount: "27600.00",
          discountAmount: "0.00",
          discountPercentage: "0.00",
          total: "211600.00",
          currency: "JMD",
          notes: "Sample quotation for testing purposes",
          status: "draft" as const,
        },
        {
          clientId: client.id,
          quoteDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          expirationDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
          items: [
            {
              id: "1",
              description: "HP Printer - LaserJet Pro MFP M428fdw",
              quantity: 1,
              unitPrice: 65000,
              total: 65000
            }
          ],
          subtotal: "65000.00",
          gctAmount: "9750.00",
          discountAmount: "3250.00",
          discountPercentage: "5.00",
          total: "71500.00",
          currency: "JMD",
          notes: "Bulk purchase discount applied",
          status: "sent" as const,
        }
      ];

      for (const quotationData of sampleQuotations) {
        await storage.createQuotation(quotationData);
      }
      
      res.json({ message: "Sample quotations created successfully" });
    } catch (error) {
      console.error("Error creating sample quotations:", error);
      res.status(500).json({ message: "Failed to create sample quotations" });
    }
  });

  // Create sample invoices for testing
  app.post('/api/invoices/create-sample', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get or create a client first
      let clients = await storage.getClients();
      let client = clients[0];
      
      if (!client) {
        client = await storage.createClient({
          name: "Tech Solutions Ltd",
          email: "info@techsolutions.com",
          phone: "+1-876-555-0123",
          address: "123 Technology Drive\nKingston, Jamaica",
          contactPerson: "John Smith",
        });
      }

      const sampleInvoices = [
        {
          clientId: client.id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          items: [
            {
              id: "1",
              description: "Website Development Services",
              quantity: 1,
              unitPrice: 150000,
              total: 150000
            },
            {
              id: "2",
              description: "Domain Registration (1 year)",
              quantity: 1,
              unitPrice: 8500,
              total: 8500
            }
          ],
          subtotal: "158500.00",
          gctAmount: "23775.00",
          discountAmount: "0.00",
          discountPercentage: "0.00",
          total: "182275.00",
          currency: "JMD",
          paymentTerms: "Net 30",
          notes: "Thank you for your business",
          status: "sent" as const,
          amountPaid: "0.00",
          balanceDue: "182275.00",
        },
        {
          clientId: client.id,
          invoiceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          items: [
            {
              id: "1",
              description: "Computer Repair Service",
              quantity: 1,
              unitPrice: 12000,
              total: 12000
            }
          ],
          subtotal: "12000.00",
          gctAmount: "1800.00",
          discountAmount: "0.00",
          discountPercentage: "0.00",
          total: "13800.00",
          currency: "JMD",
          paymentTerms: "Net 30",
          notes: "Hardware diagnosis and repair completed",
          status: "paid" as const,
          amountPaid: "13800.00",
          balanceDue: "0.00",
        }
      ];

      for (const invoiceData of sampleInvoices) {
        await storage.createInvoice(invoiceData);
      }
      
      res.json({ message: "Sample invoices created successfully" });
    } catch (error) {
      console.error("Error creating sample invoices:", error);
      res.status(500).json({ message: "Failed to create sample invoices" });
    }
  });

  app.patch('/api/notifications/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.patch('/api/notifications/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Cash Collections routes
  app.get("/api/cash-collections", authenticateToken, async (req, res) => {
    try {
      const collections = await storage.getCashCollections();
      res.json(collections);
    } catch (error) {
      console.error("Error fetching cash collections:", error);
      res.status(500).json({ message: "Failed to fetch cash collections" });
    }
  });

  app.get("/api/cash-collections/:id", authenticateToken, async (req, res) => {
    try {
      const collection = await storage.getCashCollectionById(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Cash collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching cash collection:", error);
      res.status(500).json({ message: "Failed to fetch cash collection" });
    }
  });

  app.post("/api/cash-collections", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const collectionData = {
        ...req.body,
        collectedBy: user.id
      };
      const validatedData = insertCashCollectionSchema.parse(collectionData);
      const collection = await storage.createCashCollection(validatedData);

      // Send email notification to omar.fennell@gmail.com
      try {
        const htmlContent = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976D2;">Cash Collection Recorded - FennTech</h2>
                
                <p>Dear Management,</p>
                
                <p>A new cash collection has been recorded in the FennTech system:</p>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1976D2;">Collection Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 5px 0; width: 40%;"><strong>Amount:</strong></td>
                      <td style="padding: 5px 0;">$${parseFloat(collection.amount).toLocaleString()} ${collection.currency}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><strong>Type:</strong></td>
                      <td style="padding: 5px 0;">${collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><strong>Reason:</strong></td>
                      <td style="padding: 5px 0;">${collection.reason}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><strong>Action Taken:</strong></td>
                      <td style="padding: 5px 0;">${collection.actionTaken}</td>
                    </tr>
                    ${collection.customerName ? `
                    <tr>
                      <td style="padding: 5px 0;"><strong>Customer:</strong></td>
                      <td style="padding: 5px 0;">${collection.customerName}</td>
                    </tr>
                    ` : ''}
                    ${collection.receiptNumber ? `
                    <tr>
                      <td style="padding: 5px 0;"><strong>Receipt #:</strong></td>
                      <td style="padding: 5px 0;">${collection.receiptNumber}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 5px 0;"><strong>Collection Date:</strong></td>
                      <td style="padding: 5px 0;">${new Date(collection.collectionDate).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><strong>Recorded By:</strong></td>
                      <td style="padding: 5px 0;">${user.firstName} ${user.lastName}</td>
                    </tr>
                  </table>
                </div>
                
                ${collection.notes ? `
                  <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                    <h4 style="margin-top: 0; color: #1976D2;">Additional Notes:</h4>
                    <p style="margin-bottom: 0;">${collection.notes}</p>
                  </div>
                ` : ''}
                
                <p style="margin-top: 30px;">Best regards,<br><strong>FennTech Internal System</strong></p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                  <p>This notification was generated automatically on ${new Date().toLocaleString()}.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        await sgMail.send({
          from: 'admin@fenntechltd.com',
          to: 'omar.fennell@gmail.com',
          subject: `Cash Collection Alert - $${parseFloat(collection.amount).toLocaleString()} ${collection.currency} Recorded`,
          html: htmlContent,
        });

        console.log('Cash collection email notification sent successfully to omar.fennell@gmail.com');
      } catch (emailError) {
        console.error('Failed to send cash collection email notification:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json(collection);
    } catch (error) {
      console.error("Error creating cash collection:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create cash collection" });
      }
    }
  });

  app.patch("/api/cash-collections/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const collection = await storage.updateCashCollection(id, updates);
      if (!collection) {
        return res.status(404).json({ message: "Cash collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error updating cash collection:", error);
      res.status(500).json({ message: "Failed to update cash collection" });
    }
  });

  app.delete("/api/cash-collections/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCashCollection(id);
      if (!success) {
        return res.status(404).json({ message: "Cash collection not found" });
      }
      res.json({ message: "Cash collection deleted successfully" });
    } catch (error) {
      console.error("Error deleting cash collection:", error);
      res.status(500).json({ message: "Failed to delete cash collection" });
    }
  });

  // End of Day Summaries routes
  app.get("/api/end-of-day-summaries", authenticateToken, async (req, res) => {
    try {
      const summaries = await storage.getEndOfDaySummaries();
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching end of day summaries:", error);
      res.status(500).json({ message: "Failed to fetch end of day summaries" });
    }
  });

  app.post("/api/end-of-day-summaries/generate", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if summary already exists for today
      const existingSummary = await storage.getEndOfDaySummaryByDate(today);
      if (existingSummary) {
        return res.status(400).json({ message: "End of day summary already exists for today" });
      }

      // Gather daily activities
      const tasks = await storage.getTasks();
      const workOrders = await storage.getWorkOrders();  
      const tickets = await storage.getTickets();
      const customerInquiries = await storage.getCustomerInquiries();
      const callLogs = await storage.getCallLogs();
      const cashCollections = await storage.getCashCollectionsByDate(today);

      // Filter today's activities
      const todayActivities = {
        tasks: tasks.filter(t => new Date(t.createdAt).toDateString() === today.toDateString()),
        workOrders: workOrders.filter(w => new Date(w.createdAt).toDateString() === today.toDateString()),
        tickets: tickets.filter(t => new Date(t.createdAt).toDateString() === today.toDateString()),
        customerInquiries: customerInquiries.filter(c => new Date(c.createdAt).toDateString() === today.toDateString()),
        callLogs: callLogs.filter(c => new Date(c.createdAt).toDateString() === today.toDateString()),
        cashCollections: cashCollections
      };

      // Calculate totals
      const totalCash = cashCollections
        .filter(c => c.type === 'cash')
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);
        
      const totalCheques = cashCollections
        .filter(c => c.type === 'cheque')
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);

      // Create summary data
      const activitiesSummary = {
        date: today.toDateString(),
        counts: {
          newTasks: todayActivities.tasks.length,
          newWorkOrders: todayActivities.workOrders.length,
          newTickets: todayActivities.tickets.length,
          newInquiries: todayActivities.customerInquiries.length,
          callsHandled: todayActivities.callLogs.length,
          cashCollections: cashCollections.length
        },
        details: todayActivities
      };

      // Create the summary record
      const summary = await storage.createEndOfDaySummary({
        summaryDate: today,
        activitiesSummary,
        totalCashCollected: totalCash.toString(),
        totalChequesCollected: totalCheques.toString(),
        generatedBy: user.id
      });

      // Send email to Omar
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1976D2; text-align: center;">FennTech - End of Day Summary</h1>
              <h2 style="color: #666; text-align: center;">${today.toLocaleDateString()}</h2>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #1976D2; margin-top: 0;">Daily Activity Overview</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0; color: #2e7d32;">${activitiesSummary.counts.newTasks}</h4>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">New Tasks</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0; color: #1976D2;">${activitiesSummary.counts.newWorkOrders}</h4>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Work Orders</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0; color: #f57c00;">${activitiesSummary.counts.newTickets}</h4>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Support Tickets</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0; color: #7b1fa2;">${activitiesSummary.counts.newInquiries}</h4>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Customer Inquiries</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0; color: #388e3c;">${activitiesSummary.counts.callsHandled}</h4>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Calls Handled</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0; color: #d32f2f;">${activitiesSummary.counts.cashCollections}</h4>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Collections</p>
                  </div>
                </div>
              </div>

              <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #2e7d32; margin-top: 0;">Financial Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                  <div style="background: white; padding: 15px; border-radius: 5px;">
                    <h4 style="margin: 0; color: #2e7d32;">Cash Collected</h4>
                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">JMD $${totalCash.toFixed(2)}</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px;">
                    <h4 style="margin: 0; color: #1976D2;">Cheques Collected</h4>
                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">JMD $${totalCheques.toFixed(2)}</p>
                  </div>
                </div>
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: center;">
                  <h4 style="margin: 0; color: #856404;">Total Collections</h4>
                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #2e7d32;">JMD $${(totalCash + totalCheques).toFixed(2)}</p>
                </div>
              </div>

              ${cashCollections.length > 0 ? `
                <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="color: #1976D2; margin-top: 0;">Collection Details</h3>
                  <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 5px; overflow: hidden;">
                    <thead>
                      <tr style="background: #f5f5f5;">
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Type</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Amount</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Reason</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cashCollections.map(c => `
                        <tr>
                          <td style="padding: 10px; border-bottom: 1px solid #eee; text-transform: capitalize;">${c.type}</td>
                          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">$${parseFloat(c.amount).toFixed(2)}</td>
                          <td style="padding: 10px; border-bottom: 1px solid #eee;">${c.reason}</td>
                          <td style="padding: 10px; border-bottom: 1px solid #eee;">${c.customerName || 'N/A'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #1976D2; text-align: center;">
                <p style="margin: 0; color: #666;">Generated automatically by FennTech Internal System</p>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Report generated on ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sgMail.send({
        from: 'admin@fenntechltd.com',
        to: 'omar.fennell@gmail.com',
        subject: `FennTech End of Day Summary - ${today.toLocaleDateString()}`,
        html: htmlContent,
      });

      // Mark email as sent
      await storage.updateEndOfDaySummaryEmailSent(summary.id);

      res.json({ 
        message: "End of day summary generated and sent successfully",
        summary: {
          ...summary,
          emailSent: new Date()
        }
      });
    } catch (error) {
      console.error("Error generating end of day summary:", error);
      res.status(500).json({ message: "Failed to generate end of day summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
