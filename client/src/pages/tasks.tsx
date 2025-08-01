import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle, Clock, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema, type Task, type InsertTask } from "@shared/task-schema";
import { type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import ViewOptions from "@/components/view-options";
import DateTimeInput from "@/components/datetime-input";

// Form interface that matches what react-hook-form expects
interface TaskFormData {
  title: string;
  description?: string;
  urgencyLevel: "low" | "medium" | "high" | "urgent";
  priority: "low" | "normal" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignedUserId?: string;
  dueDate?: string;
  tags: string[];
  notes?: string;
}

const urgencyColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-purple-100 text-purple-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // View options state
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort options
  const sortOptions = [
    { value: 'title', label: 'Title' },
    { value: 'urgencyLevel', label: 'Urgency Level' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'createdAt', label: 'Date Created' },
  ];

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      urgencyLevel: "medium",
      priority: "normal",
      status: "pending",
      assignedUserId: "unassigned",
      tags: [],
      notes: "",
      dueDate: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/tasks/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    // Transform form data to API format
    const apiData: any = {
      ...data,
      assignedUserId: data.assignedUserId === "unassigned" ? undefined : data.assignedUserId,
      dueDate: data.dueDate || undefined,
    };
    if (editingTask) {
      updateTaskMutation.mutate({ 
        id: editingTask.id, 
        data: { ...apiData }
      });
    } else {
      createTaskMutation.mutate(apiData);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      urgencyLevel: task.urgencyLevel as any,
      priority: task.priority as any,
      status: task.status as any,
      assignedUserId: task.assignedUserId || "unassigned",
      dueDate: task.dueDate ? (task.dueDate.includes('T') ? task.dueDate.slice(0, 16) : task.dueDate.slice(0, 10)) : "",
      tags: task.tags || [],
      notes: task.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    console.log('Changing task status:', { taskId, newStatus });
    updateTaskMutation.mutate({ 
      id: taskId, 
      data: { 
        status: newStatus
      }
    }, {
      onSuccess: (data) => {
        console.log('Task status updated successfully:', data);
        toast({
          title: "Status Updated",
          description: `Task status changed to ${newStatus}`,
        });
      },
      onError: (error) => {
        console.error('Failed to update task status:', error);
        toast({
          title: "Error",
          description: "Failed to update task status",
          variant: "destructive",
        });
      }
    });
  };

  const handleAssignment = (taskId: string, userId: string) => {
    const assignedUser = users.find((u) => u.id === userId);
    updateTaskMutation.mutate({ 
      id: taskId, 
      data: { 
        assignedUserId: userId === "unassigned" ? null : userId,
        assignedUserName: userId === "unassigned" ? null : (assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "")
      }
    });
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task: Task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.urgencyLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignedUserName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: Task, b: Task) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'urgencyLevel':
          const urgencyOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          valueA = urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder];
          valueB = urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder];
          break;
        case 'priority':
          const priorityOrder = { low: 1, normal: 2, high: 3, critical: 4 };
          valueA = priorityOrder[a.priority as keyof typeof priorityOrder];
          valueB = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'dueDate':
          valueA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
          valueB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
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
      <>
        <Header />
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-lg">Loading tasks...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Navigation />
      <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingTask(null);
                form.reset();
              }}
              data-testid="button-create-task"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-task-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-task-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="urgencyLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-urgency-level">
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "unassigned"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assigned-user">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-task-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    data-testid="button-save-task"
                  >
                    {editingTask ? "Update Task" : "Create Task"}
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
        searchPlaceholder="Search tasks..."
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        sortOptions={sortOptions}
        onExport={() => filteredTasks.map((task: Task) => ({
          title: task.title,
          description: task.description || '',
          urgency: task.urgencyLevel,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignedUserName || 'Unassigned',
          dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
          created: task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd') : '',
          notes: task.notes || '',
        }))}
        exportFilename="tasks"
      />

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-500 mb-2">No tasks yet</p>
            <p className="text-sm text-gray-400 mb-4">Create your first task to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-task">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : view === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow" data-testid={`card-task-${task.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(task)}
                      data-testid={`button-edit-${task.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      data-testid={`button-delete-${task.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={urgencyColors[task.urgencyLevel as keyof typeof urgencyColors]}>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {task.urgencyLevel}
                  </Badge>
                  <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    {task.priority}
                  </Badge>
                  <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                    {task.status === "in_progress" ? "In Progress" : task.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  {task.assignedUserName && (
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Assigned to: {task.assignedUserName}</span>
                    </div>
                  )}
                  
                  {task.dueDate && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Due: {format(new Date(task.dueDate), task.dueDate.includes('T') ? "MMM dd, yyyy 'at' h:mm a" : "MMM dd, yyyy")}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Created: {task.createdAt ? format(task.createdAt, "MMM dd, yyyy") : "Unknown"}</span>
                  </div>
                  
                  {task.completedAt && (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span>Completed: {format(task.completedAt, "MMM dd, yyyy")}</span>
                    </div>
                  )}
                </div>

                {task.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                    <strong>Notes:</strong> {task.notes}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex space-x-2">
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => handleStatusChange(task.id, value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-status-${task.id}`}>
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Select 
                      value={task.assignedUserId || "unassigned"} 
                      onValueChange={(value) => handleAssignment(task.id, value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-assign-${task.id}`}>
                        <SelectValue placeholder="Assign To" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <TableHead>Task</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task: Task) => (
                    <TableRow key={task.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {task.description.length > 100 
                                ? `${task.description.substring(0, 100)}...` 
                                : task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={urgencyColors[task.urgencyLevel as keyof typeof urgencyColors]}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {task.urgencyLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Select 
                            value={task.status} 
                            onValueChange={(value) => handleStatusChange(task.id, value)}
                          >
                            <SelectTrigger className="w-full" data-testid={`select-status-${task.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Select 
                            value={task.assignedUserId || "unassigned"} 
                            onValueChange={(value) => handleAssignment(task.id, value)}
                          >
                            <SelectTrigger className="w-full" data-testid={`select-assign-${task.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.firstName} {u.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div className="text-sm">
                            {format(new Date(task.dueDate), task.dueDate.includes('T') ? "MMM dd, yyyy 'at' h:mm a" : "MMM dd, yyyy")}
                          </div>
                        ) : (
                          <span className="text-gray-400">No due date</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex space-x-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(task)}
                            data-testid={`button-edit-${task.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            data-testid={`button-delete-${task.id}`}
                          >
                            <X className="h-4 w-4" />
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
      </div>
    </>
  );
}