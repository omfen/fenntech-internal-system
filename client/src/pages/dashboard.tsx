import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, ShoppingCart, TrendingUp } from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import PriceTrendDashboard from '@/components/price-trend-dashboard';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PriceTrendDashboard />
      </div>
    </div>
  );
}