import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Receipt, Users, Calendar, DollarSign, Minus, Calculator, CreditCard } from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import ViewOptions from '@/components/view-options';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, Client, Quotation, LineItem } from '@shared/schema';
import { format, addDays } from 'date-fns';
import DateTimeInput from '@/components/datetime-input';

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  total: z.number(),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  quotationId: z.string().optional(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
  subtotal: z.string(),
  gctAmount: z.string(),
  discountAmount: z.string(),
  discountPercentage: z.string(),
  total: z.string(),
  currency: z.string().default('JMD'),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  amountPaid: z.string().default('0.00'),
  balanceDue: z.string(),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function Invoices() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [applyGct, setApplyGct] = useState(false);
  const [createFromQuote, setCreateFromQuote] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations'],
  });

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      quotationId: '',
      invoiceDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      subtotal: '0.00',
      gctAmount: '0.00',
      discountAmount: '0.00',
      discountPercentage: '0.00',
      total: '0.00',
      currency: 'JMD',
      paymentTerms: 'Net 30',
      notes: '',
      status: 'draft',
      amountPaid: '0.00',
      balanceDue: '0.00',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      return await apiRequest('POST', '/api/invoices', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvoiceForm> }) => {
      return await apiRequest('PUT', `/api/invoices/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsDialogOpen(false);
      setEditingInvoice(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const calculateLineTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const calculateTotals = () => {
    const items = form.watch('items');
    const discountPercentage = parseFloat(form.watch('discountPercentage')) || 0;
    const discountAmount = parseFloat(form.watch('discountAmount')) || 0;

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Apply percentage discount first, then fixed amount discount
    const percentageDiscount = (subtotal * discountPercentage) / 100;
    const totalDiscount = percentageDiscount + discountAmount;
    const discountedSubtotal = subtotal - totalDiscount;
    
    const gctAmount = applyGct ? (discountedSubtotal * 0.15) : 0;
    const total = discountedSubtotal + gctAmount;
    const amountPaid = parseFloat(form.watch('amountPaid')) || 0;
    const balanceDue = total - amountPaid;

    form.setValue('subtotal', subtotal.toFixed(2));
    form.setValue('gctAmount', gctAmount.toFixed(2));
    form.setValue('total', total.toFixed(2));
    form.setValue('balanceDue', balanceDue.toFixed(2));
  };

  const handleQuotationSelect = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === quotationId);
    if (quotation) {
      form.setValue('clientId', quotation.clientId);
      const items = Array.isArray(quotation.items) ? quotation.items : [];
      form.setValue('items', items.length > 0 ? items : [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]);
      form.setValue('subtotal', quotation.subtotal);
      form.setValue('gctAmount', quotation.gctAmount || '0.00');
      form.setValue('discountAmount', quotation.discountAmount || '0.00');
      form.setValue('discountPercentage', quotation.discountPercentage || '0.00');
      form.setValue('total', quotation.total);
      form.setValue('notes', quotation.notes || '');
      
      if (quotation.gctAmount && parseFloat(quotation.gctAmount) > 0) {
        setApplyGct(true);
      }
    }
  };

  const handleSubmit = (data: InvoiceForm) => {
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    form.reset({
      clientId: invoice.clientId,
      quotationId: invoice.quotationId || '',
      invoiceDate: format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
      dueDate: format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
      items: items.length > 0 ? items : [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      subtotal: invoice.subtotal,
      gctAmount: invoice.gctAmount || '0.00',
      discountAmount: invoice.discountAmount || '0.00',
      discountPercentage: invoice.discountPercentage || '0.00',
      total: invoice.total,
      currency: invoice.currency,
      paymentTerms: invoice.paymentTerms || 'Net 30',
      notes: invoice.notes || '',
      status: invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
      amountPaid: (invoice as any).amountPaid || '0.00',
      balanceDue: (invoice as any).balanceDue || '0.00',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setCreateFromQuote(false);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleNewFromQuote = () => {
    setEditingInvoice(null);
    setCreateFromQuote(true);
    form.reset();
    setIsDialogOpen(true);
  };

  const addLineItem = () => {
    append({
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      calculateTotals();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      sent: 'default',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'destructive',
    } as const;

    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getQuotationNumber = (quotationId: string | null) => {
    if (!quotationId) return null;
    const quotation = quotations.find(q => q.id === quotationId);
    return quotation?.quoteNumber || null;
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const clientName = getClientName(invoice.clientId);
      return (
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aValue = sortBy === 'clientName' ? getClientName(a.clientId) : String(a[sortBy as keyof Invoice] || '');
      const bValue = sortBy === 'clientName' ? getClientName(b.clientId) : String(b[sortBy as keyof Invoice] || '');
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const exportData = () => {
    return filteredInvoices.map(invoice => ({
      'Invoice Number': invoice.invoiceNumber,
      'Client': getClientName(invoice.clientId),
      'Invoice Date': format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
      'Due Date': format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
      'Subtotal': invoice.subtotal,
      'Total': invoice.total,
      'Amount Paid': invoice.amountPaid,
      'Balance Due': invoice.balanceDue,
      'Currency': invoice.currency,
      'Status': invoice.status,
      'Created': format(new Date(invoice.createdAt!), 'yyyy-MM-dd'),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600">Create and manage customer invoices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleNewFromQuote} data-testid="button-new-from-quote">
              <Receipt className="h-4 w-4 mr-2" />
              From Quote
            </Button>
            <Button onClick={handleNewInvoice} data-testid="button-new-invoice">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        <ViewOptions
          view={view}
          onViewChange={setView}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search invoices..."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={[
            { value: 'invoiceNumber', label: 'Invoice Number' },
            { value: 'clientName', label: 'Client' },
            { value: 'invoiceDate', label: 'Invoice Date' },
            { value: 'dueDate', label: 'Due Date' },
            { value: 'total', label: 'Total' },
            { value: 'status', label: 'Status' },
          ]}
          onExport={exportData}
          exportFilename="invoices"
        />

        {view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <span className="truncate">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(invoice)}
                        data-testid={`button-edit-${invoice.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(invoice.id)}
                        data-testid={`button-delete-${invoice.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{getClientName(invoice.clientId)}</span>
                    </div>
                    {getQuotationNumber(invoice.quotationId) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Receipt className="h-4 w-4" />
                        <span>From Quote: {getQuotationNumber(invoice.quotationId)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">{invoice.currency} {invoice.total}</span>
                    </div>
                    {parseFloat((invoice as any).balanceDue || '0') > 0 && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <CreditCard className="h-4 w-4" />
                        <span>Balance: {invoice.currency} {(invoice as any).balanceDue}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {getStatusBadge(invoice.status)}
                      <span className="text-xs text-gray-500">
                        {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Invoice #</th>
                      <th className="text-left p-4 font-medium">Client</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Due Date</th>
                      <th className="text-left p-4 font-medium">Total</th>
                      <th className="text-left p-4 font-medium">Balance</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{invoice.invoiceNumber}</td>
                        <td className="p-4">{getClientName(invoice.clientId)}</td>
                        <td className="p-4">{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</td>
                        <td className="p-4">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                        <td className="p-4 font-semibold">{invoice.currency} {invoice.total}</td>
                        <td className="p-4">
                          <span className={parseFloat((invoice as any).balanceDue || '0') > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {invoice.currency} {(invoice as any).balanceDue || '0.00'}
                          </span>
                        </td>
                        <td className="p-4">{getStatusBadge(invoice.status)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(invoice)}
                              data-testid={`button-edit-${invoice.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(invoice.id)}
                              data-testid={`button-delete-${invoice.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No invoices match your search criteria.' : 'Get started by creating your first invoice.'}
              </p>
              {!searchTerm && (
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleNewFromQuote}>
                    <Receipt className="h-4 w-4 mr-2" />
                    From Quote
                  </Button>
                  <Button onClick={handleNewInvoice}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? 'Edit Invoice' : createFromQuote ? 'Create Invoice from Quotation' : 'Create New Invoice'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {createFromQuote && !editingInvoice && (
                    <FormField
                      control={form.control}
                      name="quotationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Quotation</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            handleQuotationSelect(value);
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-quotation">
                                <SelectValue placeholder="Select a quotation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {quotations.filter(q => q.status === 'accepted' || q.status === 'sent').map((quotation) => (
                                <SelectItem key={quotation.id} value={quotation.id}>
                                  {quotation.quoteNumber} - {getClientName(quotation.clientId)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={createFromQuote && form.watch('quotationId')}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DateTimeInput
                            value={field.value || ""}
                            onChange={field.onChange}
                            label="Invoice Date"
                            testId="input-invoice-date"
                            includeTime={true}
                            defaultIncludeTime={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DateTimeInput
                            value={field.value || ""}
                            onChange={field.onChange}
                            label="Due Date"
                            testId="input-due-date"
                            includeTime={true}
                            defaultIncludeTime={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Net 30" {...field} data-testid="input-payment-terms" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Line Items - Same as quotations */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-medium">Line Items</span>
                    <Button type="button" onClick={addLineItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-5">
                          <label className="text-sm font-medium">Description</label>
                          <Input
                            {...form.register(`items.${index}.description`)}
                            placeholder="Item description"
                            data-testid={`input-item-description-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            {...form.register(`items.${index}.quantity`, {
                              valueAsNumber: true,
                              onChange: () => {
                                const quantity = form.getValues(`items.${index}.quantity`);
                                const unitPrice = form.getValues(`items.${index}.unitPrice`);
                                const total = calculateLineTotal(quantity, unitPrice);
                                form.setValue(`items.${index}.total`, total);
                                calculateTotals();
                              }
                            })}
                            data-testid={`input-item-quantity-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium">Unit Price</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...form.register(`items.${index}.unitPrice`, {
                              valueAsNumber: true,
                              onChange: () => {
                                const quantity = form.getValues(`items.${index}.quantity`);
                                const unitPrice = form.getValues(`items.${index}.unitPrice`);
                                const total = calculateLineTotal(quantity, unitPrice);
                                form.setValue(`items.${index}.total`, total);
                                calculateTotals();
                              }
                            })}
                            data-testid={`input-item-unit-price-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium">Total</label>
                          <Input
                            type="number"
                            {...form.register(`items.${index}.total`, { valueAsNumber: true })}
                            readOnly
                            className="bg-gray-50"
                            data-testid={`input-item-total-${index}`}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            disabled={fields.length === 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment and totals section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="applyGct"
                        checked={applyGct}
                        onChange={(e) => {
                          setApplyGct(e.target.checked);
                          calculateTotals();
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="applyGct">Apply 15% GCT</label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="discountPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount %</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateTotals();
                                }}
                                data-testid="input-discount-percentage"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateTotals();
                                }}
                                data-testid="input-discount-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="amountPaid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Paid</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateTotals();
                              }}
                              data-testid="input-amount-paid"
                            />
                          </FormControl>
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
                            <Textarea
                              placeholder="Additional notes or terms"
                              {...field}
                              data-testid="input-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Invoice Summary
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>JMD {form.watch('subtotal')}</span>
                      </div>
                      {applyGct && (
                        <div className="flex justify-between">
                          <span>GCT (15%):</span>
                          <span>JMD {form.watch('gctAmount')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-JMD {(parseFloat(form.watch('discountAmount')) || 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>JMD {form.watch('total')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span>JMD {form.watch('amountPaid')}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Balance Due:</span>
                        <span className={parseFloat(form.watch('balanceDue')) > 0 ? 'text-red-600' : 'text-green-600'}>
                          JMD {form.watch('balanceDue')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-invoice"
                  >
                    {editingInvoice ? 'Update' : 'Create'} Invoice
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}