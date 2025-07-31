import { storage } from "./storage";

export async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@fenntechltd.com");
    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const adminUser = await storage.createUser({
      email: "admin@fenntechltd.com",
      password: "FennTech2024!", // You should change this password after first login
      firstName: "Administrator",
      lastName: "FennTech",
      role: "administrator",
    });

    console.log("Admin user created successfully:", adminUser.email);
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}