import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { FileText, Phone, Mail, Plus, Edit, Trash2, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import ViewOptions from "@/components/view-options";
import type { QuotationRequest, InsertQuotationRequest } from "@shared/schema";
import { urgencyLevels } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const urgencyColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  quoted: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "quoted", label: "Quoted" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "completed", label: "Completed" },
];

export default function QuotationRequestsPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<QuotationRequest | null>(null);
  const [formData, setFormData] = useState<Omit<InsertQuotationRequest, "userId">>({
    customerName: "",
    telephoneNumber: "",
    emailAddress: "",
    quoteDescription: "",
    urgency: "medium",
  });

  // View options state
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort options
  const sortOptions = [
    { value: 'customerName', label: 'Customer Name' },
    { value: 'urgency', label: 'Urgency' },
    { value: 'status', label: 'Status' },
    { value: 'createdAt', label: 'Date Created' },
  ];

  // Export function
  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = filteredRequests.map(request => ({
      customer: request.customerName,
      phone: request.telephoneNumber,
      email: request.emailAddress,
      description: request.quoteDescription,
      urgency: request.urgency,
      status: request.status || '',
      created: request.createdAt ? format(new Date(request.createdAt), "yyyy-MM-dd") : '',
    }));

    if (format === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation_requests_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
      ].join('\n');
      
      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation_requests_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const { data: requests = [], isLoading } = useQuery<QuotationRequest[]>({
    queryKey: ["/api/quotation-requests"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InsertQuotationRequest, "userId">) => {
      const response = await fetch("/api/quotation-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create quotation request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      setIsFormOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Quotation request created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quotation request",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<InsertQuotationRequest, "userId"> }) => {
      const response = await fetch(`/api/quotation-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update quotation request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      setIsFormOpen(false);
      setEditingRequest(null);
      resetForm();
      toast({
        title: "Success",
        description: "Quotation request updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quotation request",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/quotation-requests/${id}`, {
        method: "PUT", 
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/quotation-requests/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete quotation request");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      toast({
        title: "Success",
        description: "Quotation request deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quotation request",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customerName: "",
      telephoneNumber: "",
      emailAddress: "",
      quoteDescription: "",
      urgency: "medium",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRequest) {
      updateMutation.mutate({ id: editingRequest.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (request: QuotationRequest) => {
    setEditingRequest(request);
    setFormData({
      customerName: request.customerName,
      telephoneNumber: request.telephoneNumber,
      emailAddress: request.emailAddress,
      quoteDescription: request.quoteDescription,
      urgency: request.urgency,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  // Filter and sort requests
  const filteredRequests = requests
    .filter(request =>
      request.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.telephoneNumber.includes(searchTerm) ||
      request.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.quoteDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.urgency.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'customerName':
          valueA = a.customerName.toLowerCase();
          valueB = b.customerName.toLowerCase();
          break;
        case 'urgency':
          valueA = a.urgency;
          valueB = b.urgency;
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
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Request for Quotation</h1>
            </div>
            <p className="text-gray-600">
              Manage customer quotation requests and track their urgency levels.
            </p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingRequest(null); }} data-testid="add-quotation-button">
                <Plus className="h-4 w-4 mr-2" />
                Add New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingRequest ? "Edit Quotation Request" : "Add New Quotation Request"}
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
                  <Label htmlFor="emailAddress">Email Address</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                    placeholder="Enter email address"
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select 
                    value={formData.urgency} 
                    onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                  >
                    <SelectTrigger data-testid="select-urgency">
                      <SelectValue placeholder="Select urgency level" />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quoteDescription">Quote Description</Label>
                  <Textarea
                    id="quoteDescription"
                    value={formData.quoteDescription}
                    onChange={(e) => setFormData({ ...formData, quoteDescription: e.target.value })}
                    placeholder="Describe what the customer needs a quote for"
                    required
                    rows={3}
                    data-testid="input-quote-description"
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
                    data-testid="submit-quotation"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingRequest
                      ? "Update Request"
                      : "Create Request"}
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
          searchPlaceholder="Search quotation requests..."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={sortOptions}
          onExport={handleExport}
          exportFilename="quotation_requests"
        />

        {view === 'cards' ? (
          <div className="grid gap-6">
            {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900" data-testid={`request-customer-${request.id}`}>
                          {request.customerName}
                        </h3>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className={urgencyColors[request.urgency as keyof typeof urgencyColors]}>
                          {request.urgency === "urgent" && <AlertCircle className="h-3 w-3 mr-1" />}
                          {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                        </Badge>
                        <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                          {statusOptions.find(s => s.value === request.status)?.label || request.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span data-testid={`request-phone-${request.id}`}>{request.telephoneNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span data-testid={`request-email-${request.id}`}>{request.emailAddress}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(request.createdAt!), "PPP")}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Quote Requirements:</h4>
                      <p className="text-gray-700" data-testid={`request-description-${request.id}`}>
                        {request.quoteDescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 sm:ml-4">
                    <Select onValueChange={(value) => handleStatusChange(request.id, value)}>
                      <SelectTrigger className="w-full" data-testid={`select-status-${request.id}`}>
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(request)}
                        data-testid={`edit-request-${request.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                          variant="destructive"
                          size="sm"
                          data-testid={`delete-request-${request.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Quotation Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this quotation request from {request.customerName}?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(request.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{request.customerName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span className="text-sm">{request.telephoneNumber}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3 text-gray-500" />
                              <span className="text-sm">{request.emailAddress}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate" title={request.quoteDescription}>
                            {request.quoteDescription}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={urgencyColors[request.urgency as keyof typeof urgencyColors]}>
                            {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                            {statusOptions.find(s => s.value === request.status)?.label || request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.createdAt ? format(new Date(request.createdAt), "MMM dd, yyyy") : "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Select onValueChange={(value) => handleStatusChange(request.id, value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Change Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(request)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quotation Request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this quotation request from {request.customerName}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(request.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Request
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

        {filteredRequests.length === 0 && requests.length > 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                No requests match your search criteria. Try adjusting your search terms.
              </p>
            </CardContent>
          </Card>
        )}

        {requests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotation Requests</h3>
              <p className="text-gray-600 mb-4">
                No customer quotation requests have been recorded yet.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Request
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}