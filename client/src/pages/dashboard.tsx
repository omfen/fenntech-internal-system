import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, ShoppingCart, TrendingUp } from 'lucide-react';
import Header from '@/components/header';
import PriceTrendDashboard from '@/components/price-trend-dashboard';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Link to="/">
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 text-sm w-full sm:w-auto">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Intcomex Pricing</span>
                  <span className="sm:hidden">Intcomex</span>
                </Button>
              </Link>
              <Link to="/amazon-pricing">
                <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 text-sm w-full sm:w-auto">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Amazon Pricing
                </Button>
              </Link>
              <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white text-sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Price Dashboard
              </Button>
            </div>
            <Link to="/" className="sm:block">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-800 text-sm w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PriceTrendDashboard />
      </div>
    </div>
  );
}