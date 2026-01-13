import { useState, useEffect } from "react";
import { Loader2, Calendar, RefreshCw, AlertTriangle, ChevronDown, Clock, X, CalendarClock, Undo2, Edit2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSyncBridge } from "@/hooks/useSyncBridge";
import { systemCalendarManager } from "@/utils/systemCalendar";

// Import logos
import logoGoogleCalendar from "@/assets/logo-google-calendar.png";
import logoClickUp from "@/assets/logo-clickup.png";
import logoNotion from "@/assets/logo-notion.png";
import logoHubSpot from "@/assets/logo-hubspot.png";
import logoTickTick from "@/assets/logo-ticktick.png";
import logoTodoist from "@/assets/logo-todoist.png";
import logoEvernote from "@/assets/logo-evernote.png";

interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  email?: string;
}

interface SyncSettingsState {
  calendar: {
    enabled: boolean;
    twoWaySync: boolean;
    defaultCalendar: string;
  };
  integrations: {
    clickup: ConnectionStatus;
    notion: ConnectionStatus;
    hubspot: ConnectionStatus;
  };
  imports: {
    ticktick: ConnectionStatus;
    todoist: ConnectionStatus;
  };
}

const SyncSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [systemCalendarSync, setSystemCalendarSync] = useState(false);
  const [systemCalendarTwoWaySync, setSystemCalendarTwoWaySync] = useState(false);
  const [systemCalendarAutoCreate, setSystemCalendarAutoCreate] = useState(false);
  const [systemCalendarLastSync, setSystemCalendarLastSync] = useState<Date | null>(null);
  const [syncedEventsCount, setSyncedEventsCount] = useState(0);
  const [autoCreatedTasksCount, setAutoCreatedTasksCount] = useState(0);
  const [availableCalendars, setAvailableCalendars] = useState<{ id: string; name: string }[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<{ eventId: string; taskId: string; eventTitle: string; taskTitle: string; eventEnd?: string }[]>([]);
  const [isCalendarFilterOpen, setIsCalendarFilterOpen] = useState(false);
  const [dismissedConflicts, setDismissedConflicts] = useState<string[]>([]);
  const [rescheduleConflict, setRescheduleConflict] = useState<{ eventId: string; taskId: string; eventTitle: string; taskTitle: string } | null>(null);
  const [customRescheduleDate, setCustomRescheduleDate] = useState<Date>(new Date());
  const [customRescheduleTime, setCustomRescheduleTime] = useState('12:00');
  const [undoAction, setUndoAction] = useState<{ type: 'reschedule' | 'dismiss'; data: any; conflictId: string } | null>(null);
  
  const {
    isLoading: bridgeLoading,
    calendarSettings,
    connections,
    lastSyncTime,
    connectGoogleCalendar,
  } = useSyncBridge();
  
  const [settings, setSettings] = useState<SyncSettingsState>({
    calendar: {
      enabled: false,
      twoWaySync: true,
      defaultCalendar: "",
    },
    integrations: {
      clickup: { connected: false },
      notion: { connected: false },
      hubspot: { connected: false },
    },
    imports: {
      ticktick: { connected: false },
      todoist: { connected: false },
    },
  });

  useEffect(() => {
    // Load system calendar sync state
    setSystemCalendarSync(systemCalendarManager.isSyncEnabled());
    setSystemCalendarTwoWaySync(systemCalendarManager.isTwoWaySyncEnabled());
    setSystemCalendarAutoCreate(systemCalendarManager.isAutoCreateTasksEnabled());
    setSystemCalendarLastSync(systemCalendarManager.getLastSyncTime());
    setSyncedEventsCount(systemCalendarManager.getSyncedEvents().length);
    setSelectedCalendarIds(systemCalendarManager.getSelectedCalendarIds());
    
    // Load available calendars
    systemCalendarManager.getAvailableCalendars().then(setAvailableCalendars);
    
    // Check for conflicts
    const savedTasks = localStorage.getItem('todoItems');
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const detected = systemCalendarManager.detectConflicts(tasks);
      setConflicts(detected);
    }
    
    // Load dismissed conflicts
    const dismissed = localStorage.getItem('dismissedCalendarConflicts');
    if (dismissed) {
      setDismissedConflicts(JSON.parse(dismissed));
    }
  }, []);

  useEffect(() => {
    if (!bridgeLoading) {
      setSettings(prev => ({
        ...prev,
        calendar: calendarSettings,
        integrations: {
          clickup: connections.clickup,
          notion: connections.notion,
          hubspot: connections.hubspot,
        },
        imports: {
          ticktick: connections.ticktick,
          todoist: connections.todoist,
        },
      }));
    }
  }, [bridgeLoading, calendarSettings, connections]);

  const handleConnect = async (service: string) => {
    setIsLoading(prev => ({ ...prev, [service]: true }));
    
    try {
      if (service === "Google Calendar") {
        const result = await connectGoogleCalendar();
        if (result.success) {
          toast({
            title: "Connected",
            description: `Google Calendar connected: ${result.email}`,
          });
        } else {
          toast({
            title: "Connection failed",
            description: result.error || "Failed to connect",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Coming Soon",
          description: `${service} integration will be available soon.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to connect to ${service}`,
        variant: "destructive",
      });
    }
    
    setIsLoading(prev => ({ ...prev, [service]: false }));
  };

  const handleSystemCalendarToggle = async (enabled: boolean) => {
    if (enabled) {
      setIsLoading(prev => ({ ...prev, systemCalendar: true }));
      
      const result = await systemCalendarManager.syncWithSystemCalendar();
      
      if (result.success) {
        setSystemCalendarSync(true);
        systemCalendarManager.setSyncEnabled(true);
        setSystemCalendarLastSync(new Date());
        setSyncedEventsCount(result.count);

        // Auto-create tasks if enabled
        if (systemCalendarAutoCreate) {
          const createdCount = await autoCreateTasksFromEvents();
          setAutoCreatedTasksCount(createdCount);
        }

        toast({
          title: "Calendar Synced",
          description: `Successfully synced ${result.count} events from your device calendar.`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Could not access system calendar. Please grant calendar permissions.",
          variant: "destructive",
        });
      }
      
      setIsLoading(prev => ({ ...prev, systemCalendar: false }));
    } else {
      setSystemCalendarSync(false);
      systemCalendarManager.setSyncEnabled(false);
      toast({
        title: "Calendar Sync Disabled",
        description: "System calendar sync has been turned off.",
      });
    }
  };

  const autoCreateTasksFromEvents = async (): Promise<number> => {
    const events = systemCalendarManager.getSyncedEvents();
    const savedTasks = localStorage.getItem('todoItems');
    let tasks = savedTasks ? JSON.parse(savedTasks) : [];
    let createdCount = 0;

    for (const event of events) {
      // Skip if already converted
      if (systemCalendarManager.isEventConverted(event.id)) continue;

      const taskData = systemCalendarManager.convertEventToTask(event);
      const newTask = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        completed: false,
        ...taskData,
        systemCalendarEventId: event.id,
      };
      
      tasks.unshift(newTask);
      systemCalendarManager.addConvertedEventId(event.id);
      createdCount++;
    }

    if (createdCount > 0) {
      localStorage.setItem('todoItems', JSON.stringify(tasks));
      window.dispatchEvent(new Event('tasksUpdated'));
    }

    return createdCount;
  };

  const handleAutoCreateToggle = async (enabled: boolean) => {
    setSystemCalendarAutoCreate(enabled);
    systemCalendarManager.setAutoCreateTasksEnabled(enabled);
    
    if (enabled && systemCalendarSync) {
      const createdCount = await autoCreateTasksFromEvents();
      if (createdCount > 0) {
        setAutoCreatedTasksCount(prev => prev + createdCount);
        toast({
          title: "Tasks Created",
          description: `Created ${createdCount} task(s) from device calendar events.`,
        });
      } else {
        toast({
          title: "No New Events",
          description: "All device calendar events have already been converted to tasks.",
        });
      }
    } else {
      toast({
        title: enabled ? "Auto-Create Enabled" : "Auto-Create Disabled",
        description: enabled 
          ? "New device calendar events will be converted to tasks" 
          : "Events will no longer be auto-converted to tasks",
      });
    }
  };

  const handleRefreshSystemCalendar = async () => {
    setIsLoading(prev => ({ ...prev, systemCalendar: true }));
    
    const result = await systemCalendarManager.syncWithSystemCalendar();
    
    if (result.success) {
      setSystemCalendarLastSync(new Date());
      setSyncedEventsCount(result.count);
      toast({
        title: "Calendar Refreshed",
        description: `Synced ${result.count} events from your device calendar.`,
      });
    } else {
      toast({
        title: "Refresh Failed",
        description: "Could not sync with system calendar.",
        variant: "destructive",
      });
    }
    
    setIsLoading(prev => ({ ...prev, systemCalendar: false }));
  };

  if (bridgeLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const connectButtonStyles = "w-full h-12 justify-start gap-3 border border-border bg-background hover:bg-muted/50 text-foreground font-medium rounded-xl";

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">

      {lastSyncTime && (
        <div className="text-xs text-muted-foreground text-center">
          Last synced: {new Date(lastSyncTime).toLocaleString()}
        </div>
      )}

      {/* System Calendar Sync Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">System Calendar</CardTitle>
              <CardDescription>Sync events from your device calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Sync</p>
              <p className="text-xs text-muted-foreground">
                Access your device's calendar events
              </p>
            </div>
            <Switch
              checked={systemCalendarSync}
              onCheckedChange={handleSystemCalendarToggle}
              disabled={isLoading.systemCalendar}
            />
          </div>
          
          {systemCalendarSync && (
            <>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Two-Way Sync</p>
                  <p className="text-xs text-muted-foreground">
                    Push NPD tasks to device calendar
                  </p>
                </div>
                <Switch
                  checked={systemCalendarTwoWaySync}
                  onCheckedChange={(enabled) => {
                    setSystemCalendarTwoWaySync(enabled);
                    systemCalendarManager.setTwoWaySyncEnabled(enabled);
                    toast({
                      title: enabled ? "Two-Way Sync Enabled" : "Two-Way Sync Disabled",
                      description: enabled 
                        ? "Tasks will be synced to your device calendar" 
                        : "Tasks will no longer sync to device calendar",
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Auto-Create Tasks</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically create NPD tasks from device events
                  </p>
                </div>
                <Switch
                  checked={systemCalendarAutoCreate}
                  onCheckedChange={handleAutoCreateToggle}
                />
              </div>

              {/* Calendar Filter */}
              <Collapsible open={isCalendarFilterOpen} onOpenChange={setIsCalendarFilterOpen} className="pt-2 border-t">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                  <div>
                    <p className="text-sm font-medium text-left">Calendar Filter</p>
                    <p className="text-xs text-muted-foreground text-left">
                      {selectedCalendarIds.length === 0 
                        ? 'All calendars' 
                        : `${selectedCalendarIds.length} calendar(s) selected`}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCalendarFilterOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {availableCalendars.length > 0 ? (
                    availableCalendars.map((cal) => (
                      <label key={cal.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <Checkbox
                          checked={selectedCalendarIds.length === 0 || selectedCalendarIds.includes(cal.id)}
                          onCheckedChange={(checked) => {
                            let newIds: string[];
                            if (selectedCalendarIds.length === 0) {
                              // First selection - select only this one
                              newIds = checked ? [cal.id] : [];
                            } else if (checked) {
                              newIds = [...selectedCalendarIds, cal.id];
                            } else {
                              newIds = selectedCalendarIds.filter(id => id !== cal.id);
                            }
                            setSelectedCalendarIds(newIds);
                            systemCalendarManager.setSelectedCalendarIds(newIds);
                            setSyncedEventsCount(systemCalendarManager.getSyncedEvents().length);
                          }}
                        />
                        <span className="text-sm">{cal.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No calendars available. Sync with device calendar first.
                    </p>
                  )}
                  {selectedCalendarIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCalendarIds([]);
                        systemCalendarManager.setSelectedCalendarIds([]);
                        setSyncedEventsCount(systemCalendarManager.getSyncedEvents().length);
                      }}
                      className="text-xs"
                    >
                      Reset to All Calendars
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Conflict Detection */}
              {conflicts.filter(c => !dismissedConflicts.includes(`${c.taskId}-${c.eventId}`)).length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {conflicts.filter(c => !dismissedConflicts.includes(`${c.taskId}-${c.eventId}`)).length} Conflict(s) Detected
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allIds = conflicts.map(c => `${c.taskId}-${c.eventId}`);
                        setDismissedConflicts(allIds);
                        localStorage.setItem('dismissedCalendarConflicts', JSON.stringify(allIds));
                        toast({
                          title: "All conflicts dismissed",
                          description: "You can re-detect conflicts by refreshing the calendar sync.",
                        });
                      }}
                      className="text-xs h-7"
                    >
                      Dismiss All
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {conflicts
                      .filter(c => !dismissedConflicts.includes(`${c.taskId}-${c.eventId}`))
                      .slice(0, 5)
                      .map((conflict, idx) => (
                      <div key={idx} className="text-xs bg-amber-500/10 rounded-md p-3 space-y-2">
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">"{conflict.taskTitle}"</span> overlaps with <span className="font-medium text-foreground">"{conflict.eventTitle}"</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Quick reschedule (1 hour after event) */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              const savedTasks = localStorage.getItem('todoItems');
                              if (savedTasks) {
                                const tasks = JSON.parse(savedTasks);
                                const task = tasks.find((t: any) => t.id === conflict.taskId);
                                const originalDate = task?.dueDate;
                                const syncedEvents = systemCalendarManager.getSyncedEvents();
                                const event = syncedEvents.find(e => e.id === conflict.eventId);
                                
                                if (event) {
                                  const newDate = addHours(new Date(event.endDate), 1);
                                  const updatedTasks = tasks.map((t: any) => {
                                    if (t.id === conflict.taskId) {
                                      return { ...t, dueDate: newDate.toISOString() };
                                    }
                                    return t;
                                  });
                                  localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
                                  
                                  // Store undo action
                                  setUndoAction({
                                    type: 'reschedule',
                                    data: { taskId: conflict.taskId, originalDate, taskTitle: conflict.taskTitle },
                                    conflictId: `${conflict.taskId}-${conflict.eventId}`
                                  });
                                  
                                  // Remove from conflicts
                                  const newConflicts = conflicts.filter(c => 
                                    !(c.taskId === conflict.taskId && c.eventId === conflict.eventId)
                                  );
                                  setConflicts(newConflicts);
                                  
                                  toast({
                                    title: "Task rescheduled",
                                    description: `"${conflict.taskTitle}" moved to ${format(newDate, 'MMM d, h:mm a')}`,
                                  });
                                }
                              }
                            }}
                          >
                            <CalendarClock className="h-3 w-3" />
                            +1hr
                          </Button>
                          
                          {/* Custom time picker */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                              >
                                <Edit2 className="h-3 w-3" />
                                Custom
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 space-y-3" align="start">
                              <div className="text-xs font-medium">Pick date & time</div>
                              <CalendarPicker
                                mode="single"
                                selected={customRescheduleDate}
                                onSelect={(date) => date && setCustomRescheduleDate(date)}
                                className="rounded-md border"
                              />
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="time"
                                  value={customRescheduleTime}
                                  onChange={(e) => setCustomRescheduleTime(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={() => {
                                  const savedTasks = localStorage.getItem('todoItems');
                                  if (savedTasks) {
                                    const tasks = JSON.parse(savedTasks);
                                    const task = tasks.find((t: any) => t.id === conflict.taskId);
                                    const originalDate = task?.dueDate;
                                    
                                    const [hours, minutes] = customRescheduleTime.split(':').map(Number);
                                    let newDate = setHours(customRescheduleDate, hours);
                                    newDate = setMinutes(newDate, minutes);
                                    
                                    const updatedTasks = tasks.map((t: any) => {
                                      if (t.id === conflict.taskId) {
                                        return { ...t, dueDate: newDate.toISOString() };
                                      }
                                      return t;
                                    });
                                    localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
                                    
                                    // Store undo action
                                    setUndoAction({
                                      type: 'reschedule',
                                      data: { taskId: conflict.taskId, originalDate, taskTitle: conflict.taskTitle },
                                      conflictId: `${conflict.taskId}-${conflict.eventId}`
                                    });
                                    
                                    const newConflicts = conflicts.filter(c => 
                                      !(c.taskId === conflict.taskId && c.eventId === conflict.eventId)
                                    );
                                    setConflicts(newConflicts);
                                    
                                    toast({
                                      title: "Task rescheduled",
                                      description: `"${conflict.taskTitle}" moved to ${format(newDate, 'MMM d, h:mm a')}`,
                                    });
                                  }
                                }}
                              >
                                Apply
                              </Button>
                            </PopoverContent>
                          </Popover>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              const conflictId = `${conflict.taskId}-${conflict.eventId}`;
                              const newDismissed = [...dismissedConflicts, conflictId];
                              setDismissedConflicts(newDismissed);
                              localStorage.setItem('dismissedCalendarConflicts', JSON.stringify(newDismissed));
                              
                              // Store undo action
                              setUndoAction({
                                type: 'dismiss',
                                data: { conflictId },
                                conflictId
                              });
                              
                              toast({
                                title: "Conflict dismissed",
                                description: "This conflict won't be shown again.",
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                    {conflicts.filter(c => !dismissedConflicts.includes(`${c.taskId}-${c.eventId}`)).length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{conflicts.filter(c => !dismissedConflicts.includes(`${c.taskId}-${c.eventId}`)).length - 5} more conflicts
                      </p>
                    )}
                  </div>
                  
                  {/* Undo action button */}
                  {undoAction && (
                    <div className="mt-3 flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground">
                        {undoAction.type === 'reschedule' ? 'Task rescheduled' : 'Conflict dismissed'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => {
                          if (undoAction.type === 'reschedule') {
                            // Restore original date
                            const savedTasks = localStorage.getItem('todoItems');
                            if (savedTasks) {
                              const tasks = JSON.parse(savedTasks);
                              const updatedTasks = tasks.map((t: any) => {
                                if (t.id === undoAction.data.taskId) {
                                  return { ...t, dueDate: undoAction.data.originalDate };
                                }
                                return t;
                              });
                              localStorage.setItem('todoItems', JSON.stringify(updatedTasks));
                              
                              // Re-detect conflicts
                              const detected = systemCalendarManager.detectConflicts(updatedTasks);
                              setConflicts(detected);
                              
                              toast({
                                title: "Undo successful",
                                description: `"${undoAction.data.taskTitle}" restored to original time`,
                              });
                            }
                          } else if (undoAction.type === 'dismiss') {
                            // Remove from dismissed
                            const newDismissed = dismissedConflicts.filter(id => id !== undoAction.data.conflictId);
                            setDismissedConflicts(newDismissed);
                            localStorage.setItem('dismissedCalendarConflicts', JSON.stringify(newDismissed));
                            
                            toast({
                                title: "Undo successful",
                                description: "Conflict restored",
                            });
                          }
                          setUndoAction(null);
                        }}
                      >
                        <Undo2 className="h-3 w-3" />
                        Undo
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">{syncedEventsCount} events synced</p>
                  {systemCalendarLastSync && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {systemCalendarLastSync.toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshSystemCalendar}
                  disabled={isLoading.systemCalendar}
                >
                  {isLoading.systemCalendar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background">
              <img src={logoGoogleCalendar} alt="Google Calendar" className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>Sync tasks with Google Calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className={connectButtonStyles}
            onClick={() => handleConnect("Google Calendar")}
            disabled={isLoading["Google Calendar"]}
          >
            {isLoading["Google Calendar"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="h-5 w-5"
              />
            )}
            {connections.googleCalendar.connected ? 'Connected' : 'Continue Google Account'}
          </Button>
          {connections.googleCalendar.email && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Connected as {connections.googleCalendar.email}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integrations</CardTitle>
          <CardDescription>Connect with ClickUp, Notion, and HubSpot</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* ClickUp */}
            <AccordionItem value="clickup" className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <img src={logoClickUp} alt="ClickUp" className="w-8 h-8 rounded-lg" />
                  <span className="font-medium">ClickUp</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <Button 
                  variant="outline" 
                  className={connectButtonStyles}
                  onClick={() => handleConnect("ClickUp")}
                  disabled={isLoading["ClickUp"]}
                >
                  {isLoading["ClickUp"] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src={logoClickUp} alt="ClickUp" className="h-5 w-5 rounded" />
                  )}
                  Continue ClickUp Account
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Notion */}
            <AccordionItem value="notion" className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <img src={logoNotion} alt="Notion" className="w-8 h-8 rounded-lg" />
                  <span className="font-medium">Notion</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <Button 
                  variant="outline" 
                  className={connectButtonStyles}
                  onClick={() => handleConnect("Notion")}
                  disabled={isLoading["Notion"]}
                >
                  {isLoading["Notion"] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src={logoNotion} alt="Notion" className="h-5 w-5 rounded" />
                  )}
                  Continue Notion Account
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* HubSpot */}
            <AccordionItem value="hubspot" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <img src={logoHubSpot} alt="HubSpot" className="w-8 h-8 rounded-lg" />
                  <span className="font-medium">HubSpot</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <Button 
                  variant="outline" 
                  className={connectButtonStyles}
                  onClick={() => handleConnect("HubSpot")}
                  disabled={isLoading["HubSpot"]}
                >
                  {isLoading["HubSpot"] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src={logoHubSpot} alt="HubSpot" className="h-5 w-5 rounded" />
                  )}
                  Continue HubSpot Account
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Task Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Tasks</CardTitle>
          <CardDescription>Import tasks from other apps</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* TickTick */}
            <AccordionItem value="ticktick" className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <img src={logoTickTick} alt="TickTick" className="w-8 h-8 rounded-lg" />
                  <span className="font-medium">TickTick</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <Button 
                  variant="outline" 
                  className={connectButtonStyles}
                  onClick={() => handleConnect("TickTick")}
                  disabled={isLoading["TickTick"]}
                >
                  {isLoading["TickTick"] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src={logoTickTick} alt="TickTick" className="h-5 w-5 rounded" />
                  )}
                  Import from TickTick
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Todoist */}
            <AccordionItem value="todoist" className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <img src={logoTodoist} alt="Todoist" className="w-8 h-8 rounded-lg" />
                  <span className="font-medium">Todoist</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <Button 
                  variant="outline" 
                  className={connectButtonStyles}
                  onClick={() => handleConnect("Todoist")}
                  disabled={isLoading["Todoist"]}
                >
                  {isLoading["Todoist"] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src={logoTodoist} alt="Todoist" className="h-5 w-5 rounded" />
                  )}
                  Import from Todoist
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Evernote */}
            <AccordionItem value="evernote" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <img src={logoEvernote} alt="Evernote" className="w-8 h-8 rounded-lg" />
                  <span className="font-medium">Evernote</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <Button 
                  variant="outline" 
                  className={connectButtonStyles}
                  onClick={() => handleConnect("Evernote")}
                  disabled={isLoading["Evernote"]}
                >
                  {isLoading["Evernote"] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src={logoEvernote} alt="Evernote" className="h-5 w-5 rounded" />
                  )}
                  Import from Evernote
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncSettings;
