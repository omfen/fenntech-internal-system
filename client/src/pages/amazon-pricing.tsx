import { Link } from 'wouter';
import { AmazonPricing } from '@/components/amazon-pricing';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, ShoppingCart, TrendingUp } from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';

export default function AmazonPricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <AmazonPricing />
      </div>
    </div>
  );
}