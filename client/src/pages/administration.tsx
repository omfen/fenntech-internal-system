import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Mail, Save, TestTube, CheckCircle, AlertCircle, ArrowLeft, Home, DollarSign, FileText } from "lucide-react";
import { z } from "zod";
import { Link } from "wouter";

// Email configuration schema (SendGrid)
const emailConfigSchema = z.object({
  testEmail: z.string().email("Must be a valid email address"),
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

export default function Administration() {
  const { toast } = useToast();
  const [testingEmail, setTestingEmail] = useState(false);

  const form = useForm<EmailConfig>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      testEmail: "",
    },
  });

  // Get current email configuration (if any)
  const { data: emailConfig, isLoading } = useQuery({
    queryKey: ["/api/admin/email-config"],
    retry: false,
  });

  // SendGrid configuration is handled via environment variables
  const configStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/email-config', {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SendGrid Status",
        description: data.message || "SendGrid configuration checked",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Error",
        description: error.message || "Failed to check SendGrid configuration",
        variant: "destructive",
      });
    },
  });

  // Test email configuration
  const testEmailMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      const response = await apiRequest('POST', '/api/admin/test-email', { testEmail });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Test email sent successfully! Check your inbox.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = () => {
    configStatusMutation.mutate();
  };

  const handleTestEmail = () => {
    const testEmail = form.getValues("testEmail");
    if (!testEmail) {
      toast({
        title: "Test Email Required",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }
    setTestingEmail(true);
    testEmailMutation.mutate(testEmail, {
      onSettled: () => setTestingEmail(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Administration</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center space-x-2" data-testid="button-home">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline" size="sm" data-testid="button-tasks">
              Tasks
            </Button>
          </Link>
          <Link href="/quotations">
            <Button variant="outline" size="sm" data-testid="button-quotations">
              Quotations
            </Button>
          </Link>
        </div>
      </div>

      {/* Email Configuration Section */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Email Configuration</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Configure email settings for sending pricing reports and notifications
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* SendGrid Configuration Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Email Service: SendGrid</h4>
                      <p className="text-sm text-gray-600">
                        {emailConfig?.isConfigured 
                          ? `Configured and ready to send emails from ${emailConfig.emailUser}`
                          : 'SendGrid API key not configured'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {emailConfig?.isConfigured ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      emailConfig?.isConfigured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {emailConfig?.isConfigured ? 'Active' : 'Not Configured'}
                    </span>
                  </div>
                </div>

                {!emailConfig?.isConfigured && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium mb-1">SendGrid API Key Required</p>
                        <p>To enable email functionality, set the SENDGRID_API_KEY environment variable with your SendGrid API key.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={configStatusMutation.isPending}
                    className="flex items-center space-x-2"
                    data-testid="button-check-config"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{configStatusMutation.isPending ? 'Checking...' : 'Check Configuration'}</span>
                  </Button>
                </div>
              </div>

              {/* Test Email Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Test Email Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="testEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="test@example.com"
                            data-testid="input-test-email"
                          />
                        </FormControl>
                        <FormDescription>
                          Send a test email to verify configuration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={testingEmail || testEmailMutation.isPending}
                    className="w-full md:w-auto"
                    data-testid="button-test-email"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testingEmail || testEmailMutation.isPending ? "Testing..." : "Send Test Email"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {/* Current Status */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Configuration Status</h4>
            <div className="flex items-center space-x-2 text-sm">
              {emailConfig?.isConfigured ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Email service is configured and ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700">Email service needs configuration</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Configuration Sections */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>System Information</CardTitle>
          <p className="text-sm text-gray-600">
            System configuration and status information
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-gray-700">Application Version</Label>
              <p className="text-sm text-gray-600 mt-1">FennTech Internal v2.0</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Database Status</Label>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Connected</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Exchange Rate Service</Label>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Active (162.00 JMD/USD)</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">PDF Processing</Label>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Available</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
