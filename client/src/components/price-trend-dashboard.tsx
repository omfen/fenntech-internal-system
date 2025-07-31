import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Package, ShoppingCart, BarChart3, PieChart, Activity } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';
import { format } from "date-fns";
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

    // Calculate trend
    const midpoint = Math.floor(sessions.length / 2);
    const firstHalf = sessions.slice(0, midpoint);
    const secondHalf = sessions.slice(midpoint);

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

  // Pie chart data
  const pieData = [
    { name: 'Intcomex', value: intcomexStats.totalValue, fill: '#3b82f6' },
    { name: 'Amazon', value: amazonStats.totalValue, fill: '#f97316' }
  ];

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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Price Trend Chart */}
        <Card className="col-span-1 lg:col-span-2" data-testid="price-trend-chart">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Price Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48 sm:h-64 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number, name) => [
                      `$${value.toLocaleString()} JMD`, 
                      name === 'intcomexValue' ? 'Intcomex' : 'Amazon'
                    ]}
                    labelFormatter={(label) => format(new Date(label), 'PPP')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="intcomexValue" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amazonValue" 
                    stackId="1"
                    stroke="#f97316" 
                    fill="#f97316" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volume Distribution Chart */}
        <Card data-testid="volume-distribution-chart">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
              Volume Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip 
                    formatter={(value: number, name) => [
                      `$${value.toLocaleString()} JMD`, 
                      name
                    ]}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 sm:gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs sm:text-sm">Intcomex</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-xs sm:text-sm">Amazon</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Activity Chart */}
        <Card data-testid="daily-activity-chart">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Daily Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd')}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number, name) => [
                      `${value} sessions`, 
                      name === 'intcomexCount' ? 'Intcomex' : 'Amazon'
                    ]}
                    labelFormatter={(label) => format(new Date(label), 'PPP')}
                  />
                  <Bar dataKey="intcomexCount" fill="#3b82f6" />
                  <Bar dataKey="amazonCount" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Tabs */}
      <Tabs defaultValue="intcomex" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intcomex" className="text-xs sm:text-sm">Recent Intcomex</TabsTrigger>
          <TabsTrigger value="amazon" className="text-xs sm:text-sm">Recent Amazon</TabsTrigger>
        </TabsList>
        
        <TabsContent value="intcomex" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-lg">Recent Intcomex Sessions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentIntcomexSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No Intcomex sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {recentIntcomexSessions.map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium text-sm sm:text-base">#{session.invoiceNumber}</span>
                          <Badge variant="outline" className="w-fit text-xs">
                            {(session.items as any[]).length} items
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {format(new Date(session.createdAt!), 'PPP')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-lg">${parseFloat(session.totalValue).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">JMD</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amazon" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-lg">Recent Amazon Sessions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentAmazonSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No Amazon sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {recentAmazonSessions.map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm sm:text-base line-clamp-2">{session.productName}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              ${session.costUsd} USD
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {session.markupPercentage}% markup
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {format(new Date(session.createdAt!), 'PPP')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-lg">${parseFloat(session.sellingPriceJmd).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">JMD</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}