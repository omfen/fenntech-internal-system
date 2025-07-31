import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ExternalLink, Calculator, Mail, History, DollarSign } from 'lucide-react';
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
  const [selectedSession, setSelectedSession] = useState<AmazonPricingSession | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
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
      pricingForm.setValue('costUsd', data.costUsd || 0);
      
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

  // Watch form values for real-time calculations
  const costUsd = pricingForm.watch('costUsd') || 0;
  const markupPercentage = pricingForm.watch('markupPercentage') || 80;

  // Calculations
  const amazonPrice = costUsd * 1.07; // Cost + 7%
  const sellingPriceUsd = amazonPrice * (1 + markupPercentage / 100);
  const sellingPriceJmd = sellingPriceUsd * exchangeRate;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/amazon-pricing-sessions'] });
      toast({
        title: "Amazon pricing session created",
        description: "The pricing calculation has been saved successfully",
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
    onError: () => {
      toast({
        title: "Error creating session",
        description: "Failed to save the pricing calculation",
        variant: "destructive",
      });
    },
  });

  // Email form
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: 'omar.fennell@gmail.com',
      subject: `Amazon Pricing Report - ${selectedSession?.productName || 'Product'}`,
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
    onError: () => {
      toast({
        title: "Error sending email",
        description: "Failed to send the pricing report",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <DollarSign className="h-6 w-6 text-orange-600" />
        <h1 className="text-3xl font-bold">Amazon Pricing</h1>
      </div>

      {/* Warning Alert */}
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> Please consider weight and local taxes when finalizing pricing. 
          These factors may affect the total cost and should be added to the calculated selling price.
        </AlertDescription>
      </Alert>

      {/* URL Input Section */}
      {!showPricingForm && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Amazon URL</CardTitle>
            <CardDescription>
              Provide a valid Amazon.com product URL to begin pricing calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...urlForm}>
              <form onSubmit={urlForm.handleSubmit((data) => extractMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={urlForm.control}
                  name="amazonUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amazon Product URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://amazon.com/product-url" 
                          {...field} 
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
                  data-testid="button-extract-price"
                >
                  {extractMutation.isPending ? 'Processing...' : 'Extract Product Info'}
                </Button>
              </form>
            </Form>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={pricingForm.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-product-name" />
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
                        <FormLabel>Item Cost (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field}
                            value={field.value || 0}
                            onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-cost-usd"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing Calculations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={pricingForm.control}
                    name="markupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Markup Percentage 
                          {costUsd > 100 && <Badge variant="secondary" className="ml-2">120% (Over $100)</Badge>}
                          {costUsd <= 100 && costUsd > 0 && <Badge variant="outline" className="ml-2">80% (Under $100)</Badge>}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="1" 
                            {...field}
                            value={field.value || 80}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 80)}
                            data-testid="input-markup-percentage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>Exchange Rate</FormLabel>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-mono">
                        {exchangeLoading ? 'Loading...' : `$${exchangeRate.toFixed(2)} JMD per USD`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculation Results */}
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Pricing Calculations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                      <div className="font-mono font-semibold text-lg text-blue-600 dark:text-blue-400">
                        ${sellingPriceJmd.toLocaleString()} JMD
                      </div>
                    </div>
                    <div>
                      <a 
                        href={extractedProduct.amazonUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about weight, taxes, or special considerations..." 
                          {...field} 
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    disabled={createSessionMutation.isPending}
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
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Amazon Pricing History</span>
          </CardTitle>
          <CardDescription>Previous Amazon pricing calculations</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-center py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No Amazon pricing sessions yet. Create your first pricing calculation above.
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session: AmazonPricingSession) => (
                <div key={session.id} className="border rounded-lg p-4 space-y-3" data-testid={`session-${session.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{session.productName}</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Cost: ${parseFloat(session.costUsd).toFixed(2)} USD</div>
                        <div>Amazon Price: ${parseFloat(session.amazonPrice).toFixed(2)} USD</div>
                        <div>Markup: {parseFloat(session.markupPercentage).toFixed(0)}%</div>
                        <div className="font-semibold text-green-600">
                          Final Price: ${parseFloat(session.sellingPriceJmd).toLocaleString()} JMD
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant={session.emailSent ? "default" : "secondary"}>
                        {session.emailSent ? "Emailed" : "Pending"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSession(session);
                          setShowEmailForm(true);
                          emailForm.setValue('subject', `Amazon Pricing Report - ${session.productName}`);
                        }}
                        disabled={sendEmailMutation.isPending}
                        data-testid={`button-email-${session.id}`}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {session.notes && (
                    <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
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
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Send Email Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit((data) => sendEmailMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={emailForm.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Send To</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email-to" />
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
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-email-subject" />
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
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional information for management..." 
                          {...field} 
                          data-testid="textarea-email-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    disabled={sendEmailMutation.isPending}
                    data-testid="button-send-email"
                  >
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEmailForm(false)}
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
    </div>
  );
}