import { Calculator, BarChart3, DollarSign, Users, Phone, FileText, Wrench, Ticket, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location === path;
  const isPricingActive = location === "/" || location === "/amazon-pricing";

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/customer-inquiries", label: "Customer Inquiries", icon: Phone },
    { path: "/quotation-requests", label: "Quotation Requests", icon: FileText },
    { path: "/work-orders", label: "Work Orders", icon: Wrench },
    { path: "/tickets", label: "Tickets", icon: Ticket },
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
            {/* Pricing Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isPricingActive ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                  data-testid="nav-pricing-dropdown"
                >
                  <Calculator className="h-4 w-4" />
                  <span className="hidden sm:inline">Pricing</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Calculator className="h-4 w-4 mr-2" />
                    Intcomex Pricing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/amazon-pricing">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Amazon Pricing
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Other Navigation Items */}
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