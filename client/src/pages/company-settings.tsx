import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Phone, Mail, Globe, MapPin, Save } from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { CompanySettings } from '@shared/schema';

const companySettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  telephone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
});

type CompanySettingsForm = z.infer<typeof companySettingsSchema>;

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
  });

  const form = useForm<CompanySettingsForm>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: settings?.companyName || 'FennTech Ltd.',
      telephone: settings?.telephone || '',
      email: settings?.email || '',
      url: settings?.url || '',
      address: settings?.address || '',
    },
  });

  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName,
        telephone: settings.telephone || '',
        email: settings.email || '',
        url: settings.url || '',
        address: settings.address || '',
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: CompanySettingsForm) => {
      return await apiRequest('POST', '/api/company-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      toast({
        title: 'Success',
        description: 'Company settings saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: CompanySettingsForm) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-10 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-10 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600">Configure your company information for quotations and invoices</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Company Name *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter company name" 
                          {...field} 
                          data-testid="input-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telephone
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter phone number" 
                            {...field} 
                            data-testid="input-telephone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter email address" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Website URL
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com" 
                          {...field} 
                          data-testid="input-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Business Address
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter complete business address" 
                          {...field} 
                          data-testid="input-address"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-6">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    data-testid="button-save-settings"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
              <h3 className="text-lg font-semibold mb-4">How this will appear on quotations and invoices:</h3>
              <div className="space-y-2">
                <div className="text-xl font-bold">{form.watch('companyName') || 'Company Name'}</div>
                {form.watch('address') && (
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    {form.watch('address')}
                  </div>
                )}
                <div className="flex flex-col gap-1 text-sm text-gray-600">
                  {form.watch('telephone') && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {form.watch('telephone')}
                    </div>
                  )}
                  {form.watch('email') && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {form.watch('email')}
                    </div>
                  )}
                  {form.watch('url') && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      {form.watch('url')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}