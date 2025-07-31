import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Send } from "lucide-react";
import type { PricingSession } from "@shared/schema";

export default function PricingHistory() {
  const { data: sessions = [], isLoading } = useQuery<PricingSession[]>({
    queryKey: ["/api/pricing-sessions"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="pricing-history-loading">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="pricing-history">
      <CardHeader className="border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
              Pricing History
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">View all previous pricing calculations</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto text-sm" data-testid="button-export-history">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {sessions.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-gray-500 text-sm" data-testid="no-sessions-message">
            No pricing sessions found. Create your first pricing calculation to see history here.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full" data-testid="history-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Invoice #</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Items Count</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Exchange Rate</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Total Value (JMD)</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => {
                    const items = session.items as any[];
                    const itemCount = items?.length || 0;
                    const totalValue = parseFloat(session.totalValue);
                    const exchangeRate = parseFloat(session.exchangeRate);
                    
                    return (
                      <tr key={session.id} className="hover:bg-gray-50" data-testid={`session-row-${session.id}`}>
                        <td className="px-6 py-4 text-sm text-gray-900" data-testid={`session-date-${session.id}`}>
                          {new Date(session.createdAt!).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900" data-testid={`session-invoice-${session.id}`}>
                          {session.invoiceNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900" data-testid={`session-items-${session.id}`}>
                          {itemCount} items
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900" data-testid={`session-rate-${session.id}`}>
                          ${exchangeRate.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-secondary" data-testid={`session-total-${session.id}`}>
                          ${totalValue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4" data-testid={`session-status-${session.id}`}>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-blue-700"
                            data-testid={`button-view-${session.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-700"
                            data-testid={`button-download-${session.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-accent hover:text-orange-700"
                            data-testid={`button-resend-${session.id}`}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-3">
              {sessions.map((session) => {
                const items = session.items as any[];
                const itemCount = items?.length || 0;
                const totalValue = parseFloat(session.totalValue);
                const exchangeRate = parseFloat(session.exchangeRate);
                
                return (
                  <Card key={session.id} className="border border-gray-200" data-testid={`session-card-${session.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {session.invoiceNumber || "No Invoice #"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(session.createdAt!).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={getStatusColor(session.status)} data-testid={`session-status-mobile-${session.id}`}>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-600">Items:</span>
                          <div className="font-medium" data-testid={`session-items-mobile-${session.id}`}>
                            {itemCount} items
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Exchange Rate:</span>
                          <div className="font-medium" data-testid={`session-rate-mobile-${session.id}`}>
                            ${exchangeRate.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-gray-600">Total Value:</span>
                            <div className="text-sm font-bold text-secondary" data-testid={`session-total-mobile-${session.id}`}>
                              ${totalValue.toLocaleString()} JMD
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-blue-700 p-1"
                              data-testid={`button-view-mobile-${session.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-700 p-1"
                              data-testid={`button-download-mobile-${session.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-accent hover:text-orange-700 p-1"
                              data-testid={`button-resend-mobile-${session.id}`}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
