import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import { Search, BookOpen, Users, Calculator, Phone, FileText, Wrench, Ticket, Settings, HelpCircle, ChevronRight, ExternalLink } from "lucide-react";

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const helpSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      color: "bg-blue-500",
      topics: [
        {
          title: "System Overview",
          content: "FennTech Internal App is a comprehensive business management system for inventory pricing, customer relationship management, and work order tracking."
        },
        {
          title: "Navigation",
          content: "Use the top navigation bar to access different sections: Dashboard (overview), Pricing (Intcomex/Amazon), Customers (inquiries, quotes, work orders, call logs, tickets), and User Management (admin only)."
        },
        {
          title: "User Roles",
          content: "Two roles exist: Administrator (full access including user management) and User (standard business operations). Only @fenntechltd.com email addresses can register."
        }
      ]
    },
    {
      id: "pricing",
      title: "Pricing System",
      icon: Calculator,
      color: "bg-green-500",
      topics: [
        {
          title: "Intcomex Invoice Processing",
          content: "Upload PDF invoices to automatically extract product information. Items are categorized with appropriate markups (Accessories-100%, Ink-45%, Laptops-25%, etc.). Final calculation: (Cost USD × 162 JMD) + 15% GCT + markup percentage."
        },
        {
          title: "Amazon Pricing",
          content: "Enter Amazon URLs to extract product information. Uses dynamic markup: 80% for items under $100 USD, 120% for items over $100 USD. Formula: Amazon price + 7% = cost, then apply markup."
        },
        {
          title: "Exchange Rates & Rounding",
          content: "Current rate: 162 JMD per USD. Choose rounding options: nearest $100 (default), $1,000, or $10,000 JMD. All calculations include 15% GCT automatically."
        }
      ]
    },
    {
      id: "customers",
      title: "Customer Management",
      icon: Users,
      color: "bg-purple-500",
      topics: [
        {
          title: "Customer Inquiries",
          content: "Track product inquiries with customer name, phone, and item details. Manage status: New → Contacted → Follow-up → Completed/Closed. Assign to team members for accountability."
        },
        {
          title: "Quotation Requests",
          content: "Handle quote requests with urgency levels (Low, Medium, High, Urgent). Status workflow: Pending → In Progress → Quoted → Accepted/Declined → Completed."
        },
        {
          title: "Work Orders",
          content: "5-stage workflow: Received → In Progress → Testing → Ready for Pickup → Completed. Customers receive automatic email notifications at each stage. Add technician notes throughout the process."
        },
        {
          title: "Call Logs",
          content: "Track incoming/outgoing calls with purpose, duration, outcome, and follow-up dates. Use outcomes: Answered, Voicemail, Busy, No Answer, Resolved, Follow-up Needed."
        }
      ]
    },
    {
      id: "tickets",
      title: "Internal Tickets",
      icon: Ticket,
      color: "bg-orange-500",
      topics: [
        {
          title: "Ticket Management",
          content: "Create internal tickets for issues, requests, or tasks. Set priority levels (Low, Medium, High, Urgent) and assign to team members. Track status and resolution progress."
        },
        {
          title: "Assignment & Tracking",
          content: "Assign tickets based on expertise and workload. Monitor resolution times and use for performance tracking and skills development."
        }
      ]
    },
    {
      id: "features",
      title: "Key Features",
      icon: Settings,
      color: "bg-indigo-500",
      topics: [
        {
          title: "Status Management",
          content: "All customer interactions have comprehensive status tracking with timestamps and audit trails. History is automatically maintained for accountability and reference."
        },
        {
          title: "Email Notifications",
          content: "Professional email notifications are sent for work order status changes. Templates maintain brand consistency and keep customers informed proactively."
        },
        {
          title: "Mobile Responsive",
          content: "The entire system is optimized for mobile use with card-based layouts, touch-friendly controls, and responsive design for tablets and phones."
        },
        {
          title: "Data Security",
          content: "All data is stored securely in PostgreSQL database with user authentication, role-based access control, and session management."
        }
      ]
    }
  ];

  const quickTips = [
    {
      title: "Dashboard Overview",
      description: "Check the dashboard daily for important notifications and business metrics",
      icon: BookOpen
    },
    {
      title: "Status Updates",
      description: "Keep customer statuses updated to ensure proper follow-up and communication",
      icon: Users
    },
    {
      title: "Pricing Accuracy",
      description: "Review extracted invoice data and category assignments before finalizing calculations",
      icon: Calculator
    },
    {
      title: "Email Notifications",
      description: "Work order status changes automatically notify customers via professional emails",
      icon: FileText
    }
  ];

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.topics.some(topic =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="help-title">
                Help & Documentation
              </h1>
              <p className="text-gray-600">
                Learn how to use the FennTech Internal App effectively
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="help-search"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Quick Tips Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickTips.map((tip, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <tip.icon className="w-4 h-4 text-blue-500" />
                      <h4 className="font-medium text-sm">{tip.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600">{tip.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Need More Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Can't find what you're looking for? Contact our support team.
                </p>
                <Button variant="outline" className="w-full" data-testid="contact-support">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Guide</TabsTrigger>
                <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                {/* Feature Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <Card key={section.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            <div className={`${section.color} text-white p-2 rounded-lg`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <div>
                              <CardTitle className="text-xl">{section.title}</CardTitle>
                              <CardDescription>
                                {section.topics.length} topics available
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {section.topics.slice(0, 2).map((topic, index) => (
                              <div key={index} className="border-l-2 border-gray-200 pl-3">
                                <h4 className="font-medium text-sm mb-1">{topic.title}</h4>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {topic.content.substring(0, 100)}...
                                </p>
                              </div>
                            ))}
                            {section.topics.length > 2 && (
                              <div className="flex items-center text-blue-600 text-sm">
                                <span>View {section.topics.length - 2} more topics</span>
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="detailed" className="mt-6">
                {/* Detailed Help Sections */}
                <div className="space-y-8">
                  {filteredSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <Card key={section.id}>
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            <div className={`${section.color} text-white p-2 rounded-lg`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-2xl">{section.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {section.topics.map((topic, index) => (
                              <div key={index} className="border-l-4 border-gray-200 pl-4">
                                <h3 className="font-semibold text-lg mb-2">{topic.title}</h3>
                                <p className="text-gray-700 leading-relaxed">{topic.content}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="troubleshooting" className="mt-6">
                {/* Troubleshooting Guide */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Common Issues & Solutions</CardTitle>
                      <CardDescription>
                        Quick solutions to frequently encountered problems
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-2">PDF Upload Issues</h3>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li>• Ensure PDF file is under 10MB in size</li>
                            <li>• Check that PDF contains selectable text (not scanned images)</li>
                            <li>• Try refreshing the page and uploading again</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Amazon URL Extraction</h3>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li>• Use full Amazon product URLs (not shortened links)</li>
                            <li>• Ensure URL is from amazon.com (not other Amazon domains)</li>
                            <li>• If extraction fails, use manual cost entry option</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Email Notifications</h3>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li>• Check spam/junk folders if emails aren't received</li>
                            <li>• Verify customer email addresses are entered correctly</li>
                            <li>• Emails are sent automatically on work order status changes</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Login & Access Issues</h3>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li>• Only @fenntechltd.com email addresses can register</li>
                            <li>• Contact administrator if your account is inactive</li>
                            <li>• Clear browser cache if experiencing login problems</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>System Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Supported Browsers</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Chrome (recommended)</li>
                            <li>• Firefox</li>
                            <li>• Safari</li>
                            <li>• Edge</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">File Requirements</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• PDF files: Max 10MB</li>
                            <li>• Text must be selectable</li>
                            <li>• Clear, readable content</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}