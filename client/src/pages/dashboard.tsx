import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
import type { WorkOrder, Ticket, CustomerInquiry, QuotationRequest, Task, CashCollection } from '@shared/schema';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
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

  const { data: cashCollections = [] } = useQuery<CashCollection[]>({
    queryKey: ['/api/cash-collections'],
  });

  const { data: changeLog = [] } = useQuery({
    queryKey: ['/api/change-log'],
    staleTime: 30000, // Refresh every 30 seconds
  });

  // Calculate due date statistics
  const currentDate = new Date();
  const tomorrow = addDays(currentDate, 1);
  const nextWeek = addDays(currentDate, 7);
  
  const getAllItemsWithDueDates = () => {
    const items: Array<{
      id: string;
      title: string;
      type: string;
      dueDate: Date;
      status: string;
      priority: string;
    }> = [];
    
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
  const overdueItems = allItems.filter(item => isBefore(item.dueDate, currentDate));
  const dueTodayItems = allItems.filter(item => 
    format(item.dueDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
  );
  const dueTomorrowItems = allItems.filter(item => 
    format(item.dueDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')
  );
  const dueThisWeekItems = allItems.filter(item => 
    isAfter(item.dueDate, currentDate) && isBefore(item.dueDate, nextWeek)
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
    const motivationDate = new Date();
    const dayOfYear = Math.floor((motivationDate.getTime() - new Date(motivationDate.getFullYear(), 0, 0).getTime()) / 86400000);
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

  // Calculate today's cash collections
  const todayDate = new Date();
  const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const endOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59);
  
  const todayCollections = cashCollections.filter(collection => {
    const collectionDate = new Date(collection.collectionDate);
    return collectionDate >= startOfToday && collectionDate <= endOfToday;
  });

  const cashStats = {
    todayTotal: todayCollections.reduce((sum, c) => sum + parseFloat(c.amount), 0),
    todayCash: todayCollections.filter(c => c.type === 'cash').reduce((sum, c) => sum + parseFloat(c.amount), 0),
    todayCheques: todayCollections.filter(c => c.type === 'cheque').reduce((sum, c) => sum + parseFloat(c.amount), 0),
    todayCount: todayCollections.length,
    totalCollections: cashCollections.length
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Link href="/work-orders">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-work-orders">
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
          </Link>

          <Link href="/tickets">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-tickets">
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
          </Link>

          <Link href="/customer-inquiries">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-customer-inquiries">
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
          </Link>

          <Link href="/quotation-requests">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-quotation-requests">
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
          </Link>

          <Link href="/cash-collections">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-cash-collections">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${cashStats.todayTotal.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {cashStats.todayCount} entries • ${cashStats.todayCash.toFixed(2)} cash + ${cashStats.todayCheques.toFixed(2)} cheques
                </p>
              </CardContent>
            </Card>
          </Link>
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
                      <Link key={`${item.type}-${item.id}`} href={`/${item.type === 'work-order' ? 'work-orders' : item.type === 'ticket' ? 'tickets' : item.type === 'customer-inquiry' ? 'customer-inquiries' : item.type === 'quotation-request' ? 'quotation-requests' : 'tasks'}`}>
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                          <div>
                            <span className="font-medium text-sm">{item.title}</span>
                            <div className="text-xs text-gray-600">Due: {format(item.dueDate, 'MMM dd, yyyy')}</div>
                          </div>
                          <div className="flex gap-2">
                            {getPriorityBadge(item.priority)}
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                          </div>
                        </div>
                      </Link>
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
                      <Link key={`${item.type}-${item.id}`} href={`/${item.type === 'work-order' ? 'work-orders' : item.type === 'ticket' ? 'tickets' : item.type === 'customer-inquiry' ? 'customer-inquiries' : item.type === 'quotation-request' ? 'quotation-requests' : 'tasks'}`}>
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-orange-200 hover:shadow-md transition-shadow cursor-pointer">
                          <div>
                            <span className="font-medium text-sm">{item.title}</span>
                            <div className="text-xs text-gray-600">Due: Today</div>
                          </div>
                          <div className="flex gap-2">
                            {getPriorityBadge(item.priority)}
                            <Badge variant="destructive" className="bg-orange-500 text-xs">Due Today</Badge>
                          </div>
                        </div>
                      </Link>
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
                  <Link key={workOrder.id} href="/work-orders">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
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
                  </Link>
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
                  <Link key={ticket.id} href="/tickets">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
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
                  </Link>
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
              <Link href="/tasks">
                <Button variant="outline" className="h-20 flex-col space-y-2" data-testid="button-new-task">
                  <Clock className="h-6 w-6" />
                  <span className="text-xs">New Task</span>
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

        {/* Admin End of Day Summary (only for administrators) */}
        {user?.role === 'administrator' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                End of Day Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Generate and email comprehensive daily activity reports to management
                  </p>
                  <p className="text-xs text-gray-500">
                    Reports are automatically sent to omar.fennell@gmail.com
                  </p>
                </div>
                <EndOfDaySummaryButton />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Feed and Price Trends */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {changeLog.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                ) : (
                  changeLog.slice(0, 10).map((change: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {change.action === 'created' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {change.action === 'updated' && <Clock className="h-4 w-4 text-blue-600" />}
                        {change.action === 'deleted' && <AlertCircle className="h-4 w-4 text-red-600" />}
                        {change.action === 'status_changed' && <TrendingUp className="h-4 w-4 text-orange-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {change.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            by {change.userName}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(change.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="mt-2 text-xs"
                          data-testid={`activity-${change.entityType}`}
                        >
                          {change.entityType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Price Trends */}
          <div>
            <PriceTrendDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}

function EndOfDaySummaryButton() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummaryMutation = useMutation({
    mutationFn: () => apiRequest("/api/end-of-day-summaries/generate", "POST", {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "End of day summary generated and emailed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate end of day summary",
        variant: "destructive",
      });
    },
  });

  const handleGenerateSummary = () => {
    setIsGenerating(true);
    generateSummaryMutation.mutate(undefined, {
      onSettled: () => setIsGenerating(false),
    });
  };

  return (
    <Button
      onClick={handleGenerateSummary}
      disabled={isGenerating || generateSummaryMutation.isPending}
      className="flex items-center space-x-2"
      data-testid="button-generate-summary"
    >
      <FileText className="h-4 w-4" />
      <span>
        {isGenerating || generateSummaryMutation.isPending
          ? "Generating..."
          : "Generate Summary"}
      </span>
    </Button>
  );
}