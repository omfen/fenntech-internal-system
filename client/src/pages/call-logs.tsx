import { useState } from "react";
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
import { Phone, Plus, Edit, Trash2, PhoneCall, PhoneOutgoing, Clock } from "lucide-react";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import ViewOptions from "@/components/view-options";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { insertCallLogSchema, type CallLog, type InsertCallLog, callTypeLevels, callPurposeLevels, callOutcomeLevels } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = insertCallLogSchema.extend({
  customerName: z.string().min(1, "Customer name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  callType: z.string().min(1, "Call type is required"),
  callPurpose: z.string().min(1, "Call purpose is required"),
  notes: z.string().optional(),
  duration: z.string().optional(),
  outcome: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CallLogsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCallLog, setEditingCallLog] = useState<CallLog | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View options state
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort options
  const sortOptions = [
    { value: 'customerName', label: 'Customer Name' },
    { value: 'callType', label: 'Call Type' },
    { value: 'callPurpose', label: 'Purpose' },
    { value: 'createdAt', label: 'Date Created' },
  ];

  // Export function
  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = callLogs.map((log: CallLog) => ({
      customer: log.customerName,
      phone: log.phoneNumber,
      type: log.callType,
      purpose: log.callPurpose,
      duration: log.duration || '',
      outcome: log.outcome || '',
      notes: log.notes || '',
      created: log.createdAt ? new Date(log.createdAt).toISOString().split('T')[0] : '',
    }));

    if (format === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `call_logs_${new Date().toISOString().split('T')[0]}.json`;
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
      link.download = `call_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      callType: "incoming",
      callPurpose: "inquiry",
      notes: "",
      duration: "",
      outcome: "answered",
    },
  });

  const { data: callLogs = [], isLoading } = useQuery<CallLog[]>({
    queryKey: ["/api/call-logs"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCallLog) => {
      return await apiRequest("POST", "/api/call-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-logs"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Call log created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create call log",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CallLog> }) => {
      return await apiRequest("PATCH", `/api/call-logs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-logs"] });
      setEditingCallLog(null);
      form.reset();
      toast({
        title: "Success",
        description: "Call log updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update call log",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/call-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-logs"] });
      toast({
        title: "Success",
        description: "Call log deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete call log",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (editingCallLog) {
      updateMutation.mutate({ id: editingCallLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (callLog: CallLog) => {
    setEditingCallLog(callLog);
    form.reset({
      customerName: callLog.customerName,
      phoneNumber: callLog.phoneNumber,
      callType: callLog.callType,
      callPurpose: callLog.callPurpose,
      notes: callLog.notes || "",
      duration: callLog.duration || "",
      outcome: callLog.outcome || "answered",
      assignedUserId: callLog.assignedUserId || undefined,
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this call log?")) {
      deleteMutation.mutate(id);
    }
  };

  const getCallTypeBadge = (type: string) => {
    switch (type) {
      case "incoming":
        return <Badge variant="outline" className="text-green-600 border-green-300"><PhoneCall className="h-3 w-3 mr-1" />Incoming</Badge>;
      case "outgoing":
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><PhoneOutgoing className="h-3 w-3 mr-1" />Outgoing</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "answered":
        return <Badge variant="outline" className="text-green-600 border-green-300">Answered</Badge>;
      case "voicemail":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Voicemail</Badge>;
      case "busy":
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Busy</Badge>;
      case "no_answer":
        return <Badge variant="outline" className="text-red-600 border-red-300">No Answer</Badge>;
      case "resolved":
        return <Badge variant="outline" className="text-green-600 border-green-300">Resolved</Badge>;
      case "follow_up_needed":
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Follow-up Needed</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId || userId === "unassigned") return "Unassigned";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  // Filter and sort call logs
  const filteredCallLogs = callLogs
    .filter((log: CallLog) =>
      log.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.phoneNumber.includes(searchTerm) ||
      log.callType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.callPurpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.outcome || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: CallLog, b: CallLog) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'customerName':
          valueA = a.customerName.toLowerCase();
          valueB = b.customerName.toLowerCase();
          break;
        case 'callType':
          valueA = a.callType;
          valueB = b.callType;
          break;
        case 'callPurpose':
          valueA = a.callPurpose;
          valueB = b.callPurpose;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Phone className="mr-3 h-6 w-6 text-blue-600" />
              Call Logs
            </h1>
            <p className="text-gray-600">Track incoming and outgoing customer calls</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setEditingCallLog(null);
                  form.reset();
                }}
                data-testid="button-create-call-log"
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCallLog ? "Edit Call Log" : "Log New Call"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Customer name" {...field} data-testid="input-customer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} data-testid="input-phone-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="callType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-call-type">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select call type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {callTypeLevels.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type === "incoming" ? "Incoming" : "Outgoing"}
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
                      name="callPurpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call Purpose</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-call-purpose">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select purpose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {callPurposeLevels.map((purpose) => (
                                <SelectItem key={purpose} value={purpose}>
                                  {purpose.charAt(0).toUpperCase() + purpose.slice(1).replace('_', ' ')}
                                </SelectItem>
                              ))}
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
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (MM:SS)</FormLabel>
                          <FormControl>
                            <Input placeholder="05:30" {...field} data-testid="input-duration" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="outcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outcome</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-outcome">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select outcome" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {callOutcomeLevels.map((outcome) => (
                                <SelectItem key={outcome} value={outcome}>
                                  {outcome.replace('_', ' ').split(' ').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assignedUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""} data-testid="select-assigned-user">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((user) => (
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

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Call notes and details" {...field} data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false);
                        setEditingCallLog(null);
                        form.reset();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingCallLog
                        ? "Update"
                        : "Log Call"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Options */}
        <ViewOptions
          view={view}
          onViewChange={setView}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search call logs..."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={sortOptions}
          onExport={handleExport}
          exportFilename="call_logs"
        />

        {/* Call Logs List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading call logs...</p>
          </div>
        ) : view === 'cards' ? (
          <div className="grid gap-4">
            {callLogs.map((callLog: CallLog) => (
              <Card key={callLog.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{callLog.customerName}</h3>
                      {getCallTypeBadge(callLog.callType)}
                      {getOutcomeBadge(callLog.outcome || "answered")}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(callLog)}
                        data-testid={`button-edit-${callLog.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(callLog.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${callLog.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone Number</p>
                      <p className="text-sm">{callLog.phoneNumber}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Purpose</p>
                      <p className="text-sm">{callLog.callPurpose.replace('_', ' ')}</p>
                    </div>

                    {callLog.duration && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Duration</p>
                        <p className="text-sm flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {callLog.duration}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Assigned To</p>
                      <p className="text-sm">{getUserName(callLog.assignedUserId)}</p>
                    </div>
                  </div>

                  {callLog.notes && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600">Notes</p>
                      <p className="text-sm">{callLog.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t flex justify-between text-xs text-gray-500">
                    <span>Created: {new Date(callLog.createdAt!).toLocaleDateString()}</span>
                    {callLog.followUpDate && (
                      <span>Follow-up: {new Date(callLog.followUpDate).toLocaleDateString()}</span>
                    )}
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
                      <TableHead>Type</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCallLogs.map((callLog: any) => (
                      <TableRow key={callLog.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{callLog.customerName}</TableCell>
                        <TableCell>{callLog.phoneNumber}</TableCell>
                        <TableCell>{getCallTypeBadge(callLog.callType)}</TableCell>
                        <TableCell>{callLog.callPurpose.replace('_', ' ')}</TableCell>
                        <TableCell>{getOutcomeBadge(callLog.outcome || "answered")}</TableCell>
                        <TableCell>
                          {callLog.duration && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {callLog.duration}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getUserName(callLog.assignedUserId)}</TableCell>
                        <TableCell>
                          {callLog.createdAt ? new Date(callLog.createdAt).toLocaleDateString() : "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(callLog)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(callLog.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {filteredCallLogs.length === 0 && callLogs.length > 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">No call logs match your search criteria.</p>
            </CardContent>
          </Card>
        )}

        {callLogs.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No call logs yet</h3>
              <p className="text-gray-600 mb-4">Start tracking your customer calls.</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log First Call
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}