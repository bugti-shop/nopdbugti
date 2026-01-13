import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Trash2, Calendar, MoreVertical, Target, Zap, Brain, Sparkles, Timer, Focus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TodoItem, Folder } from '@/types/note';
import { TodoLayout } from './TodoLayout';
import { TaskDateTimePage } from '@/components/TaskDateTimePage';
import { TaskInputSheet } from '@/components/TaskInputSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  linkedTaskIds?: string[];
  linkedCategoryId?: string;
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  target: Target,
  zap: Zap,
  brain: Brain,
  sparkles: Sparkles,
  timer: Timer,
  focus: Focus,
};

const CustomToolDetail = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const [tool, setTool] = useState<CustomTool | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<TodoItem[]>([]);
  const [allTasks, setAllTasks] = useState<TodoItem[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [taskToReschedule, setTaskToReschedule] = useState<TodoItem | null>(null);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [quickTaskText, setQuickTaskText] = useState('');

  useEffect(() => {
    // Load custom tool
    const savedTools = localStorage.getItem('customProductivityTools');
    if (savedTools && toolId) {
      const tools: CustomTool[] = JSON.parse(savedTools);
      const foundTool = tools.find(t => t.id === toolId);
      setTool(foundTool || null);
    }

    // Load all tasks
    const savedTasks = localStorage.getItem('todoItems');
    if (savedTasks) {
      const tasks: TodoItem[] = JSON.parse(savedTasks).map((t: any) => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        reminderTime: t.reminderTime ? new Date(t.reminderTime) : undefined,
      }));
      setAllTasks(tasks);
    }

    // Load folders
    const savedFolders = localStorage.getItem('todoFolders');
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
    }
  }, [toolId]);

  useEffect(() => {
    if (tool && allTasks.length > 0) {
      // Filter tasks linked to this tool
      const linked = allTasks.filter(task => 
        tool.linkedTaskIds?.includes(task.id) || 
        (tool.linkedCategoryId && task.categoryId === tool.linkedCategoryId)
      );
      setLinkedTasks(linked);
    }
  }, [tool, allTasks]);

  const handleCompleteTask = (taskId: string) => {
    const updatedTasks = allTasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setAllTasks(updatedTasks);
    localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('todoItemsUpdated'));
    
    const task = updatedTasks.find(t => t.id === taskId);
    toast.success(task?.completed ? 'Task completed' : 'Task uncompleted');
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    
    const updatedTasks = allTasks.filter(task => task.id !== taskToDelete);
    setAllTasks(updatedTasks);
    localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('todoItemsUpdated'));
    
    // Also remove from tool's linked tasks
    if (tool) {
      const updatedTools = JSON.parse(localStorage.getItem('customProductivityTools') || '[]');
      const updatedTool = updatedTools.map((t: CustomTool) => {
        if (t.id === tool.id) {
          return {
            ...t,
            linkedTaskIds: t.linkedTaskIds?.filter(id => id !== taskToDelete)
          };
        }
        return t;
      });
      localStorage.setItem('customProductivityTools', JSON.stringify(updatedTool));
    }
    
    setShowDeleteDialog(false);
    setTaskToDelete(null);
    toast.success('Task deleted');
  };

  const handleRescheduleTask = (task: TodoItem) => {
    setTaskToReschedule(task);
    setShowDatePicker(true);
  };

  const handleSaveReschedule = (updatedTask: Partial<TodoItem>) => {
    if (!taskToReschedule) return;
    
    const updatedTasks = allTasks.map(task => 
      task.id === taskToReschedule.id ? { ...task, ...updatedTask } : task
    );
    setAllTasks(updatedTasks);
    localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('todoItemsUpdated'));
    
    setShowDatePicker(false);
    setTaskToReschedule(null);
    toast.success('Task rescheduled');
  };

  const handleUnlinkTask = (taskId: string) => {
    if (!tool) return;
    
    const updatedTools = JSON.parse(localStorage.getItem('customProductivityTools') || '[]');
    const updated = updatedTools.map((t: CustomTool) => {
      if (t.id === tool.id) {
        return {
          ...t,
          linkedTaskIds: t.linkedTaskIds?.filter(id => id !== taskId)
        };
      }
      return t;
    });
    localStorage.setItem('customProductivityTools', JSON.stringify(updated));
    
    // Update local state
    setTool(prev => prev ? {
      ...prev,
      linkedTaskIds: prev.linkedTaskIds?.filter(id => id !== taskId)
    } : null);
    
    toast.success('Task unlinked from tool');
  };

  const handleAddTask = (taskData: Omit<TodoItem, 'id' | 'completed'>) => {
    if (!tool) return;
    
    const newTask: TodoItem = {
      ...taskData,
      id: Date.now().toString(),
      completed: false,
    };
    
    // Add to all tasks
    const updatedTasks = [...allTasks, newTask];
    setAllTasks(updatedTasks);
    localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('todoItemsUpdated'));
    
    // Link task to this tool
    const updatedTools = JSON.parse(localStorage.getItem('customProductivityTools') || '[]');
    const updated = updatedTools.map((t: CustomTool) => {
      if (t.id === tool.id) {
        return {
          ...t,
          linkedTaskIds: [...(t.linkedTaskIds || []), newTask.id]
        };
      }
      return t;
    });
    localStorage.setItem('customProductivityTools', JSON.stringify(updated));
    
    // Update local tool state
    setTool(prev => prev ? {
      ...prev,
      linkedTaskIds: [...(prev.linkedTaskIds || []), newTask.id]
    } : null);
    
    setShowTaskInput(false);
    toast.success('Task added and linked to tool');
  };

  const handleQuickAddTask = () => {
    if (!quickTaskText.trim() || !tool) return;
    
    const newTask: TodoItem = {
      id: Date.now().toString(),
      text: quickTaskText.trim(),
      completed: false,
    };
    
    // Add to all tasks
    const updatedTasks = [...allTasks, newTask];
    setAllTasks(updatedTasks);
    localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('todoItemsUpdated'));
    
    // Link task to this tool
    const updatedTools = JSON.parse(localStorage.getItem('customProductivityTools') || '[]');
    const updated = updatedTools.map((t: CustomTool) => {
      if (t.id === tool.id) {
        return {
          ...t,
          linkedTaskIds: [...(t.linkedTaskIds || []), newTask.id]
        };
      }
      return t;
    });
    localStorage.setItem('customProductivityTools', JSON.stringify(updated));
    
    // Update local tool state
    setTool(prev => prev ? {
      ...prev,
      linkedTaskIds: [...(prev.linkedTaskIds || []), newTask.id]
    } : null);
    
    setQuickTaskText('');
    toast.success('Task added');
  };

  const handleCreateFolder = (name: string, color: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      color,
      isDefault: false,
      createdAt: new Date(),
    };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('todoFolders', JSON.stringify(updatedFolders));
  };

  const IconComponent = tool ? TOOL_ICONS[tool.icon] || Target : Target;

  if (!tool) {
    return (
      <TodoLayout title="Tool Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">This tool doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/todo/settings')}>Back to Settings</Button>
        </div>
      </TodoLayout>
    );
  }

  const completedTasks = linkedTasks.filter(t => t.completed);
  const pendingTasks = linkedTasks.filter(t => !t.completed);

  return (
    <TodoLayout title={tool.name}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/todo/settings')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="p-2 rounded-lg" 
                style={{ backgroundColor: `${tool.color}20` }}
              >
                <IconComponent className="h-6 w-6" style={{ color: tool.color }} />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{tool.name}</h1>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{linkedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{pendingTasks.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Quick Add Task */}
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Quick add task..."
              value={quickTaskText}
              onChange={(e) => setQuickTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuickAddTask();
                }
              }}
              className="flex-1"
            />
            <Button 
              size="icon" 
              onClick={handleQuickAddTask}
              disabled={!quickTaskText.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTaskInput(true)}
            >
              More Options
            </Button>
          </div>
        </div>

        {/* Tasks List */}
        <ScrollArea className="flex-1 px-4 pb-24">
          {linkedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconComponent className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No tasks linked to this tool yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add a task above or use "More Options" for detailed settings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending ({pendingTasks.length})</h3>
                  <div className="space-y-2">
                    {pendingTasks.map(task => (
                      <div 
                        key={task.id}
                        className="bg-card border rounded-lg p-3 flex items-start gap-3"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleCompleteTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.text}</p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          {task.coloredTags && task.coloredTags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {task.coloredTags.slice(0, 3).map((tag, idx) => (
                                <span 
                                  key={idx}
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCompleteTask(task.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRescheduleTask(task)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUnlinkTask(task.id)}>
                              Unlink from Tool
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed ({completedTasks.length})</h3>
                  <div className="space-y-2">
                    {completedTasks.map(task => (
                      <div 
                        key={task.id}
                        className="bg-muted/30 border rounded-lg p-3 flex items-start gap-3 opacity-60"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleCompleteTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate line-through text-muted-foreground">{task.text}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCompleteTask(task.id)}>
                              Undo Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUnlinkTask(task.id)}>
                              Unlink from Tool
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The task will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reschedule Date Picker */}
        {showDatePicker && taskToReschedule && (
          <TaskDateTimePage
            isOpen={showDatePicker}
            onClose={() => {
              setShowDatePicker(false);
              setTaskToReschedule(null);
            }}
            initialDate={taskToReschedule.dueDate}
            onSave={(data) => {
              handleSaveReschedule({
                dueDate: data.selectedDate,
                reminderTime: data.selectedTime 
                  ? new Date(new Date().setHours(
                      data.selectedTime.period === 'PM' && data.selectedTime.hour !== 12 
                        ? data.selectedTime.hour + 12 
                        : data.selectedTime.period === 'AM' && data.selectedTime.hour === 12 
                          ? 0 
                          : data.selectedTime.hour,
                      data.selectedTime.minute
                    ))
                  : undefined,
              });
            }}
            hideRepeat={false}
          />
        )}

        {/* Task Input Sheet */}
        <TaskInputSheet
          isOpen={showTaskInput}
          onClose={() => setShowTaskInput(false)}
          onAddTask={handleAddTask}
          folders={folders}
          selectedFolderId={null}
          onCreateFolder={handleCreateFolder}
        />
      </div>
    </TodoLayout>
  );
};

export default CustomToolDetail;
