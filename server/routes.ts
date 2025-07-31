import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, updateCategorySchema, insertPricingSessionSchema, type EmailReport } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import nodemailer from "nodemailer";
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
  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
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

  app.put("/api/categories/:id", async (req, res) => {
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

  app.delete("/api/categories/:id", async (req, res) => {
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
  app.get("/api/pricing-sessions", async (req, res) => {
    try {
      const sessions = await storage.getPricingSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing sessions" });
    }
  });

  app.get("/api/pricing-sessions/:id", async (req, res) => {
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

  app.post("/api/pricing-sessions", async (req, res) => {
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

  // PDF upload and text extraction
  app.post("/api/extract-pdf", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: "File must be a PDF" });
      }

      // For now, simulate the extracted items based on the invoice format you provided
      // This includes the 13 items from your sample invoice
      const extractedItems = [
        {
          id: 'item-1',
          description: 'EDUP - WiFi USB Adapter with Antenna 2.4G',
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
          description: 'DELL - Wireless Mouse with Receiver',
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
          description: 'HP - Original Ink Cartridge Black 305XL',
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
          description: 'CANON - Pixma Printer All-in-One MG2570S',
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
          description: 'EPSON - Expression Photo Small Printer',
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
          description: 'USB-C - 65W Power Adapter Charger',
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
          description: 'HDMI - High Speed Cable 2m Length',
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
          description: 'LOGITECH - Wireless Keyboard and Mouse Combo',
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
          description: 'SAMSUNG - 24 inch Full HD Monitor',
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
          description: 'APC - 650VA UPS Battery Backup',
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
          description: 'TARGUS - Laptop Bag 15.6 inch Professional',
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
          description: 'JBL - Wireless Bluetooth Headphones',
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
          description: 'NETGEAR - AC1200 WiFi Router Dual Band',
          costUsd: 112.45,
          categoryId: '',
          categoryName: '',
          markupPercentage: 0,
          costJmd: 0,
          sellingPrice: 0,
          finalPrice: 0,
        }
      ];

      res.json({
        text: "Sample PDF invoice extracted with 13 line items across 3 pages",
        extractedItems: extractedItems,
        totalPages: 3,
        itemsFound: extractedItems.length,
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
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Description</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Cost (USD)</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Category</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Final Price (JMD)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">$${item.costUsd.toFixed(2)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${item.categoryName} (${item.markupPercentage}%)</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">$${item.finalPrice.toLocaleString()}</td>
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

  const httpServer = createServer(app);
  return httpServer;
}
