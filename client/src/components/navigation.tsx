import { Calculator, BarChart3, DollarSign, Users, Phone, FileText, Wrench, Ticket, ChevronDown, PhoneCall, HelpCircle, CheckSquare, Receipt, Settings } from "lucide-react";
import FennTechLogo from "@assets/FennTech ONLY_1753941339432.png";
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
  const isPricingActive = location === "/intcomex-pricing" || location === "/amazon-pricing";
  const isTransactionsActive = location === "/clients" || location === "/quotations" || location === "/invoices" || location === "/cash-collections";

  const dashboardItem = { path: "/", label: "Dashboard", icon: BarChart3 };
  
  const customerItems = [
    { path: "/customer-inquiries", label: "Customer Inquiries", icon: Phone },
    { path: "/quotation-requests", label: "Quotation Requests", icon: FileText },
    { path: "/work-orders", label: "Work Orders", icon: Wrench },
    { path: "/call-logs", label: "Call Logs", icon: PhoneCall },
    { path: "/tickets", label: "Tickets", icon: Ticket },
  ];

  const isCustomersActive = customerItems.some(item => location === item.path);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      {/* Logo at top center */}
      <div className="flex justify-center py-2 border-b">
        <Link href="/">
          <img src={FennTechLogo} alt="FennTech" className="h-12 w-auto" />
        </Link>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            {/* Dashboard */}
            <Link href={dashboardItem.path}>
              <Button
                variant={isActive(dashboardItem.path) ? "default" : "ghost"}
                className="flex items-center space-x-2"
                data-testid="nav-dashboard"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{dashboardItem.label}</span>
              </Button>
            </Link>

            {/* Tasks */}
            <Link href="/tasks">
              <Button
                variant={isActive("/tasks") ? "default" : "ghost"}
                className="flex items-center space-x-2"
                data-testid="nav-tasks"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
              </Button>
            </Link>

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
                  <Link href="/intcomex-pricing">
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

            {/* Customers Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isCustomersActive ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                  data-testid="nav-customers-dropdown"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Customers</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {customerItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link href={item.path}>
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Transactions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isTransactionsActive ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                  data-testid="nav-transactions-dropdown"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Transactions</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/clients">
                    <Users className="h-4 w-4 mr-2" />
                    Clients
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/quotations">
                    <FileText className="h-4 w-4 mr-2" />
                    Quotations
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/invoices">
                    <Receipt className="h-4 w-4 mr-2" />
                    Invoices
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cash-collections">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Cash Collections
                  </Link>
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>

            {/* Help */}
            <Link href="/help">
              <Button
                variant={isActive("/help") ? "default" : "ghost"}
                className="flex items-center space-x-2"
                data-testid="nav-help"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </Link>

            {/* Administrator Dropdown */}
            {user?.role === 'administrator' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                    data-testid="nav-administrator-dropdown"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Administrator</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/users">
                      <Users className="h-4 w-4 mr-2" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/company-settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Company Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/administration">
                      <Settings className="h-4 w-4 mr-2" />
                      System Configuration
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}