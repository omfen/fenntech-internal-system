import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wrench, Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import ViewOptions from "@/components/view-options";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkOrderSchema, type WorkOrder, type InsertWorkOrder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = insertWorkOrderSchema.extend({
  customerName: z.string().min(1, "Customer name is required"),
  telephone: z.string().min(1, "Telephone is required"),
  email: z.string().email("Please enter a valid email"),
  itemDescription: z.string().min(1, "Item description is required"),
  issue: z.string().min(1, "Issue description is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function WorkOrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      telephone: "",
      email: "",
      itemDescription: "",
      issue: "",
      status: "received",
      notes: "",
    },
  });

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  // Update filtered work orders when data changes
  React.useEffect(() => {
    setFilteredWorkOrders(workOrders);
  }, [workOrders]);

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertWorkOrder) => {
      const response = await apiRequest("POST", "/api/work-orders", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Work order created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, sendEmail }: { id: string; data: Partial<WorkOrder>; sendEmail?: boolean }) => {
      const response = await apiRequest("PATCH", `/api/work-orders/${id}`, { ...data, sendStatusEmail: sendEmail });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setEditingWorkOrder(null);
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Work order updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/work-orders/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Success",
        description: "Work order deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete work order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Convert "null" string back to null for assignedUserId
    const processedData = {
      ...data,
      assignedUserId: data.assignedUserId === "null" ? null : data.assignedUserId
    };
    
    if (editingWorkOrder) {
      // Check if status changed to determine if we should send email
      const statusChanged = editingWorkOrder.status !== data.status;
      updateMutation.mutate({ id: editingWorkOrder.id, data: processedData, sendEmail: statusChanged });
    } else {
      createMutation.mutate(processedData);
    }
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    form.reset({
      customerName: workOrder.customerName,
      telephone: workOrder.telephone,
      email: workOrder.email,
      itemDescription: workOrder.itemDescription,
      issue: workOrder.issue,
      status: workOrder.status || "received",
      assignedUserId: workOrder.assignedUserId || "null",
      notes: workOrder.notes || "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work order?")) {
      deleteMutation.mutate(id);
    }
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

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users.find((u: any) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  // Filter and sort functions
  const handleFilter = (filter: string) => {
    if (filter === 'all') {
      setFilteredWorkOrders(workOrders);
    } else {
      const filtered = workOrders.filter(wo => wo.status === filter);
      setFilteredWorkOrders(filtered);
    }
  };

  const handleSort = (sort: string) => {
    let sorted = [...filteredWorkOrders];
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
        break;
      case 'customer':
        sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
        break;
      case 'status':
        sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        break;
    }
    setFilteredWorkOrders(sorted);
  };

  const handleExport = (format: 'csv' | 'json') => {
    const exportData = filteredWorkOrders.map(wo => ({
      id: wo.id,
      customerName: wo.customerName,
      telephone: wo.telephone,
      email: wo.email,
      itemDescription: wo.itemDescription,
      issue: wo.issue,
      status: wo.status,
      assignedUser: getUserName(wo.assignedUserId),
      notes: wo.notes,
      createdAt: wo.createdAt,
      dueDate: wo.dueDate
    }));

    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {}).join(',');
      const csvData = exportData.map(row => 
        Object.values(row).map(value => 
          `"${String(value || '').replace(/"/g, '""')}"`
        ).join(',')
      ).join('\n');
      
      const csv = `${headers}\n${csvData}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_orders_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_orders_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  // Status filter options
  const statusCounts = workOrders.reduce((acc, wo) => {
    acc[wo.status || 'received'] = (acc[wo.status || 'received'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filterOptions = [
    { label: 'Received', value: 'received', count: statusCounts.received || 0 },
    { label: 'In Progress', value: 'in_progress', count: statusCounts.in_progress || 0 },
    { label: 'Testing', value: 'testing', count: statusCounts.testing || 0 },
    { label: 'Ready for Pickup', value: 'ready_for_pickup', count: statusCounts.ready_for_pickup || 0 },
    { label: 'Completed', value: 'completed', count: statusCounts.completed || 0 },
  ];

  const sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Customer Name', value: 'customer' },
    { label: 'Status', value: 'status' },
  ];

  // Render functions for ViewOptions
  const renderCard = (workOrder: WorkOrder) => (
    <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{workOrder.customerName}</CardTitle>
            <p className="text-sm text-gray-600">{workOrder.telephone}</p>
          </div>
          {getStatusBadge(workOrder.status || 'received')}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm"><strong>Item:</strong> {workOrder.itemDescription}</p>
          <p className="text-sm"><strong>Issue:</strong> {workOrder.issue}</p>
          <p className="text-sm"><strong>Assigned:</strong> {getUserName(workOrder.assignedUserId)}</p>
          {workOrder.notes && (
            <p className="text-sm"><strong>Notes:</strong> {workOrder.notes}</p>
          )}
          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-gray-500">
              Created: {new Date(workOrder.createdAt!).toLocaleDateString()}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(workOrder)}
                data-testid={`button-edit-${workOrder.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(workOrder.id)}
                data-testid={`button-delete-${workOrder.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderListItem = (workOrder: WorkOrder) => (
    <Card key={workOrder.id} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{workOrder.customerName}</h3>
              <p className="text-sm text-gray-600 truncate">{workOrder.itemDescription}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{getUserName(workOrder.assignedUserId)}</span>
              {getStatusBadge(workOrder.status || 'received')}
              <span className="text-xs text-gray-500">
                {new Date(workOrder.createdAt!).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(workOrder)}
            data-testid={`button-edit-${workOrder.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(workOrder.id)}
            data-testid={`button-delete-${workOrder.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="button-create-work-order">
                <Plus className="h-4 w-4" />
                New Work Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingWorkOrder ? "Edit Work Order" : "Create New Work Order"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter customer name" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telephone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter telephone number" {...field} data-testid="input-telephone" />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="itemDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the item" {...field} data-testid="input-item-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the issue we are fixing" {...field} data-testid="input-issue" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "received"} data-testid="select-status">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="testing">Testing</SelectItem>
                            <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Add any notes or updates" {...field} data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned User</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "null"} data-testid="select-assigned-user">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Unassigned</SelectItem>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-work-order"
                    >
                      {editingWorkOrder ? "Update" : "Create"} Work Order
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false);
                        setEditingWorkOrder(null);
                        form.reset();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <ViewOptions
          title="Work Orders"
          data={filteredWorkOrders}
          renderCard={renderCard}
          renderListItem={renderListItem}
          columns={['id', 'customerName', 'telephone', 'email', 'itemDescription', 'issue', 'status', 'assignedUserId', 'notes', 'createdAt', 'dueDate']}
          onExport={handleExport}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          onFilter={handleFilter}
          onSort={handleSort}
          showExport={true}
          showFilter={true}
          showSort={true}
        />
      </div>
    </div>
  );
}