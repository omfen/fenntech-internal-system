import express from "express";
import { z } from "zod";
import { storage } from "./storage";
import { verifyPassword, createSession, invalidateSession, authenticateToken } from "./auth";
import { insertUserSchema, loginSchema } from "@shared/schema";
import type { AuthenticatedRequest } from "./auth";

const router = express.Router();

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Create user
    const user = await storage.createUser(userData);
    
    // Create session
    const token = await createSession(user.id);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.status(201).json({ 
      user: userWithoutPassword, 
      token,
      message: "User registered successfully" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const credentials = loginSchema.parse(req.body);
    
    // Find user
    const user = await storage.getUserByEmail(credentials.email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Create session
    const token = await createSession(user.id);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json({ 
      user: userWithoutPassword, 
      token,
      message: "Login successful" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await storage.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout endpoint
router.post("/logout", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await invalidateSession(token);
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;