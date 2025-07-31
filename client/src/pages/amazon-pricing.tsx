import { Link } from 'wouter';
import { AmazonPricing } from '@/components/amazon-pricing';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, ShoppingCart } from 'lucide-react';
import Header from '@/components/header';

export default function AmazonPricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Link to="/">
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                  <Upload className="h-4 w-4 mr-2" />
                  PDF Invoice Pricing
                </Button>
              </Link>
              <Button variant="default" className="bg-orange-600 hover:bg-orange-700 text-white">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Amazon Pricing
              </Button>
            </div>
            <Link to="/">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PDF Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AmazonPricing />
      </div>
    </div>
  );
}