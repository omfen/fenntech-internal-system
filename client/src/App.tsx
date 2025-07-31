import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import AmazonPricingPage from "@/pages/amazon-pricing";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/user-management";
import CustomerInquiries from "@/pages/customer-inquiries";
import QuotationRequests from "@/pages/quotation-requests";
import WorkOrders from "@/pages/work-orders";
import CallLogs from "@/pages/call-logs";
import Tickets from "@/pages/tickets";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/intcomex-pricing" component={Home} />
      <Route path="/amazon-pricing" component={AmazonPricingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/users" component={UserManagement} />
      <Route path="/customer-inquiries" component={CustomerInquiries} />
      <Route path="/quotation-requests" component={QuotationRequests} />
      <Route path="/work-orders" component={WorkOrders} />
      <Route path="/call-logs" component={CallLogs} />
      <Route path="/tickets" component={Tickets} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AuthenticatedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
