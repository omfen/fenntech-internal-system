import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Wrench, 
  Ticket as TicketIcon, 
  Phone, 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Users,
  DollarSign,
  Upload,
  ShoppingCart
} from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import PriceTrendDashboard from '@/components/price-trend-dashboard';
import type { WorkOrder, Ticket, CustomerInquiry, QuotationRequest } from '@shared/schema';

export default function Dashboard() {
  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders'],
  });

  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets'],
  });

  const { data: customerInquiries = [] } = useQuery<CustomerInquiry[]>({
    queryKey: ['/api/customer-inquiries'],
  });

  const { data: quotationRequests = [] } = useQuery<QuotationRequest[]>({
    queryKey: ['/api/quotation-requests'],
  });

  // Calculate statistics
  const workOrderStats = {
    total: workOrders.length,
    received: workOrders.filter(wo => wo.status === 'received').length,
    inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
    testing: workOrders.filter(wo => wo.status === 'testing').length,
    readyForPickup: workOrders.filter(wo => wo.status === 'ready_for_pickup').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
  };

  const ticketStats = {
    total: tickets.length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
    high: tickets.filter(t => t.priority === 'high').length,
    medium: tickets.filter(t => t.priority === 'medium').length,
    low: tickets.filter(t => t.priority === 'low').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><Clock className="h-3 w-3 mr-1" />Received</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "testing":
        return <Badge variant="outline" className="text-purple-600 border-purple-300"><AlertCircle className="h-3 w-3 mr-1" />Testing</Badge>;
      case "ready_for_pickup":
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Ready for Pickup</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-gray-600 border-gray-300"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case "high":
        return <Badge variant="destructive" className="text-xs bg-orange-500">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Low</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{priority}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FennTech Dashboard</h1>
          <p className="text-gray-600">Welcome to your business management dashboard. Monitor work orders, tickets, and customer activity.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workOrderStats.total - workOrderStats.completed}</div>
              <p className="text-xs text-muted-foreground">
                {workOrderStats.readyForPickup} ready for pickup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <TicketIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {ticketStats.urgent} urgent tickets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Inquiries</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerInquiries.length}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quote Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotationRequests.length}</div>
              <p className="text-xs text-muted-foreground">
                {quotationRequests.filter(q => q.urgency === 'urgent').length} urgent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Work Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Work Orders
                <Link href="/work-orders">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.slice(0, 5).map((workOrder) => (
                  <div key={workOrder.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{workOrder.customerName}</p>
                      <p className="text-xs text-gray-600">{workOrder.itemDescription}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(workOrder.status || 'received')}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(workOrder.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {workOrders.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No work orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Tickets
                <Link href="/tickets">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-gray-600">{ticket.description}</p>
                    </div>
                    <div className="text-right">
                      {getPriorityBadge(ticket.priority || 'medium')}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(ticket.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No tickets yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Link href="/work-orders">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-new-work-order">
                  <Wrench className="h-6 w-6" />
                  <span className="text-xs">New Work Order</span>
                </Button>
              </Link>
              <Link href="/tickets">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-new-ticket">
                  <TicketIcon className="h-6 w-6" />
                  <span className="text-xs">New Ticket</span>
                </Button>
              </Link>
              <Link href="/customer-inquiries">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-customer-inquiry">
                  <Phone className="h-6 w-6" />
                  <span className="text-xs">Customer Inquiry</span>
                </Button>
              </Link>
              <Link href="/quotation-requests">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-quote-request">
                  <FileText className="h-6 w-6" />
                  <span className="text-xs">Quote Request</span>
                </Button>
              </Link>
              <Link href="/intcomex-pricing">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-intcomex-pricing">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Intcomex Pricing</span>
                </Button>
              </Link>
              <Link href="/amazon-pricing">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-amazon-pricing">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="text-xs">Amazon Pricing</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Trends */}
        <PriceTrendDashboard />
      </div>
    </div>
  );
}