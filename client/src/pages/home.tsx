import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import PricingCalculator from "@/components/pricing-calculator";
import PricingHistory from "@/components/pricing-history";
import CategoryManagement from "@/components/category-management";
import EmailReports from "@/components/email-reports";

type ActiveSection = "pricing" | "history" | "categories" | "reports";

export default function Home() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("pricing");
  const [exchangeRate, setExchangeRate] = useState<number>(150.00);

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
