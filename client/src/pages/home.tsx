import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import PricingCalculator from "@/components/pricing-calculator";
import PricingHistory from "@/components/pricing-history";
import CategoryManagement from "@/components/category-management";
import EmailReports from "@/components/email-reports";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Upload, TrendingUp } from "lucide-react";

type ActiveSection = "pricing" | "history" | "categories" | "reports";

export default function Home() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("pricing");
  const [exchangeRate, setExchangeRate] = useState<number>(162.00);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "pricing":
        return <PricingCalculator exchangeRate={exchangeRate} />;
      case "history":
        return <PricingHistory />;
      case "categories":
        return <CategoryManagement />;
      case "reports":
        return <EmailReports />;
      default:
        return <PricingCalculator exchangeRate={exchangeRate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="home-page">
      <Header />
      
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Intcomex Pricing</span>
                <span className="sm:hidden">Intcomex</span>
              </Button>
              <Link to="/amazon-pricing">
                <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 text-sm w-full sm:w-auto">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Amazon Pricing
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="border-green-300 text-green-600 hover:bg-green-50 text-sm w-full sm:w-auto">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Price Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </Button>
              </Link>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-right">
              <span className="block sm:inline">Exchange Rate: </span>
              <span className="font-semibold">${exchangeRate.toFixed(2)} JMD per USD</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-8">
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Sidebar 
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              exchangeRate={exchangeRate}
              onExchangeRateChange={setExchangeRate}
            />
          </div>
          
          <div className="lg:col-span-3 order-1 lg:order-2">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
