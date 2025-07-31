import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Package, ShoppingCart } from "lucide-react";
import type { PricingSession, AmazonPricingSession } from "@shared/schema";

interface TrendData {
  date: string;
  intcomexValue: number;
  amazonValue: number;
  intcomexCount: number;
  amazonCount: number;
}

interface PricingStats {
  totalValue: number;
  totalItems: number;
  averagePerItem: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export default function PriceTrendDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch Intcomex pricing sessions
  const { data: intcomexSessions = [], isLoading: intcomexLoading } = useQuery<PricingSession[]>({
    queryKey: ["/api/pricing-sessions"],
  });

  // Fetch Amazon pricing sessions
  const { data: amazonSessions = [], isLoading: amazonLoading } = useQuery<AmazonPricingSession[]>({
    queryKey: ["/api/amazon-pricing-sessions"],
  });

  const isLoading = intcomexLoading || amazonLoading;

  // Calculate trend data
  const calculateTrendData = (): TrendData[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const trendData: TrendData[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Filter sessions for current date
      const intcomexForDate = intcomexSessions.filter(session => {
        const sessionDate = new Date(session.createdAt!).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const amazonForDate = amazonSessions.filter(session => {
        const sessionDate = new Date(session.createdAt!).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const intcomexValue = intcomexForDate.reduce((sum, session) => sum + parseFloat(session.totalValue), 0);
      const amazonValue = amazonForDate.reduce((sum, session) => sum + parseFloat(session.sellingPriceJmd), 0);

      trendData.push({
        date: dateStr,
        intcomexValue,
        amazonValue,
        intcomexCount: intcomexForDate.length,
        amazonCount: amazonForDate.length,
      });
    }

    return trendData;
  };

  // Calculate statistics
  const calculateStats = (sessions: any[], type: 'intcomex' | 'amazon'): PricingStats => {
    if (sessions.length === 0) {
      return {
        totalValue: 0,
        totalItems: 0,
        averagePerItem: 0,
        trend: 'stable',
        trendPercentage: 0,
      };
    }

    const totalValue = sessions.reduce((sum, session) => {
      if (type === 'intcomex') {
        return sum + parseFloat(session.totalValue);
      } else {
        return sum + parseFloat(session.sellingPriceJmd);
      }
    }, 0);

    const totalItems = type === 'intcomex' 
      ? sessions.reduce((sum, session) => sum + (session.items as any[]).length, 0)
      : sessions.length;

    const averagePerItem = totalItems > 0 ? totalValue / totalItems : 0;

    // Calculate trend (simplified - comparing first half vs second half of period)
    const midPoint = Math.floor(sessions.length / 2);
    const firstHalf = sessions.slice(0, midPoint);
    const secondHalf = sessions.slice(midPoint);

    if (firstHalf.length === 0 || secondHalf.length === 0) {
      return {
        totalValue,
        totalItems,
        averagePerItem,
        trend: 'stable',
        trendPercentage: 0,
      };
    }

    const firstHalfAvg = firstHalf.reduce((sum, session) => {
      if (type === 'intcomex') {
        return sum + parseFloat(session.totalValue);
      } else {
        return sum + parseFloat(session.sellingPriceJmd);
      }
    }, 0) / firstHalf.length;

    const secondHalfAvg = secondHalf.reduce((sum, session) => {
      if (type === 'intcomex') {
        return sum + parseFloat(session.totalValue);
      } else {
        return sum + parseFloat(session.sellingPriceJmd);
      }
    }, 0) / secondHalf.length;

    const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    const trend = Math.abs(trendPercentage) < 5 ? 'stable' : trendPercentage > 0 ? 'up' : 'down';

    return {
      totalValue,
      totalItems,
      averagePerItem,
      trend,
      trendPercentage: Math.abs(trendPercentage),
    };
  };

  const trendData = calculateTrendData();
  const intcomexStats = calculateStats(intcomexSessions, 'intcomex');
  const amazonStats = calculateStats(amazonSessions, 'amazon');

  // Recent sessions for quick view
  const recentIntcomexSessions = intcomexSessions
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  const recentAmazonSessions = amazonSessions
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Price Trend Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Price Trend Dashboard</h1>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="text-xs sm:text-sm"
              data-testid={`button-range-${range}`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Intcomex Stats */}
        <Card data-testid="intcomex-stats-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Intcomex Total</p>
                <p className="text-lg sm:text-2xl font-bold">${intcomexStats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">JMD</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2">
              {intcomexStats.trend === 'up' && <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />}
              {intcomexStats.trend === 'down' && <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />}
              <span className={`text-xs sm:text-sm ${
                intcomexStats.trend === 'up' ? 'text-green-600' : 
                intcomexStats.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {intcomexStats.trend === 'stable' ? 'Stable' : `${intcomexStats.trendPercentage.toFixed(1)}%`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="amazon-stats-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Amazon Total</p>
                <p className="text-lg sm:text-2xl font-bold">${amazonStats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">JMD</p>
              </div>
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
            <div className="flex items-center mt-2">
              {amazonStats.trend === 'up' && <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />}
              {amazonStats.trend === 'down' && <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />}
              <span className={`text-xs sm:text-sm ${
                amazonStats.trend === 'up' ? 'text-green-600' : 
                amazonStats.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {amazonStats.trend === 'stable' ? 'Stable' : `${amazonStats.trendPercentage.toFixed(1)}%`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="intcomex-items-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Intcomex Items</p>
                <p className="text-lg sm:text-2xl font-bold">{intcomexStats.totalItems}</p>
                <p className="text-xs text-gray-500">Items processed</p>
              </div>
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold text-blue-600">{intcomexSessions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="amazon-items-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Amazon Items</p>
                <p className="text-lg sm:text-2xl font-bold">{amazonStats.totalItems}</p>
                <p className="text-xs text-gray-500">Items processed</p>
              </div>
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold text-orange-600">{amazonSessions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Tabs defaultValue="intcomex" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intcomex" className="text-xs sm:text-sm" data-testid="tab-intcomex">
            Recent Intcomex
          </TabsTrigger>
          <TabsTrigger value="amazon" className="text-xs sm:text-sm" data-testid="tab-amazon">
            Recent Amazon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intcomex" className="space-y-3">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Recent Intcomex Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3">
              {recentIntcomexSessions.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No Intcomex sessions yet</p>
              ) : (
                recentIntcomexSessions.map((session) => {
                  const items = session.items as any[];
                  const itemCount = items?.length || 0;
                  const totalValue = parseFloat(session.totalValue);
                  
                  return (
                    <div key={session.id} className="border rounded-lg p-3 space-y-2" data-testid={`intcomex-session-${session.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-xs sm:text-sm font-medium">
                            {session.invoiceNumber || "No Invoice #"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.createdAt!).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {itemCount} items
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Total Value:</span>
                        <span className="text-sm font-bold text-blue-600">
                          ${totalValue.toLocaleString()} JMD
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amazon" className="space-y-3">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Recent Amazon Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3">
              {recentAmazonSessions.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No Amazon sessions yet</p>
              ) : (
                recentAmazonSessions.map((session) => {
                  const totalValue = parseFloat(session.sellingPriceJmd);
                  const markup = parseFloat(session.markupPercentage);
                  
                  return (
                    <div key={session.id} className="border rounded-lg p-3 space-y-2" data-testid={`amazon-session-${session.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-xs sm:text-sm font-medium break-words">
                            {session.productName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.createdAt!).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {markup.toFixed(0)}% markup
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Final Price:</span>
                        <span className="text-sm font-bold text-orange-600">
                          ${totalValue.toLocaleString()} JMD
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}