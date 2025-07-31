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
  ShoppingCart,
  Calendar,
  Star,
  Lightbulb,
  Target
} from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import PriceTrendDashboard from '@/components/price-trend-dashboard';
import type { WorkOrder, Ticket, CustomerInquiry, QuotationRequest, Task } from '@shared/schema';
import { format, isAfter, isBefore, addDays } from 'date-fns';

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

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Calculate due date statistics
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  
  const getAllItemsWithDueDates = () => {
    const items = [];
    
    // Add work orders with due dates
    workOrders.forEach(wo => {
      if (wo.dueDate) {
        items.push({
          id: wo.id,
          title: `Work Order: ${wo.customerName}`,
          type: 'work-order',
          dueDate: new Date(wo.dueDate),
          status: wo.status,
          priority: 'medium'
        });
      }
    });
    
    // Add tickets with due dates
    tickets.forEach(ticket => {
      if (ticket.dueDate) {
        items.push({
          id: ticket.id,
          title: `Ticket: ${ticket.title}`,
          type: 'ticket',
          dueDate: new Date(ticket.dueDate),
          status: ticket.status,
          priority: ticket.priority
        });
      }
    });
    
    // Add tasks with due dates
    tasks.forEach(task => {
      if (task.dueDate) {
        items.push({
          id: task.id,
          title: `Task: ${task.title}`,
          type: 'task',
          dueDate: new Date(task.dueDate),
          status: task.status,
          priority: task.priority
        });
      }
    });
    
    // Add customer inquiries with due dates
    customerInquiries.forEach(inquiry => {
      if (inquiry.dueDate) {
        items.push({
          id: inquiry.id,
          title: `Inquiry: ${inquiry.customerName}`,
          type: 'inquiry',
          dueDate: new Date(inquiry.dueDate),
          status: inquiry.status,
          priority: 'medium'
        });
      }
    });
    
    // Add quotation requests with due dates
    quotationRequests.forEach(quote => {
      if (quote.dueDate) {
        items.push({
          id: quote.id,
          title: `Quote: ${quote.customerName}`,
          type: 'quote',
          dueDate: new Date(quote.dueDate),
          status: quote.status,
          priority: quote.urgency
        });
      }
    });
    
    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  };

  const allItems = getAllItemsWithDueDates();
  const overdueItems = allItems.filter(item => isBefore(item.dueDate, today));
  const dueTodayItems = allItems.filter(item => 
    format(item.dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  );
  const dueTomorrowItems = allItems.filter(item => 
    format(item.dueDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')
  );
  const dueThisWeekItems = allItems.filter(item => 
    isAfter(item.dueDate, today) && isBefore(item.dueDate, nextWeek)
  );

  // Daily motivation messages
  const motivationMessages = [
    "Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Quality is not an act, it is a habit. Make every customer interaction count today!",
    "Innovation distinguishes between a leader and a follower. Lead with technology solutions.",
    "Your customers don't just buy products, they buy better versions of themselves.",
    "Today's exceptional service becomes tomorrow's loyal customer.",
    "Every problem solved today makes tomorrow's challenges easier to handle.",
    "Technology empowers, but relationships drive business forward.",
    "Great things happen when preparation meets opportunity. Be ready!",
    "Customer satisfaction is not a destination, it's a journey we take every day."
  ];
  
  const getTodaysMotivation = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return motivationMessages[dayOfYear % motivationMessages.length];
  };

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

        {/* Daily Motivation & Due Dates Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Motivation */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Lightbulb className="h-5 w-5" />
                Daily Motivation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-800 italic leading-relaxed">{getTodaysMotivation()}</p>
              <div className="flex items-center gap-2 mt-4 text-blue-600">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Let's make today exceptional!</span>
              </div>
            </CardContent>
          </Card>

          {/* Due Dates Overview */}
          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Calendar className="h-5 w-5" />
                Due Dates Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overdue</span>
                  <Badge variant="destructive" data-testid="overdue-count">
                    {overdueItems.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Due Today</span>
                  <Badge variant="destructive" className="bg-orange-500" data-testid="due-today-count">
                    {dueTodayItems.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Due Tomorrow</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300" data-testid="due-tomorrow-count">
                    {dueTomorrowItems.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Due This Week</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-300" data-testid="due-week-count">
                    {dueThisWeekItems.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Due Items Section */}
        {(overdueItems.length > 0 || dueTodayItems.length > 0) && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Items Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Overdue Items</h4>
                  <div className="space-y-2">
                    {overdueItems.slice(0, 3).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                        <div>
                          <span className="font-medium text-sm">{item.title}</span>
                          <div className="text-xs text-gray-600">Due: {format(item.dueDate, 'MMM dd, yyyy')}</div>
                        </div>
                        <div className="flex gap-2">
                          {getPriorityBadge(item.priority)}
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        </div>
                      </div>
                    ))}
                    {overdueItems.length > 3 && (
                      <p className="text-sm text-red-600">+ {overdueItems.length - 3} more overdue items</p>
                    )}
                  </div>
                </div>
              )}
              
              {dueTodayItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-800 mb-2">Due Today</h4>
                  <div className="space-y-2">
                    {dueTodayItems.slice(0, 3).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-2 bg-white rounded border border-orange-200">
                        <div>
                          <span className="font-medium text-sm">{item.title}</span>
                          <div className="text-xs text-gray-600">Due: Today</div>
                        </div>
                        <div className="flex gap-2">
                          {getPriorityBadge(item.priority)}
                          <Badge variant="destructive" className="bg-orange-500 text-xs">Due Today</Badge>
                        </div>
                      </div>
                    ))}
                    {dueTodayItems.length > 3 && (
                      <p className="text-sm text-orange-600">+ {dueTodayItems.length - 3} more due today</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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