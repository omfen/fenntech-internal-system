import { Calculator, User } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-white p-2 rounded-lg">
              <Calculator className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900" data-testid="app-title">
                FennTech Pricing System
              </h1>
              <p className="text-sm text-gray-500">Inventory Pricing & Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900" data-testid="user-name">
                John Admin
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
              <User className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
