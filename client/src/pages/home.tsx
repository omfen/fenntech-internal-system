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
      <Navigation />
      
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
