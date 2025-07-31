import { Calculator, BarChart3, DollarSign, Users, Phone, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location === path;

  const navItems = [
    { path: "/", label: "Intcomex Pricing", icon: Calculator },
    { path: "/amazon-pricing", label: "Amazon Pricing", icon: DollarSign },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/customer-inquiries", label: "Customer Inquiries", icon: Phone },
    { path: "/quotation-requests", label: "Quotation Requests", icon: FileText },
  ];

  // Add user management for administrators
  if (user?.role === 'administrator') {
    navItems.push({
      path: "/users",
      label: "User Management",
      icon: Users,
    });
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                    data-testid={`nav-${item.path.slice(1) || 'home'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}