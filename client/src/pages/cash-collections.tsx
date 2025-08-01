import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, DollarSign, CreditCard, Eye, Edit, Trash2, Calendar, Filter } from "lucide-react";
import { insertCashCollectionSchema, type CashCollection, type InsertCashCollection } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type CashCollectionFormData = {
  amount: string;
  currency: string;
  type: string;
  reason: string;
  actionTaken: string;
  customerName?: string;
  receiptNumber?: string;
  notes?: string;
  collectionDate: string;
};

export default function CashCollections() {
  const [selectedCollection, setSelectedCollection] = useState<CashCollection | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user info
  const { data: user } = useQuery({ queryKey: ["/api/auth/me"] });
  const isAdmin = user?.role === "administrator";

  const { data: collections = [], isLoading } = useQuery<CashCollection[]>({
    queryKey: ["/api/cash-collections"],
  });

  const createMutation = useMutation({
    mutationFn: (data: CashCollectionFormData) => {
      const formattedData = {
        ...data,
        collectionDate: data.collectionDate, // Keep as string, let server transform
      };
      return apiRequest("/api/cash-collections", "POST", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-collections"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Cash collection recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record cash collection", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CashCollectionFormData }) => {
      const formattedData = {
        ...data,
        collectionDate: data.collectionDate, // Keep as string, let server transform
      };
      return apiRequest(`/api/cash-collections/${id}`, "PATCH", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-collections"] });
      setIsEditDialogOpen(false);
      setSelectedCollection(null);
      toast({ title: "Success", description: "Cash collection updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update cash collection", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/cash-collections/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-collections"] });
      toast({ title: "Success", description: "Cash collection deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete cash collection", variant: "destructive" });
    },
  });

  const form = useForm<CashCollectionFormData>({
    defaultValues: {
      amount: "",
      currency: "JMD",
      type: "cash",
      reason: "",
      actionTaken: "",
      customerName: "",
      receiptNumber: "",
      notes: "",
      collectionDate: new Date().toISOString().slice(0, 16),
    },
  });

  const editForm = useForm<CashCollectionFormData>({
    defaultValues: {
      amount: "",
      currency: "JMD",
      type: "cash",
      reason: "",
      actionTaken: "",
      customerName: "",
      receiptNumber: "",
      notes: "",
      collectionDate: new Date().toISOString().slice(0, 16),
    },
  });

  const onSubmit = (data: CashCollectionFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: CashCollectionFormData) => {
    if (selectedCollection) {
      updateMutation.mutate({ id: selectedCollection.id, data });
    }
  };

  const openEditDialog = (collection: CashCollection) => {
    setSelectedCollection(collection);
    editForm.reset({
      amount: collection.amount,
      currency: collection.currency,
      type: collection.type,
      reason: collection.reason,
      actionTaken: collection.actionTaken,
      customerName: collection.customerName || "",
      receiptNumber: collection.receiptNumber || "",
      notes: collection.notes || "",
      collectionDate: new Date(collection.collectionDate).toISOString().slice(0, 16),
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (collection: CashCollection) => {
    setSelectedCollection(collection);
    setIsViewDialogOpen(true);
  };

  // Calculate date-based totals
  const today = new Date();
  const past7Days = subDays(today, 7);
  const past30Days = subDays(today, 30);

  const getFilteredCollections = (dateFilter: 'today' | '7days' | '30days' | 'custom' | 'all') => {
    return collections.filter((c: CashCollection) => {
      const collectionDate = new Date(c.collectionDate);
      switch (dateFilter) {
        case 'today':
          return isWithinInterval(collectionDate, { start: startOfDay(today), end: endOfDay(today) });
        case '7days':
          return isWithinInterval(collectionDate, { start: startOfDay(past7Days), end: endOfDay(today) });
        case '30days':
          return isWithinInterval(collectionDate, { start: startOfDay(past30Days), end: endOfDay(today) });
        case 'custom':
          if (!startDate || !endDate) return false;
          return isWithinInterval(collectionDate, { 
            start: startOfDay(new Date(startDate)), 
            end: endOfDay(new Date(endDate)) 
          });
        default:
          return true;
      }
    });
  };

  const calculateTotals = (filterType: 'today' | '7days' | '30days' | 'custom' | 'all') => {
    const filtered = getFilteredCollections(filterType);
    const cash = filtered
      .filter((c: CashCollection) => c.type === 'cash' && c.currency === 'JMD')
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const cheques = filtered
      .filter((c: CashCollection) => c.type === 'cheque' && c.currency === 'JMD')
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    return { cash, cheques, total: cash + cheques };
  };

  const todayTotals = calculateTotals('today');
  const past7DaysTotals = calculateTotals('7days');
  const past30DaysTotals = calculateTotals('30days');
  const customTotals = startDate && endDate ? calculateTotals('custom') : { cash: 0, cheques: 0, total: 0 };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading cash collections...</div>;
  }

  return (
    <div className="container mx-auto p-6" data-testid="cash-collections-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cash & Cheques Collected</h1>
          <p className="text-gray-600 dark:text-gray-400">Track cash and cheque collections</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-collection">
              <Plus className="w-4 h-4 mr-2" />
              Record Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Cash/Cheque Collection</DialogTitle>
              <DialogDescription>
                Record a new cash or cheque collection entry
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="0.00" type="number" step="0.01" data-testid="input-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="JMD">JMD</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collectionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collection Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" data-testid="input-collection-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Collection</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Why was this money collected?" data-testid="textarea-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actionTaken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Taken</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="What was done with the money?" data-testid="textarea-action-taken" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Customer name" data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiptNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Receipt #" data-testid="input-receipt-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Any additional information" data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-collection">
                    {createMutation.isPending ? "Recording..." : "Record Collection"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Filter Controls */}
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Dialog open={isDateRangeDialogOpen} onOpenChange={setIsDateRangeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-date-filter">
                <Calendar className="w-4 h-4 mr-2" />
                Custom Date Range
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Date Range</DialogTitle>
                <DialogDescription>View collections for a specific date range</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDateRangeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDateRangeDialogOpen(false)} data-testid="button-apply-filter">
                  Apply Filter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="today-total">
              JMD ${todayTotals.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash: ${todayTotals.cash.toFixed(2)} | Cheques: ${todayTotals.cheques.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past 7 Days</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="week-total">
              JMD ${past7DaysTotals.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash: ${past7DaysTotals.cash.toFixed(2)} | Cheques: ${past7DaysTotals.cheques.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past 30 Days</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="month-total">
              JMD ${past30DaysTotals.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash: ${past30DaysTotals.cash.toFixed(2)} | Cheques: ${past30DaysTotals.cheques.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        {isAdmin && startDate && endDate && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom Range</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="custom-total">
                JMD ${customTotals.total.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Cash: ${customTotals.cash.toFixed(2)} | Cheques: ${customTotals.cheques.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(startDate), "MMM dd")} - {format(new Date(endDate), "MMM dd, yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collection History</CardTitle>
          <CardDescription>All recorded cash and cheque collections</CardDescription>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No collections recorded yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Click "Record Collection" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Reason</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((collection: CashCollection) => (
                    <tr key={collection.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`collection-row-${collection.id}`}>
                      <td className="p-2" data-testid={`collection-date-${collection.id}`}>
                        {format(new Date(collection.collectionDate), "MMM dd, yyyy h:mm a")}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          collection.type === 'cash' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`} data-testid={`collection-type-${collection.id}`}>
                          {collection.type}
                        </span>
                      </td>
                      <td className="p-2 font-medium" data-testid={`collection-amount-${collection.id}`}>
                        {collection.currency} ${parseFloat(collection.amount).toFixed(2)}
                      </td>
                      <td className="p-2 max-w-xs truncate" data-testid={`collection-reason-${collection.id}`}>
                        {collection.reason}
                      </td>
                      <td className="p-2" data-testid={`collection-customer-${collection.id}`}>
                        {collection.customerName || "N/A"}
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDialog(collection)}
                            data-testid={`button-view-${collection.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(collection)}
                              data-testid={`button-edit-${collection.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-${collection.id}`}
                                >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this collection record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(collection.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Collection Details</DialogTitle>
          </DialogHeader>
          {selectedCollection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Amount</Label>
                  <p>{selectedCollection.currency} ${parseFloat(selectedCollection.amount).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="font-medium">Type</Label>
                  <p className="capitalize">{selectedCollection.type}</p>
                </div>
              </div>
              <div>
                <Label className="font-medium">Collection Date</Label>
                <p>{format(new Date(selectedCollection.collectionDate), "MMMM dd, yyyy 'at' h:mm a")}</p>
              </div>
              <div>
                <Label className="font-medium">Reason for Collection</Label>
                <p>{selectedCollection.reason}</p>
              </div>
              <div>
                <Label className="font-medium">Action Taken</Label>
                <p>{selectedCollection.actionTaken}</p>
              </div>
              {selectedCollection.customerName && (
                <div>
                  <Label className="font-medium">Customer Name</Label>
                  <p>{selectedCollection.customerName}</p>
                </div>
              )}
              {selectedCollection.receiptNumber && (
                <div>
                  <Label className="font-medium">Receipt Number</Label>
                  <p>{selectedCollection.receiptNumber}</p>
                </div>
              )}
              {selectedCollection.notes && (
                <div>
                  <Label className="font-medium">Notes</Label>
                  <p>{selectedCollection.notes}</p>
                </div>
              )}
              <div>
                <Label className="font-medium">Recorded</Label>
                <p>{format(new Date(selectedCollection.createdAt!), "MMMM dd, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0.00" type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="JMD">JMD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="collectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Collection</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Why was this money collected?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="actionTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Taken</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="What was done with the money?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Customer name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="receiptNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Number (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Receipt #" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any additional information" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Collection"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}