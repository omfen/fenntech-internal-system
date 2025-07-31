import { Tags, History, Settings, Mail, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type ActiveSection = "pricing" | "history" | "categories" | "reports";

interface SidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
}

export default function Sidebar({ 
  activeSection, 
  onSectionChange, 
  exchangeRate, 
  onExchangeRateChange 
}: SidebarProps) {
  const { toast } = useToast();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isExchangeCollapsed, setIsExchangeCollapsed] = useState(false);

  const navItems = [
    { id: "pricing" as const, label: "Pricing Calculator", icon: Tags, shortLabel: "Pricing" },
    { id: "history" as const, label: "Pricing History", icon: History, shortLabel: "History" },
    { id: "categories" as const, label: "Manage Categories", icon: Settings, shortLabel: "Categories" },
    { id: "reports" as const, label: "Email Reports", icon: Mail, shortLabel: "Reports" },
  ];

  const handleUpdateExchangeRate = () => {
    toast({
      title: "Exchange Rate Updated",
      description: `Rate updated to $${exchangeRate.toFixed(4)} JMD`,
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6" data-testid="sidebar">
      {/* Navigation Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <button
          onClick={() => setIsNavCollapsed(!isNavCollapsed)}
          className="flex items-center justify-between w-full text-left lg:cursor-default"
        >
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">Navigation</h2>
          <div className="lg:hidden">
            {isNavCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>
        
        <nav className={`space-y-2 mt-4 ${isNavCollapsed ? 'hidden lg:block' : 'block'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg w-full text-left transition-colors text-sm lg:text-base ${
                  activeSection === item.id
                    ? "bg-primary bg-opacity-10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className={`${activeSection === item.id ? "font-medium" : ""} hidden sm:inline`}>
                  {item.label}
                </span>
                <span className={`${activeSection === item.id ? "font-medium" : ""} sm:hidden`}>
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Exchange Rate Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <button
          onClick={() => setIsExchangeCollapsed(!isExchangeCollapsed)}
          className="flex items-center justify-between w-full text-left lg:cursor-default"
        >
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">Exchange Rate</h3>
          <div className="lg:hidden">
            {isExchangeCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>
        
        <div className={`space-y-4 mt-4 ${isExchangeCollapsed ? 'hidden lg:block' : 'block'}`}>
          <div>
            <Label htmlFor="exchange-rate" className="block text-sm font-medium text-gray-700 mb-2">
              USD to JMD Rate
            </Label>
            <div className="relative">
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => onExchangeRateChange(parseFloat(e.target.value) || 0)}
                className="pr-12 text-sm lg:text-base"
                data-testid="input-exchange-rate"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-gray-500 text-sm">JMD</span>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleUpdateExchangeRate}
            className="w-full bg-primary text-white hover:bg-blue-700 text-sm lg:text-base"
            data-testid="button-update-rate"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Update Rate
          </Button>
          <div className="text-xs text-gray-500">
            Last updated: <span data-testid="text-last-updated">Today, 9:30 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
