import { Calculator, User } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="bg-primary text-white p-1.5 sm:p-2 rounded-lg">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate" data-testid="app-title">
                FennTech Pricing
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Inventory Pricing & Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900" data-testid="user-name">
                John Admin
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary text-white rounded-full flex items-center justify-center">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
