import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ExternalLink, Calculator, Mail, History, DollarSign, Eye, Download, Send, FileText, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { AmazonPricingSession } from '@shared/schema';

const amazonUrlSchema = z.object({
  amazonUrl: z.string().url().refine((url) => url.includes('amazon.com'), {
    message: "Please provide a valid Amazon.com URL"
  }),
});

const amazonPricingSchema = z.object({
  amazonUrl: z.string().url(),
  productName: z.string().min(1, "Product name is required"),
  costUsd: z.number().min(0.01, "Cost must be greater than 0"),
  markupPercentage: z.number().min(0).max(500, "Markup must be between 0% and 500%"),
  notes: z.string().optional(),
});

const emailSchema = z.object({
  to: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  notes: z.string().optional(),
});

type AmazonUrlForm = z.infer<typeof amazonUrlSchema>;
type AmazonPricingForm = z.infer<typeof amazonPricingSchema>;
type EmailForm = z.infer<typeof emailSchema>;

export function AmazonPricing() {
  const [extractedProduct, setExtractedProduct] = useState<any>(null);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [entryMode, setEntryMode] = useState<'url' | 'manual'>('url');
  const [selectedSession, setSelectedSession] = useState<AmazonPricingSession | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [amazonEmailForm, setAmazonEmailForm] = useState({
    recipient: '',
    subject: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current exchange rate
  const { data: exchangeRateData, isLoading: exchangeLoading } = useQuery({
    queryKey: ['/api/exchange-rate'],
  });

  const exchangeRate = (exchangeRateData as { usdToJmd: number })?.usdToJmd || 162.00;

  // Get Amazon pricing sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<AmazonPricingSession[]>({
    queryKey: ['/api/amazon-pricing-sessions'],
  });

  // URL extraction form
  const urlForm = useForm<AmazonUrlForm>({
    resolver: zodResolver(amazonUrlSchema),
    defaultValues: {
      amazonUrl: '',
    },
  });

  // Extract price mutation
  const extractMutation = useMutation({
    mutationFn: async (data: AmazonUrlForm) => {
      const response = await fetch('/api/extract-amazon-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedProduct(data);
      setShowPricingForm(true);
      
      // Populate the form with extracted data
      pricingForm.setValue('amazonUrl', data.amazonUrl || '');
      pricingForm.setValue('productName', data.productName || '');
      // Only set cost if it's greater than 0, otherwise let user enter manually
      if (data.costUsd > 0) {
        pricingForm.setValue('costUsd', data.costUsd);
      } else {
        pricingForm.setValue('costUsd', 0); // Use 0 for manual entry
      }
      
      // Set appropriate markup based on cost
      const newMarkup = (data.costUsd || 0) > 100 ? 120 : 80;
      pricingForm.setValue('markupPercentage', newMarkup);
      
      toast({
        title: "URL processed successfully",
        description: data.extractedSuccessfully ? 
          "Price extracted from Amazon" : 
          "Please enter the item cost manually",
      });
    },
    onError: () => {
      toast({
        title: "Error processing URL",
        description: "Please check the Amazon URL and try again",
        variant: "destructive",
      });
    },
  });

  // Pricing form with calculated values
  const pricingForm = useForm<AmazonPricingForm>({
    resolver: zodResolver(amazonPricingSchema),
    defaultValues: {
      amazonUrl: '',
      productName: '',
      costUsd: 0,
      markupPercentage: 80,
      notes: '',
    },
  });

  // Edit form for existing sessions
  const editForm = useForm<AmazonPricingForm>({
    resolver: zodResolver(amazonPricingSchema),
    defaultValues: {
      amazonUrl: '',
      productName: '',
      costUsd: 0,
      markupPercentage: 80,
      notes: '',
    },
  });

  // Watch form values for real-time calculations
  const costUsd = pricingForm.watch('costUsd') || 0;
  const markupPercentage = pricingForm.watch('markupPercentage') || 80;

  // Watch edit form values for real-time calculations
  const editCostUsd = editForm.watch('costUsd') || 0;
  const editMarkupPercentage = editForm.watch('markupPercentage') || 80;

  // Calculations
  const amazonPrice = costUsd * 1.07; // Cost + 7%
  const sellingPriceUsd = amazonPrice * (1 + markupPercentage / 100);
  const sellingPriceJmd = sellingPriceUsd * exchangeRate;

  // Edit calculations
  const editAmazonPrice = editCostUsd * 1.07;
  const editSellingPriceUsd = editAmazonPrice * (1 + editMarkupPercentage / 100);
  const editSellingPriceJmd = editSellingPriceUsd * exchangeRate;

  // Update markup when cost changes
  const handleCostChange = (value: number) => {
    pricingForm.setValue('costUsd', value);
    // Auto-adjust markup based on cost
    const newMarkup = value > 100 ? 120 : 80;
    pricingForm.setValue('markupPercentage', newMarkup);
  };

  // Create pricing session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: AmazonPricingForm) => {
      const sessionData = {
        amazonUrl: data.amazonUrl,
        productName: data.productName,
        costUsd: data.costUsd.toString(),
        amazonPrice: amazonPrice.toString(),
        markupPercentage: data.markupPercentage.toString(),
        sellingPriceUsd: sellingPriceUsd.toString(),
        sellingPriceJmd: sellingPriceJmd.toString(),
        exchangeRate: exchangeRate.toString(),
        notes: data.notes || '',
        status: 'pending',
      };
      const response = await fetch('/api/amazon-pricing-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/amazon-pricing-sessions'] });
      toast({
        title: "Pricing Saved Successfully",
        description: `Session ${data.id} saved. You can send an email report from the pricing history.`,
      });
      setShowPricingForm(false);
      setExtractedProduct(null);
      urlForm.reset();
      pricingForm.reset({
        amazonUrl: '',
        productName: '',
        costUsd: 0,
        markupPercentage: 80,
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save the pricing calculation",
        variant: "destructive",
      });
    },
  });

  // Email form
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: 'omar.fennell@gmail.com',
      subject: 'Amazon Pricing Report',
      notes: '',
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailForm) => {
      const response = await fetch('/api/send-amazon-email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, sessionId: selectedSession?.id })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/amazon-pricing-sessions'] });
      toast({
        title: "Email sent successfully",
        description: "The Amazon pricing report has been sent to management",
      });
      setShowEmailForm(false);
      setSelectedSession(null);
      emailForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Failed to send the pricing report";
      if (error.message.includes("not configured")) {
        errorMessage = "Email service not configured. Please contact administrator.";
      }
      toast({
        title: "Email Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update session mutation for editing
  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: AmazonPricingForm }) => {
      const sessionData = {
        amazonUrl: data.amazonUrl,
        productName: data.productName,
        costUsd: data.costUsd.toString(),
        amazonPrice: editAmazonPrice.toString(),
        markupPercentage: data.markupPercentage.toString(),
        sellingPriceUsd: editSellingPriceUsd.toString(),
        sellingPriceJmd: editSellingPriceJmd.toString(),
        exchangeRate: exchangeRate.toString(),
        notes: data.notes || '',
      };
      const response = await apiRequest('PUT', `/api/amazon-pricing-sessions/${sessionId}`, sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/amazon-pricing-sessions'] });
      toast({
        title: "Session Updated",
        description: "Amazon pricing session updated successfully",
      });
      setShowEditDialog(false);
      setSelectedSession(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update Amazon pricing session",
        variant: "destructive",
      });
    },
  });

  // Download mutation for Amazon sessions
  const downloadAmazonMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('GET', `/api/amazon-pricing-sessions/${sessionId}/download`);
      const blob = await response.blob();
      return { blob, sessionId };
    },
    onSuccess: ({ blob, sessionId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amazon-pricing-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Download Complete",
        description: "Amazon pricing details downloaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Download Failed",
        description: "Failed to download Amazon pricing details",
        variant: "destructive",
      });
    },
  });

  // Email mutation for Amazon sessions
  const emailAmazonMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: any }) => {
      const response = await apiRequest('POST', `/api/amazon-pricing-sessions/${sessionId}/email`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Amazon pricing details emailed successfully",
      });
      setShowEmailDialog(false);
      setAmazonEmailForm({ recipient: '', subject: '', notes: '' });
    },
    onError: () => {
      toast({
        title: "Email Failed",
        description: "Failed to send Amazon pricing details",
        variant: "destructive",
      });
    },
  });

  const handleAmazonView = (session: AmazonPricingSession) => {
    setSelectedSession(session);
    setShowViewDialog(true);
  };

  const handleAmazonEdit = (session: AmazonPricingSession) => {
    setSelectedSession(session);
    editForm.setValue('amazonUrl', session.amazonUrl);
    editForm.setValue('productName', session.productName);
    editForm.setValue('costUsd', parseFloat(session.costUsd));
    editForm.setValue('markupPercentage', parseFloat(session.markupPercentage));
    editForm.setValue('notes', session.notes || '');
    setShowEditDialog(true);
  };

  const handleAmazonDownload = (sessionId: string) => {
    downloadAmazonMutation.mutate(sessionId);
  };

  const handleAmazonEmail = (session: AmazonPricingSession) => {
    setSelectedSession(session);
    setAmazonEmailForm({
      recipient: '',
      subject: `Amazon Pricing - ${session.productName}`,
      notes: ''
    });
    setShowEmailDialog(true);
  };

  const handleSendAmazonEmail = () => {
    if (!selectedSession || !amazonEmailForm.recipient.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a recipient email address",
        variant: "destructive",
      });
      return;
    }

    emailAmazonMutation.mutate({
      sessionId: selectedSession.id,
      data: amazonEmailForm
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Amazon Pricing</h1>
      </div>

      {/* Warning Alert */}
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> Please consider weight and local taxes when finalizing pricing. 
          These factors may affect the total cost and should be added to the calculated selling price.
        </AlertDescription>
      </Alert>

      {/* Entry Mode Selection and Input */}
      {!showPricingForm && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Amazon Product Entry</CardTitle>
            <CardDescription className="text-sm">
              Choose how to enter Amazon product information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Entry Mode Toggle */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <Button
                variant={entryMode === 'url' ? 'default' : 'outline'}
                onClick={() => {
                  setEntryMode('url');
                  setExtractedProduct(null);
                  urlForm.reset();
                  pricingForm.reset();
                }}
                className="w-full sm:w-auto text-sm"
                data-testid="button-url-mode"
              >
                Extract from URL
              </Button>
              <Button
                variant={entryMode === 'manual' ? 'default' : 'outline'}
                onClick={() => {
                  setEntryMode('manual');
                  setShowPricingForm(true);
                  setExtractedProduct({
                    productName: '',
                    costUsd: 0,
                    extractedSuccessfully: false,
                    amazonUrl: 'Manual Entry',
                    asin: 'Manual Entry'
                  });
                  urlForm.reset();
                  pricingForm.setValue('amazonUrl', 'Manual Entry');
                  pricingForm.setValue('productName', '');
                  pricingForm.setValue('costUsd', 0);
                }}
                className="w-full sm:w-auto text-sm"
                data-testid="button-manual-mode"
              >
                Enter Manually
              </Button>
            </div>

            {entryMode === 'url' ? (
              <Form {...urlForm}>
                <form onSubmit={urlForm.handleSubmit((data) => extractMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={urlForm.control}
                    name="amazonUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Amazon Product URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://amazon.com/product-url" 
                            {...field} 
                            className="text-sm"
                            data-testid="input-amazon-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
                  <Button 
                    type="submit" 
                    disabled={extractMutation.isPending}
                    className="w-full sm:w-auto text-sm"
                    data-testid="button-extract-price"
                  >
                    {extractMutation.isPending ? 'Processing...' : 'Extract Product Info'}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Manual entry mode selected. Click "Enter Manually" to proceed directly to the pricing form.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Form Section */}
      {showPricingForm && extractedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Amazon Pricing Calculator</span>
            </CardTitle>
            <CardDescription>
              Configure pricing details and calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...pricingForm}>
              <form onSubmit={pricingForm.handleSubmit((data) => createSessionMutation.mutate(data))} className="space-y-6">
                {/* Product Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={pricingForm.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Product Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-sm" data-testid="input-product-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pricingForm.control}
                    name="costUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Item Cost (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field}
                            value={field.value === 0 ? '' : field.value || ''}
                            onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                            className="text-sm"
                            data-testid="input-cost-usd"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing Calculations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={pricingForm.control}
                    name="markupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">
                          <span className="block sm:inline">Markup Percentage</span>
                          <div className="mt-1 sm:mt-0 sm:ml-2 sm:inline-block">
                            {costUsd > 100 && <Badge variant="secondary" className="text-xs">120% (Over $100)</Badge>}
                            {costUsd <= 100 && costUsd > 0 && <Badge variant="outline" className="text-xs">80% (Under $100)</Badge>}
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="1" 
                            {...field}
                            value={field.value === 0 ? '' : field.value || 80}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 80)}
                            className="text-sm"
                            data-testid="input-markup-percentage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel className="text-sm sm:text-base">Exchange Rate</FormLabel>
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-xs sm:text-sm font-mono">
                        {exchangeLoading ? 'Loading...' : `$${exchangeRate.toFixed(2)} JMD per USD`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculation Results */}
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-lg space-y-3">
                  <h4 className="text-sm sm:text-base font-semibold text-blue-800 dark:text-blue-200">Pricing Calculations</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Amazon Price (Cost + 7%):</span>
                      <div className="font-mono font-semibold">${amazonPrice.toFixed(2)} USD</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Selling Price (USD):</span>
                      <div className="font-mono font-semibold">${sellingPriceUsd.toFixed(2)} USD</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Selling Price (JMD):</span>
                      <div className="font-mono font-semibold text-base sm:text-lg text-blue-600 dark:text-blue-400">
                        ${sellingPriceJmd.toLocaleString()} JMD
                      </div>
                    </div>
                    <div>
                      <a 
                        href={extractedProduct.amazonUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View on Amazon</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <FormField
                  control={pricingForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about weight, taxes, or special considerations..." 
                          {...field} 
                          className="text-sm"
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button 
                    type="submit" 
                    disabled={createSessionMutation.isPending}
                    className="w-full sm:w-auto text-sm"
                    data-testid="button-save-pricing"
                  >
                    {createSessionMutation.isPending ? 'Saving...' : 'Save Pricing'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowPricingForm(false);
                      setExtractedProduct(null);
                      urlForm.reset();
                      pricingForm.reset();
                    }}
                    className="w-full sm:w-auto text-sm"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Amazon Pricing History */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Amazon Pricing History</span>
          </CardTitle>
          <CardDescription className="text-sm">Previous Amazon pricing calculations</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {sessionsLoading ? (
            <div className="text-center py-8 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No Amazon pricing sessions yet. Create your first pricing calculation above.
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sessions.map((session: AmazonPricingSession) => (
                <div key={session.id} className="border rounded-lg p-3 sm:p-4 space-y-3" data-testid={`session-${session.id}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-sm sm:text-base break-words">{session.productName}</h4>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-1">
                          <div>Cost: ${parseFloat(session.costUsd).toFixed(2)} USD</div>
                          <div>Amazon Price: ${parseFloat(session.amazonPrice).toFixed(2)} USD</div>
                          <div>Markup: {parseFloat(session.markupPercentage).toFixed(0)}%</div>
                          <div className="font-semibold text-green-600 col-span-2 sm:col-span-1">
                            Final Price: ${parseFloat(session.sellingPriceJmd).toLocaleString()} JMD
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center gap-2">
                      <Badge variant={session.emailSent ? "default" : "secondary"} className="text-xs">
                        {session.emailSent ? "Emailed" : "Pending"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAmazonView(session)}
                          className="p-1 h-8 w-8"
                          data-testid={`button-view-${session.id}`}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAmazonEdit(session)}
                          className="p-1 h-8 w-8"
                          data-testid={`button-edit-${session.id}`}
                        >
                          <Edit className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAmazonDownload(session.id)}
                          disabled={downloadAmazonMutation.isPending}
                          className="p-1 h-8 w-8"
                          data-testid={`button-download-${session.id}`}
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAmazonEmail(session)}
                          className="p-1 h-8 w-8"
                          data-testid={`button-email-${session.id}`}
                        >
                          <Send className="h-4 w-4 text-orange-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {session.notes && (
                    <div className="text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <strong>Notes:</strong> {session.notes}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Created: {new Date(session.createdAt!).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Form Modal */}
      {showEmailForm && selectedSession && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Send Email Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit((data) => sendEmailMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={emailForm.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Send To</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className="text-sm" data-testid="input-email-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Subject</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-sm" data-testid="input-email-subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={emailForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional information for management..." 
                          {...field} 
                          className="text-sm"
                          data-testid="textarea-email-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button 
                    type="submit" 
                    disabled={sendEmailMutation.isPending}
                    className="w-full sm:w-auto text-sm"
                    data-testid="button-send-email"
                  >
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEmailForm(false)}
                    className="w-full sm:w-auto text-sm"
                    data-testid="button-cancel-email"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* View Session Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Session Details</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Product Name</Label>
                <div className="text-sm text-gray-700 dark:text-gray-300">{selectedSession.productName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cost (USD)</Label>
                  <div className="text-sm text-gray-700 dark:text-gray-300">${parseFloat(selectedSession.costUsd).toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amazon Price (USD)</Label>
                  <div className="text-sm text-gray-700 dark:text-gray-300">${parseFloat(selectedSession.amazonPrice).toFixed(2)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Markup</Label>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{parseFloat(selectedSession.markupPercentage).toFixed(0)}%</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Price (JMD)</Label>
                  <div className="text-sm font-semibold text-green-600">${parseFloat(selectedSession.sellingPriceJmd).toLocaleString()}</div>
                </div>
              </div>
              {selectedSession.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">{selectedSession.notes}</div>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Created</Label>
                <div className="text-sm text-gray-700 dark:text-gray-300">{new Date(selectedSession.createdAt!).toLocaleString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Session Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email Session</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amazon-email-recipient" className="text-sm font-medium">Recipient Email</Label>
              <Input
                id="amazon-email-recipient"
                type="email"
                value={amazonEmailForm.recipient}
                onChange={(e) => setAmazonEmailForm({ ...amazonEmailForm, recipient: e.target.value })}
                placeholder="Enter recipient email"
                className="mt-1"
                data-testid="input-amazon-email-recipient"
              />
            </div>
            <div>
              <Label htmlFor="amazon-email-subject" className="text-sm font-medium">Subject</Label>
              <Input
                id="amazon-email-subject"
                value={amazonEmailForm.subject}
                onChange={(e) => setAmazonEmailForm({ ...amazonEmailForm, subject: e.target.value })}
                placeholder="Email subject"
                className="mt-1"
                data-testid="input-amazon-email-subject"
              />
            </div>
            <div>
              <Label htmlFor="amazon-email-notes" className="text-sm font-medium">Additional Notes (Optional)</Label>
              <Textarea
                id="amazon-email-notes"
                value={amazonEmailForm.notes}
                onChange={(e) => setAmazonEmailForm({ ...amazonEmailForm, notes: e.target.value })}
                placeholder="Add any additional notes..."
                className="mt-1"
                data-testid="textarea-amazon-email-notes"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSendAmazonEmail}
                disabled={emailAmazonMutation.isPending || !amazonEmailForm.recipient.trim()}
                className="flex-1"
                data-testid="button-send-amazon-email"
              >
                {emailAmazonMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                className="flex-1"
                data-testid="button-cancel-amazon-email"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Amazon Pricing Session</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateSessionMutation.mutate({ sessionId: selectedSession.id, data }))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="amazonUrl"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Amazon URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://amazon.com/..." data-testid="input-edit-amazon-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter product name" data-testid="input-edit-product-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="costUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-edit-cost-usd"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="markupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="500"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-edit-markup"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Real-time Calculations Display */}
                {editCostUsd > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Updated Calculations:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Amazon Price (Cost + 7%): <strong>${editAmazonPrice.toFixed(2)} USD</strong></div>
                      <div>Selling Price (USD): <strong>${editSellingPriceUsd.toFixed(2)} USD</strong></div>
                      <div>Exchange Rate: <strong>1 USD = {exchangeRate.toFixed(2)} JMD</strong></div>
                      <div className="text-green-600 font-semibold">Final Price: <strong>${editSellingPriceJmd.toLocaleString()} JMD</strong></div>
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
                          placeholder="Add any notes about this pricing..."
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
    </div>
  );
}