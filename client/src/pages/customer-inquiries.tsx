import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Package, Plus, Edit, Trash2, Calendar, UserIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import ViewOptions from "@/components/view-options";
import DateTimeInput from "@/components/datetime-input";
import type { CustomerInquiry, InsertCustomerInquiry } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CustomerInquiriesPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<CustomerInquiry | null>(null);
  const [formData, setFormData] = useState<Omit<InsertCustomerInquiry, "userId">>({
    customerName: "",
    telephoneNumber: "",
    itemInquiry: "",
    dueDate: undefined,
  });

  // View options state
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: inquiries = [], isLoading } = useQuery<CustomerInquiry[]>({
    queryKey: ["/api/customer-inquiries"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InsertCustomerInquiry, "userId">) => {
      const response = await fetch("/api/customer-inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create inquiry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-inquiries"] });
      setIsFormOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Customer inquiry created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer inquiry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<InsertCustomerInquiry, "userId"> }) => {
      const response = await fetch(`/api/customer-inquiries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update inquiry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-inquiries"] });
      setIsFormOpen(false);
      setEditingInquiry(null);
      resetForm();
      toast({
        title: "Success",
        description: "Customer inquiry updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer inquiry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customer-inquiries/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete inquiry");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-inquiries"] });
      toast({
        title: "Success",
        description: "Customer inquiry deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer inquiry",
        variant: "destructive",
      });
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const inquiry = inquiries.find(i => i.id === id);
      if (!inquiry) throw new Error("Inquiry not found");
      
      const response = await fetch(`/api/customer-inquiries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          customerName: inquiry.customerName,
          telephoneNumber: inquiry.telephoneNumber,
          itemInquiry: inquiry.itemInquiry,
          status: status,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-inquiries"] });
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customerName: "",
      telephoneNumber: "",
      itemInquiry: "",
      dueDate: undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInquiry) {
      updateMutation.mutate({ id: editingInquiry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (inquiry: CustomerInquiry) => {
    setEditingInquiry(inquiry);
    setFormData({
      customerName: inquiry.customerName,
      telephoneNumber: inquiry.telephoneNumber,
      itemInquiry: inquiry.itemInquiry,
      dueDate: inquiry.dueDate,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: string) => {
    statusChangeMutation.mutate({ id, status });
  };

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-yellow-100 text-yellow-800",
    "follow-up": "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };

  // Filter and sort inquiries
  const filteredInquiries = inquiries
    .filter(inquiry =>
      inquiry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.telephoneNumber.includes(searchTerm) ||
      inquiry.itemInquiry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inquiry.status || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'customerName':
          valueA = a.customerName.toLowerCase();
          valueB = b.customerName.toLowerCase();
          break;
        case 'status':
          valueA = a.status || '';
          valueB = b.status || '';
          break;
        case 'createdAt':
        default:
          valueA = new Date(a.createdAt || '');
          valueB = new Date(b.createdAt || '');
          break;
      }
      
      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

  const sortOptions = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'customerName', label: 'Customer Name' },
    { value: 'status', label: 'Status' },
  ];

  const handleExport = () => {
    return filteredInquiries.map(inquiry => ({
      customer_name: inquiry.customerName,
      telephone: inquiry.telephoneNumber,
      item_inquiry: inquiry.itemInquiry,
      status: inquiry.status,
      created_date: inquiry.createdAt ? format(new Date(inquiry.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
      due_date: inquiry.dueDate ? format(new Date(inquiry.dueDate), 'yyyy-MM-dd') : '',
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Phone className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Customer Product Inquiries</h1>
            </div>
            <p className="text-gray-600">
              Track and manage customer inquiries about products and services.
            </p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingInquiry(null); }} data-testid="add-inquiry-button">
                <Plus className="h-4 w-4 mr-2" />
                Add New Inquiry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingInquiry ? "Edit Customer Inquiry" : "Add New Customer Inquiry"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    required
                    data-testid="input-customer-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="telephoneNumber">Telephone Number</Label>
                  <Input
                    id="telephoneNumber"
                    value={formData.telephoneNumber}
                    onChange={(e) => setFormData({ ...formData, telephoneNumber: e.target.value })}
                    placeholder="Enter telephone number"
                    required
                    data-testid="input-telephone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="itemInquiry">Item/Product Inquiry</Label>
                  <Textarea
                    id="itemInquiry"
                    value={formData.itemInquiry}
                    onChange={(e) => setFormData({ ...formData, itemInquiry: e.target.value })}
                    placeholder="Describe what the customer is asking about"
                    required
                    rows={3}
                    data-testid="input-item-inquiry"
                  />
                </div>

                <div>
                  <DateTimeInput
                    value={formData.dueDate ? (typeof formData.dueDate === 'string' ? formData.dueDate : formData.dueDate.toISOString().slice(0, 16)) : ""}
                    onChange={(value) => setFormData({ ...formData, dueDate: value ? new Date(value) : undefined })}
                    label="Due Date"
                    testId="input-due-date"
                    includeTime={true}
                    defaultIncludeTime={false}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="submit-inquiry"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingInquiry
                      ? "Update Inquiry"
                      : "Create Inquiry"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Options */}
        <ViewOptions
          view={view}
          onViewChange={setView}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search inquiries..."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={sortOptions}
          onExport={handleExport}
          exportFilename="customer_inquiries"
        />

        {view === 'cards' ? (
          <div className="grid gap-6">
            {filteredInquiries.map((inquiry) => (
            <Card key={inquiry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Package className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900" data-testid={`inquiry-customer-${inquiry.id}`}>
                        {inquiry.customerName}
                      </h3>
                      <Badge className={statusColors[inquiry.status as keyof typeof statusColors]}>
                        {inquiry.status === "follow-up" ? "Follow-up" : inquiry.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span data-testid={`inquiry-phone-${inquiry.id}`}>{inquiry.telephoneNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{inquiry.createdAt ? format(new Date(inquiry.createdAt), "PPP") : "Unknown"}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Product Inquiry:</h4>
                      <p className="text-gray-700" data-testid={`inquiry-item-${inquiry.id}`}>
                        {inquiry.itemInquiry}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex space-x-2">
                        <Select onValueChange={(value) => handleStatusChange(inquiry.id, value)}>
                          <SelectTrigger className="w-full" data-testid={`select-status-${inquiry.id}`}>
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 sm:ml-4 sm:flex-row sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(inquiry)}
                      data-testid={`edit-inquiry-${inquiry.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          data-testid={`delete-inquiry-${inquiry.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Customer Inquiry</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this inquiry from {inquiry.customerName}?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(inquiry.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Inquiry
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Product Inquiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInquiries.map((inquiry) => (
                      <TableRow key={inquiry.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            <span data-testid={`list-customer-${inquiry.id}`}>
                              {inquiry.customerName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span data-testid={`list-phone-${inquiry.id}`}>
                              {inquiry.telephoneNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate" title={inquiry.itemInquiry} data-testid={`list-item-${inquiry.id}`}>
                            {inquiry.itemInquiry}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[inquiry.status as keyof typeof statusColors]}>
                            {inquiry.status === "follow-up" ? "Follow-up" : inquiry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              {inquiry.createdAt ? format(new Date(inquiry.createdAt), "MMM dd, yyyy") : "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Select onValueChange={(value) => handleStatusChange(inquiry.id, value)}>
                              <SelectTrigger className="w-32" data-testid={`list-status-${inquiry.id}`}>
                                <SelectValue placeholder="Change Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="follow-up">Follow-up</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(inquiry)}
                              data-testid={`list-edit-${inquiry.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  data-testid={`list-delete-${inquiry.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Customer Inquiry</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this inquiry from {inquiry.customerName}?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(inquiry.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Inquiry
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {filteredInquiries.length === 0 && inquiries.length > 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                No inquiries match your search criteria. Try adjusting your search terms.
              </p>
            </CardContent>
          </Card>
        )}

        {inquiries.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customer Inquiries</h3>
              <p className="text-gray-600 mb-4">
                No customer product inquiries have been recorded yet.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Inquiry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}