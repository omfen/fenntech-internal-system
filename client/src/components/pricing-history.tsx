import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Eye, Send, FileText, Calculator } from "lucide-react";
import type { PricingSession } from "@shared/schema";

export default function PricingHistory() {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<PricingSession | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipient: '',
    subject: '',
    notes: ''
  });

  const { data: sessions = [], isLoading } = useQuery<PricingSession[]>({
    queryKey: ["/api/pricing-sessions"],
  });

  // Download PDF mutation
  const downloadMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('GET', `/api/pricing-sessions/${sessionId}/download`);
      const blob = await response.blob();
      return { blob, sessionId };
    },
    onSuccess: ({ blob, sessionId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intcomex-pricing-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Download Complete",
        description: "Pricing details downloaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Download Failed",
        description: "Failed to download pricing details",
        variant: "destructive",
      });
    },
  });

  // Email PDF mutation
  const emailMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: any }) => {
      const response = await apiRequest('POST', `/api/pricing-sessions/${sessionId}/email`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Pricing details emailed successfully",
      });
      setShowEmailDialog(false);
      setEmailForm({ recipient: '', subject: '', notes: '' });
    },
    onError: () => {
      toast({
        title: "Email Failed",
        description: "Failed to send pricing details",
        variant: "destructive",
      });
    },
  });

  const handleView = (session: PricingSession) => {
    setSelectedSession(session);
    setShowViewDialog(true);
  };

  const handleDownload = (sessionId: string) => {
    downloadMutation.mutate(sessionId);
  };

  const handleEmail = (session: PricingSession) => {
    setSelectedSession(session);
    setEmailForm({
      recipient: '',
      subject: `Intcomex Pricing - ${session.invoiceNumber || 'Session ' + session.id}`,
      notes: ''
    });
    setShowEmailDialog(true);
  };

  const handleSendEmail = () => {
    if (!selectedSession || !emailForm.recipient.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a recipient email address",
        variant: "destructive",
      });
      return;
    }

    emailMutation.mutate({
      sessionId: selectedSession.id,
      data: emailForm
    });
  };

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
                            onClick={() => handleView(session)}
                            data-testid={`button-view-${session.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => handleDownload(session.id)}
                            disabled={downloadMutation.isPending}
                            data-testid={`button-download-${session.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-accent hover:text-orange-700"
                            onClick={() => handleEmail(session)}
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
                              onClick={() => handleView(session)}
                              data-testid={`button-view-mobile-${session.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-700 p-1"
                              onClick={() => handleDownload(session.id)}
                              disabled={downloadMutation.isPending}
                              data-testid={`button-download-mobile-${session.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-accent hover:text-orange-700 p-1"
                              onClick={() => handleEmail(session)}
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

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Pricing Details - {selectedSession?.invoiceNumber || 'Session'}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-6">
              {/* Session Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Date</Label>
                  <p className="text-sm font-semibold">{new Date(selectedSession.createdAt!).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Exchange Rate</Label>
                  <p className="text-sm font-semibold">${parseFloat(selectedSession.exchangeRate).toFixed(4)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Value</Label>
                  <p className="text-sm font-semibold text-blue-600">
                    ${parseFloat(selectedSession.totalValue).toLocaleString()} JMD
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge className={getStatusColor(selectedSession.status)}>
                    {selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Items ({(selectedSession.items as any[])?.length || 0})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-900">Description</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-900">Cost USD</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-900">Price JMD</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-900">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {((selectedSession.items as any[]) || []).map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{item.description || 'N/A'}</td>
                            <td className="px-4 py-2">${item.costUsd?.toFixed(2) || 'N/A'}</td>
                            <td className="px-4 py-2">${item.priceJmd?.toLocaleString() || 'N/A'}</td>
                            <td className="px-4 py-2">{item.category || 'Uncategorized'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSession.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">{selectedSession.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Email Pricing Details</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-recipient">Recipient Email *</Label>
              <Input
                id="email-recipient"
                type="email"
                value={emailForm.recipient}
                onChange={(e) => setEmailForm(prev => ({ ...prev, recipient: e.target.value }))}
                placeholder="recipient@example.com"
                data-testid="input-email-recipient"
              />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <Label htmlFor="email-notes">Additional Notes</Label>
              <Textarea
                id="email-notes"
                rows={3}
                value={emailForm.notes}
                onChange={(e) => setEmailForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional additional notes..."
                data-testid="textarea-email-notes"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                data-testid="button-email-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={emailMutation.isPending || !emailForm.recipient.trim()}
                data-testid="button-email-send"
              >
                {emailMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
