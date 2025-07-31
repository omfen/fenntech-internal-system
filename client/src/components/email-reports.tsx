import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function EmailReports() {
  const [managementEmail] = useState("omar.fennell@gmail.com");
  const [subject, setSubject] = useState("Pricing Report - FennTech Inventory");
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState("");
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) {
        throw new Error("Please select a pricing session first");
      }

      const emailData = {
        to: managementEmail,
        subject,
        notes,
        sessionId,
      };

      const response = await apiRequest('POST', '/api/send-email-report', emailData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully",
        description: "Pricing report sent to management successfully",
      });
      setSessionId(""); // Clear the session ID after successful send
      setNotes(""); // Clear notes
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Failed to send email report";
      if (error.message.includes("session not found")) {
        errorMessage = "Please check the session ID and try again";
      }
      toast({
        title: "Email Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    sendEmailMutation.mutate();
  };

  const handlePreviewEmail = () => {
    toast({
      title: "Preview",
      description: "Email preview functionality coming soon",
    });
  };

  return (
    <Card data-testid="email-reports">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-xl font-semibold text-gray-900">
          Email Reports
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Send pricing reports to management for approval</p>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="management-email" className="block text-sm font-medium text-gray-700 mb-2">
                Management Email
              </Label>
              <Input
                id="management-email"
                type="email"
                value={managementEmail}
                readOnly
                className="bg-gray-50"
                data-testid="input-management-email"
              />
            </div>

            <div>
              <Label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line
              </Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Pricing Report - Invoice #INV-2024-001"
                data-testid="input-email-subject"
              />
            </div>

            <div>
              <Label htmlFor="session-id" className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Session ID
              </Label>
              <Input
                id="session-id"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter pricing session ID"
                data-testid="input-session-id"
              />
              <p className="text-xs text-gray-500 mt-1">
                Copy the session ID from the pricing history table
              </p>
            </div>

            <div>
              <Label htmlFor="email-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </Label>
              <Textarea
                id="email-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or comments for management..."
                className="resize-none"
                data-testid="textarea-email-notes"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Email Preview</h4>
            <div className="bg-white rounded border p-4 text-sm" data-testid="email-preview">
              <div className="space-y-2 mb-4">
                <div><strong>To:</strong> {managementEmail}</div>
                <div><strong>Subject:</strong> {subject}</div>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>Dear Management,</p>
                <p>Please find attached the pricing report for the latest inventory batch.</p>
                <div className="bg-gray-100 p-3 rounded">
                  <div className="text-xs font-medium text-gray-900 mb-2">Summary:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Exchange Rate: <span data-testid="preview-exchange-rate">$150.25</span></div>
                    <div>Total Items: <span data-testid="preview-total-items">12</span></div>
                    <div>Total Value: <span data-testid="preview-total-value">$2,456,000 JMD</span></div>
                    <div>GCT Applied: 15%</div>
                  </div>
                </div>
                {notes && (
                  <p className="italic" data-testid="preview-notes">{notes}</p>
                )}
                <p>Best regards,<br />FennTech Pricing System</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <Button
            onClick={handleSendEmail}
            disabled={sendEmailMutation.isPending || !sessionId}
            className="bg-accent text-white hover:bg-orange-600"
            data-testid="button-send-email"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendEmailMutation.isPending ? "Sending..." : "Send Report"}
          </Button>
          <Button
            variant="outline"
            onClick={handlePreviewEmail}
            data-testid="button-preview-email"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Email
          </Button>
        </div>

        {!sessionId && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800" data-testid="warning-no-session">
              <strong>How to send a report:</strong> 
              <br/>1. Go to Intcomex or Amazon Pricing and create a pricing calculation
              <br/>2. Click "Save & Get Session ID" to save it
              <br/>3. Copy the session ID from the success message 
              <br/>4. Paste it above and click "Send Report"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
