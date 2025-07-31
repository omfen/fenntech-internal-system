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
import { Settings, Mail, Save, TestTube, CheckCircle, AlertCircle } from "lucide-react";
import { z } from "zod";

// Email configuration schema
const emailConfigSchema = z.object({
  emailUser: z.string().email("Must be a valid email address"),
  emailPass: z.string().min(1, "Password is required"),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  testEmail: z.string().email("Must be a valid email address"),
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

export default function Administration() {
  const { toast } = useToast();
  const [testingEmail, setTestingEmail] = useState(false);

  const form = useForm<EmailConfig>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      emailUser: "",
      emailPass: "",
      smtpHost: "smtp.gmail.com",
      smtpPort: "587",
      testEmail: "",
    },
  });

  // Get current email configuration (if any)
  const { data: emailConfig, isLoading } = useQuery({
    queryKey: ["/api/admin/email-config"],
    retry: false,
  });

  // Save email configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfig) => {
      const response = await apiRequest('POST', '/api/admin/email-config', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Email configuration has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save email configuration",
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

  const onSubmit = (data: EmailConfig) => {
    saveConfigMutation.mutate(data);
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
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl lg:text-3xl font-bold">Administration</h1>
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
              {/* Gmail Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="emailUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gmail Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="your-email@gmail.com"
                          data-testid="input-email-user"
                        />
                      </FormControl>
                      <FormDescription>
                        Gmail address to send emails from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailPass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gmail App Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Your Gmail App Password"
                          data-testid="input-email-pass"
                        />
                      </FormControl>
                      <FormDescription>
                        <a 
                          href="https://support.google.com/accounts/answer/185833" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Generate Gmail App Password →
                        </a>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SMTP Configuration (Optional Advanced Settings) */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Advanced SMTP Settings (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="smtp.gmail.com"
                            data-testid="input-smtp-host"
                          />
                        </FormControl>
                        <FormDescription>
                          Default: smtp.gmail.com (for Gmail)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="587"
                            data-testid="input-smtp-port"
                          />
                        </FormControl>
                        <FormDescription>
                          Default: 587 (TLS) or 465 (SSL)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Current Status */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Configuration Status</h4>
            <div className="flex items-center space-x-2 text-sm">
              {emailConfig ? (
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