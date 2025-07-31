import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Eye, Send, FileText, Calculator, Edit } from "lucide-react";
import type { PricingSession, Category } from "@shared/schema";

// Zod schemas for validation
const itemEditSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  costPrice: z.number().min(0.01, "Cost price must be greater than 0"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

const intcomexEditSchema = z.object({
  items: z.array(itemEditSchema),
  exchangeRate: z.number().min(1, "Exchange rate must be valid"),
  roundingOption: z.enum(['none', 'nearest_5', 'nearest_10', 'nearest_50', 'nearest_100']),
  notes: z.string().optional(),
});

type ItemEditForm = z.infer<typeof itemEditSchema>;
type IntcomexEditForm = z.infer<typeof intcomexEditSchema>;

export default function PricingHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<PricingSession | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipient: '',
    subject: '',
    notes: ''
  });

  const { data: sessions = [], isLoading } = useQuery<PricingSession[]>({
    queryKey: ["/api/pricing-sessions"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Edit form for Intcomex sessions
  const editForm = useForm<IntcomexEditForm>({
    resolver: zodResolver(intcomexEditSchema),
    defaultValues: {
      items: [],
      exchangeRate: 162,
      roundingOption: 'none',
      notes: '',
    },
  });

  // Watch form values for real-time calculations
  const watchedItems = editForm.watch('items') || [];
  const exchangeRate = editForm.watch('exchangeRate') || 162;
  const roundingOption = editForm.watch('roundingOption') || 'none';

  // Calculate individual item pricing
  const calculateItemPricing = (item: ItemEditForm, category: Category | undefined) => {
    if (!category) return { finalPriceJmd: 0, finalPriceUsd: 0 };
    
    const costUsd = item.costPrice;
    const markupMultiplier = 1 + (category.markupPercentage / 100);
    const finalPriceUsd = costUsd * markupMultiplier;
    const finalPriceJmd = finalPriceUsd * exchangeRate;
    
    return { finalPriceJmd, finalPriceUsd };
  };

  // Real-time calculations for all items
  const calculatedItems = watchedItems.map(item => {
    const category = categories.find(cat => cat.id === item.categoryId);
    const pricing = calculateItemPricing(item, category);
    return {
      ...item,
      category,
      ...pricing,
      totalFinalPriceJmd: pricing.finalPriceJmd * item.quantity
    };
  });

  const totalItemsUsd = calculatedItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  const totalBeforeGct = calculatedItems.reduce((sum, item) => sum + item.totalFinalPriceJmd, 0);
  const gctAmount = totalBeforeGct * 0.15; // 15% GCT
  const beforeRounding = totalBeforeGct + gctAmount;
  
  const applyRounding = (amount: number, option: string) => {
    switch (option) {
      case 'nearest_5': return Math.round(amount / 5) * 5;
      case 'nearest_10': return Math.round(amount / 10) * 10;
      case 'nearest_50': return Math.round(amount / 50) * 50;
      case 'nearest_100': return Math.round(amount / 100) * 100;
      default: return amount;
    }
  };

  const finalTotalJmd = applyRounding(beforeRounding, roundingOption);

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

  // Update pricing session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: IntcomexEditForm }) => {
      const sessionData = {
        items: data.items,
        totalItemsUsd: totalItemsUsd.toString(),
        totalValue: finalTotalJmd.toString(),
        exchangeRate: data.exchangeRate.toString(),
        roundingOption: data.roundingOption,
        notes: data.notes || '',
      };
      const response = await apiRequest('PUT', `/api/pricing-sessions/${sessionId}`, sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-sessions'] });
      toast({
        title: "Session Updated",
        description: "Intcomex pricing session updated successfully",
      });
      setShowEditDialog(false);
      setSelectedSession(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update Intcomex pricing session",
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

  const handleEdit = (session: PricingSession) => {
    setSelectedSession(session);
    const items = session.items as any[] || [];
    const editableItems = items.map(item => ({
      id: item.id || Math.random().toString(),
      description: item.description || '',
      categoryId: item.categoryId || '',
      costPrice: parseFloat(item.costPrice) || 0,
      quantity: item.quantity || 1,
    }));
    
    editForm.setValue('items', editableItems);
    editForm.setValue('exchangeRate', parseFloat(session.exchangeRate));
    editForm.setValue('roundingOption', session.roundingOption as any);
    editForm.setValue('notes', session.notes || '');
    setShowEditDialog(true);
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
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleEdit(session)}
                            data-testid={`button-edit-${session.id}`}
                          >
                            <Edit className="w-4 h-4" />
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
                              className="text-green-600 hover:text-green-700 p-1"
                              onClick={() => handleEdit(session)}
                              data-testid={`button-edit-mobile-${session.id}`}
                            >
                              <Edit className="w-4 h-4" />
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

      {/* Edit Session Dialog - Item Level Editing */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Intcomex Pricing Session - Item Details</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateSessionMutation.mutate({ sessionId: selectedSession.id, data }))} className="space-y-6">
                
                {/* Session Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FormField
                    control={editForm.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value || 162}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 162)}
                            data-testid="input-edit-exchange-rate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="roundingOption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rounding Option</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-rounding">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rounding option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Rounding</SelectItem>
                            <SelectItem value="nearest_5">Round to Nearest $5</SelectItem>
                            <SelectItem value="nearest_10">Round to Nearest $10</SelectItem>
                            <SelectItem value="nearest_50">Round to Nearest $50</SelectItem>
                            <SelectItem value="nearest_100">Round to Nearest $100</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Edit Individual Items</h4>
                  <div className="space-y-3">
                    {watchedItems.map((item, index) => {
                      const calculatedItem = calculatedItems[index];
                      const category = calculatedItem?.category;
                      
                      return (
                        <div key={item.id || index} className="p-4 border rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FormField
                              control={editForm.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Item description" data-testid={`input-item-description-${index}`} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name={`items.${index}.categoryId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value} data-testid={`select-item-category-${index}`}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          {cat.name} ({cat.markupPercentage}%)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name={`items.${index}.costPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cost Price (USD)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      {...field}
                                      value={field.value || 0}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      data-testid={`input-item-cost-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      value={field.value || 1}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                      data-testid={`input-item-quantity-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Real-time calculations for this item */}
                          {calculatedItem && category && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div><strong>Markup:</strong> {category.markupPercentage}%</div>
                                <div><strong>Price USD:</strong> ${calculatedItem.finalPriceUsd.toFixed(2)}</div>
                                <div><strong>Price JMD:</strong> ${calculatedItem.finalPriceJmd.toFixed(2)}</div>
                                <div><strong>Total JMD:</strong> ${calculatedItem.totalFinalPriceJmd.toFixed(2)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Calculations */}
                {calculatedItems.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-lg mb-3">Session Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><strong>Total Cost USD:</strong> ${totalItemsUsd.toFixed(2)}</div>
                      <div><strong>Total Before GCT:</strong> ${totalBeforeGct.toFixed(2)}</div>
                      <div><strong>GCT (15%):</strong> ${gctAmount.toFixed(2)}</div>
                      <div className="text-green-600 font-semibold md:col-span-4">
                        <strong>Final Total JMD:</strong> ${finalTotalJmd.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this pricing session..."
                          {...field}
                          data-testid="textarea-edit-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={updateSessionMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-edit"
                  >
                    {updateSessionMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
