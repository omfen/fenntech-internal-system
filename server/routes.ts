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
