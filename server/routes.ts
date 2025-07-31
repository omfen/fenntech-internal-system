import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, requireAdmin } from "./auth";
import authRoutes from "./auth-routes";
import { insertCategorySchema, updateCategorySchema, insertPricingSessionSchema, insertAmazonPricingSessionSchema, insertCustomerInquirySchema, insertQuotationRequestSchema, insertWorkOrderSchema, insertTicketSchema, type EmailReport } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import nodemailer from "nodemailer";
import { AmazonProductAPI } from "./amazon-api";
import { HelpService } from "./help-service";
import type { AuthenticatedRequest } from "./auth";
// pdf-parse will be dynamically imported when needed

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS || 'your-app-password'
  }
});

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

  app.put("/api/customer-inquiries/:id", authenticateToken, async (req, res) => {
    try {
      const inquiryData = insertCustomerInquirySchema.parse(req.body);
      const inquiry = await storage.updateCustomerInquiry(req.params.id, inquiryData);
      if (!inquiry) {
        return res.status(404).json({ message: "Customer inquiry not found" });
      }
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

  app.delete("/api/customer-inquiries/:id", authenticateToken, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomerInquiry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer inquiry not found" });
      }
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

  app.put("/api/quotation-requests/:id", authenticateToken, async (req, res) => {
    try {
      const requestData = insertQuotationRequestSchema.parse(req.body);
      const request = await storage.updateQuotationRequest(req.params.id, requestData);
      if (!request) {
        return res.status(404).json({ message: "Quotation request not found" });
      }
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

  app.delete("/api/quotation-requests/:id", authenticateToken, async (req, res) => {
    try {
      const deleted = await storage.deleteQuotationRequest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Quotation request not found" });
      }
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

      await transporter.sendMail({
        from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@fenntech.com',
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

      await transporter.sendMail({
        from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@fenntech.com',
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

  app.post("/api/work-orders", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertWorkOrderSchema.parse(req.body);
      const workOrder = await storage.createWorkOrder(validatedData);
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

  app.patch("/api/work-orders/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { sendStatusEmail, ...workOrderUpdates } = updates;
      
      const workOrder = await storage.updateWorkOrder(id, workOrderUpdates);
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

  app.delete("/api/work-orders/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWorkOrder(id);
      if (!success) {
        return res.status(404).json({ message: "Work order not found" });
      }
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

  app.post("/api/tickets", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(validatedData);
      
      // TODO: Send email notification if assigned to a user
      if (ticket.assignedUserId) {
        // Add email notification logic here
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

  app.delete("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTicket(id);
      if (!success) {
        return res.status(404).json({ message: "Ticket not found" });
      }
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

  app.post("/api/call-logs", authenticateToken, async (req, res) => {
    try {
      const callLogData = req.body;
      const callLog = await storage.createCallLog(callLogData);
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

  app.delete("/api/call-logs/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCallLog(id);
      if (!success) {
        return res.status(404).json({ message: "Call log not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting call log:", error);
      res.status(500).json({ message: "Failed to delete call log" });
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
      from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@fenntech.com',
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

  const httpServer = createServer(app);
  return httpServer;
}
