import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, FileText, Users, Calendar, DollarSign, Minus, Calculator } from 'lucide-react';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import ViewOptions from '@/components/view-options';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Quotation, Client, LineItem } from '@shared/schema';
import { format, addDays } from 'date-fns';

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  total: z.number(),
});

const quotationSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  quoteDate: z.string(),
  expirationDate: z.string(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
  subtotal: z.string(),
  gctAmount: z.string(),
  discountAmount: z.string(),
  discountPercentage: z.string(),
  total: z.string(),
  currency: z.string().default('JMD'),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
});

type QuotationForm = z.infer<typeof quotationSchema>;

export default function Quotations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('quoteDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [applyGct, setApplyGct] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations'],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const form = useForm<QuotationForm>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      clientId: '',
      quoteDate: format(new Date(), 'yyyy-MM-dd'),
      expirationDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      subtotal: '0.00',
      gctAmount: '0.00',
      discountAmount: '0.00',
      discountPercentage: '0.00',
      total: '0.00',
      currency: 'JMD',
      notes: '',
      status: 'draft',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuotationForm) => {
      return await apiRequest('POST', '/api/quotations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Quotation created successfully',
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuotationForm> }) => {
      return await apiRequest('PUT', `/api/quotations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      setIsDialogOpen(false);
      setEditingQuotation(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Quotation updated successfully',
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
      return await apiRequest('DELETE', `/api/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      toast({
        title: 'Success',
        description: 'Quotation deleted successfully',
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

    form.setValue('subtotal', subtotal.toFixed(2));
    form.setValue('gctAmount', gctAmount.toFixed(2));
    form.setValue('total', total.toFixed(2));
  };

  const handleSubmit = (data: QuotationForm) => {
    if (editingQuotation) {
      updateMutation.mutate({ id: editingQuotation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    const items = Array.isArray(quotation.items) ? quotation.items : [];
    form.reset({
      clientId: quotation.clientId,
      quoteDate: format(new Date(quotation.quoteDate), 'yyyy-MM-dd'),
      expirationDate: format(new Date(quotation.expirationDate), 'yyyy-MM-dd'),
      items: items.length > 0 ? items : [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      subtotal: quotation.subtotal,
      gctAmount: quotation.gctAmount || '0.00',
      discountAmount: quotation.discountAmount || '0.00',
      discountPercentage: quotation.discountPercentage || '0.00',
      total: quotation.total,
      currency: quotation.currency,
      notes: quotation.notes || '',
      status: quotation.status as 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewQuotation = () => {
    setEditingQuotation(null);
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
      accepted: 'default',
      rejected: 'destructive',
      expired: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const filteredQuotations = quotations
    .filter(quotation => {
      const clientName = getClientName(quotation.clientId);
      return (
        quotation.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aValue = sortBy === 'clientName' ? getClientName(a.clientId) : String(a[sortBy as keyof Quotation] || '');
      const bValue = sortBy === 'clientName' ? getClientName(b.clientId) : String(b[sortBy as keyof Quotation] || '');
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const exportData = () => {
    return filteredQuotations.map(quotation => ({
      'Quote Number': quotation.quoteNumber,
      'Client': getClientName(quotation.clientId),
      'Quote Date': format(new Date(quotation.quoteDate), 'yyyy-MM-dd'),
      'Expiration Date': format(new Date(quotation.expirationDate), 'yyyy-MM-dd'),
      'Subtotal': quotation.subtotal,
      'Total': quotation.total,
      'Currency': quotation.currency,
      'Status': quotation.status,
      'Created': format(new Date(quotation.createdAt!), 'yyyy-MM-dd'),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-600">Create and manage customer quotations</p>
          </div>
          <Button onClick={handleNewQuotation} data-testid="button-new-quotation">
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        <ViewOptions
          view={view}
          onViewChange={setView}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search quotations..."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={[
            { value: 'quoteNumber', label: 'Quote Number' },
            { value: 'clientName', label: 'Client' },
            { value: 'quoteDate', label: 'Quote Date' },
            { value: 'total', label: 'Total' },
            { value: 'status', label: 'Status' },
          ]}
          onExport={exportData}
          exportFilename="quotations"
        />

        {view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuotations.map((quotation) => (
              <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="truncate">{quotation.quoteNumber}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(quotation)}
                        data-testid={`button-edit-${quotation.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(quotation.id)}
                        data-testid={`button-delete-${quotation.id}`}
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
                      <span>{getClientName(quotation.clientId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Valid until {format(new Date(quotation.expirationDate), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">{quotation.currency} {quotation.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(quotation.status)}
                      <span className="text-xs text-gray-500">
                        {format(new Date(quotation.quoteDate), 'MMM d, yyyy')}
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
                      <th className="text-left p-4 font-medium">Quote #</th>
                      <th className="text-left p-4 font-medium">Client</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Expires</th>
                      <th className="text-left p-4 font-medium">Total</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotations.map((quotation) => (
                      <tr key={quotation.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{quotation.quoteNumber}</td>
                        <td className="p-4">{getClientName(quotation.clientId)}</td>
                        <td className="p-4">{format(new Date(quotation.quoteDate), 'MMM d, yyyy')}</td>
                        <td className="p-4">{format(new Date(quotation.expirationDate), 'MMM d, yyyy')}</td>
                        <td className="p-4 font-semibold">{quotation.currency} {quotation.total}</td>
                        <td className="p-4">{getStatusBadge(quotation.status)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(quotation)}
                              data-testid={`button-edit-${quotation.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(quotation.id)}
                              data-testid={`button-delete-${quotation.id}`}
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

        {filteredQuotations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No quotations match your search criteria.' : 'Get started by creating your first quotation.'}
              </p>
              {!searchTerm && (
                <Button onClick={handleNewQuotation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quotation
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quoteDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quote Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-quote-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-expiration-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-medium">Line Items</Label>
                    <Button type="button" onClick={addLineItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-5">
                          <Label>Description</Label>
                          <Input
                            {...form.register(`items.${index}.description`)}
                            placeholder="Item description"
                            data-testid={`input-item-description-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Quantity</Label>
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
                          <Label>Unit Price</Label>
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
                          <Label>Total</Label>
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

                {/* Totals and Discounts */}
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
                      <Label htmlFor="applyGct">Apply 15% GCT</Label>
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
                      Quote Summary
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
                    data-testid="button-save-quotation"
                  >
                    {editingQuotation ? 'Update' : 'Create'} Quotation
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