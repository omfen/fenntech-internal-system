import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import PricingCalculator from "@/components/pricing-calculator";
import PricingHistory from "@/components/pricing-history";
import CategoryManagement from "@/components/category-management";
import EmailReports from "@/components/email-reports";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Upload } from "lucide-react";

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                PDF Invoice Pricing
              </Button>
              <Link to="/amazon-pricing">
                <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Amazon Pricing
                </Button>
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              Exchange Rate: <span className="font-semibold">${exchangeRate.toFixed(2)} JMD per USD</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Sidebar 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            exchangeRate={exchangeRate}
            onExchangeRateChange={setExchangeRate}
          />
          
          <div className="lg:col-span-3">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
