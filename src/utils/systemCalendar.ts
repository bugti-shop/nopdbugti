import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from 'capacitor-calendar';
import { TodoItem } from '@/types/note';

export interface SystemCalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  allDay?: boolean;
  calendarId?: string;
  calendarName?: string;
  isSystemEvent?: boolean; // Flag to identify system calendar events
}

export interface AvailableCalendar {
  id: string;
  name: string;
}

class SystemCalendarManager {
  private static instance: SystemCalendarManager;
  private hasPermission = false;

  private constructor() {}

  static getInstance(): SystemCalendarManager {
    if (!SystemCalendarManager.instance) {
      SystemCalendarManager.instance = new SystemCalendarManager();
    }
    return SystemCalendarManager.instance;
  }

  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      console.log('Calendar permissions only available on native platforms');
      return false;
    }

    try {
      const result = await CapacitorCalendar.getAvailableCalendars();
      this.hasPermission = true;
      return true;
    } catch (error) {
      console.error('Failed to get calendar permission:', error);
      this.hasPermission = false;
      return false;
    }
  }

  async getAvailableCalendars(): Promise<AvailableCalendar[]> {
    if (!this.isNativePlatform()) {
      return [];
    }

    try {
      const result = await CapacitorCalendar.getAvailableCalendars();
      return (result.availableCalendars || []).map((cal: any) => ({
        id: cal.id,
        name: cal.name,
      }));
    } catch (error) {
      console.error('Failed to get available calendars:', error);
      return [];
    }
  }

  async getEvents(startDate: Date, endDate: Date): Promise<SystemCalendarEvent[]> {
    if (!this.isNativePlatform()) {
      console.log('Calendar events only available on native platforms');
      return [];
    }

    try {
      // Get available calendars first to ensure permission
      const calendars = await this.getAvailableCalendars();
      if (calendars.length === 0) {
        return [];
      }

      // The capacitor-calendar plugin doesn't have a direct getEvents method in all versions
      // We'll need to use the available API
      const result = await (CapacitorCalendar as any).getEventsFromCalendar?.({
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
      });

      if (!result?.events) {
        return [];
      }

      return result.events.map((event: any) => ({
        id: event.id || String(Date.now()),
        title: event.title || 'Untitled Event',
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location,
        notes: event.notes,
        allDay: event.allDay,
        calendarId: event.calendarId,
        isSystemEvent: true,
      }));
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      return [];
    }
  }

  async createEvent(event: Omit<SystemCalendarEvent, 'id'>): Promise<string | null> {
    if (!this.isNativePlatform()) {
      console.log('Creating calendar events only available on native platforms');
      return null;
    }

    try {
      const result = await CapacitorCalendar.createEvent({
        id: Date.now().toString(),
        title: event.title,
        startDate: event.startDate.getTime(),
        endDate: event.endDate.getTime(),
        location: event.location,
        notes: event.notes,
      });

      return result?.eventId || Date.now().toString();
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }

  // Push NPD task to system calendar
  async pushTaskToSystemCalendar(task: TodoItem): Promise<string | null> {
    if (!this.isNativePlatform() || !task.dueDate) {
      return null;
    }

    if (!this.isTwoWaySyncEnabled()) {
      return null;
    }

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const startDate = new Date(task.dueDate);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration

      const eventId = await this.createEvent({
        title: task.text,
        startDate,
        endDate,
        location: task.location,
        notes: task.description,
        allDay: false,
      });

      if (eventId) {
        // Store the mapping
        this.addTaskEventMapping(task.id, eventId);
      }

      return eventId;
    } catch (error) {
      console.error('Failed to push task to system calendar:', error);
      return null;
    }
  }

  // Update task in system calendar
  async updateTaskInSystemCalendar(task: TodoItem): Promise<boolean> {
    if (!this.isNativePlatform() || !task.dueDate) {
      return false;
    }

    if (!this.isTwoWaySyncEnabled()) {
      return false;
    }

    const eventId = this.getEventIdForTask(task.id);
    if (!eventId) {
      // Create new event if not exists
      await this.pushTaskToSystemCalendar(task);
      return true;
    }

    try {
      // Delete old event and create new one (simplest approach for cross-platform)
      await this.deleteEventFromSystemCalendar(task.id);
      await this.pushTaskToSystemCalendar(task);
      return true;
    } catch (error) {
      console.error('Failed to update task in system calendar:', error);
      return false;
    }
  }

  // Delete task from system calendar
  async deleteEventFromSystemCalendar(taskId: string): Promise<boolean> {
    if (!this.isNativePlatform()) {
      return false;
    }

    const eventId = this.getEventIdForTask(taskId);
    if (!eventId) {
      return false;
    }

    try {
      await (CapacitorCalendar as any).deleteEvent?.({ id: eventId });
      this.removeTaskEventMapping(taskId);
      return true;
    } catch (error) {
      console.error('Failed to delete event from system calendar:', error);
      return false;
    }
  }

  // Task-Event mapping storage
  private getTaskEventMappings(): Record<string, string> {
    try {
      const mappings = localStorage.getItem('taskEventMappings');
      return mappings ? JSON.parse(mappings) : {};
    } catch {
      return {};
    }
  }

  private addTaskEventMapping(taskId: string, eventId: string): void {
    const mappings = this.getTaskEventMappings();
    mappings[taskId] = eventId;
    localStorage.setItem('taskEventMappings', JSON.stringify(mappings));
  }

  private removeTaskEventMapping(taskId: string): void {
    const mappings = this.getTaskEventMappings();
    delete mappings[taskId];
    localStorage.setItem('taskEventMappings', JSON.stringify(mappings));
  }

  private getEventIdForTask(taskId: string): string | null {
    const mappings = this.getTaskEventMappings();
    return mappings[taskId] || null;
  }

  // Two-way sync settings
  isTwoWaySyncEnabled(): boolean {
    return localStorage.getItem('systemCalendarTwoWaySync') === 'true';
  }

  setTwoWaySyncEnabled(enabled: boolean): void {
    localStorage.setItem('systemCalendarTwoWaySync', enabled ? 'true' : 'false');
  }

  // Auto-create tasks setting
  isAutoCreateTasksEnabled(): boolean {
    return localStorage.getItem('systemCalendarAutoCreateTasks') === 'true';
  }

  setAutoCreateTasksEnabled(enabled: boolean): void {
    localStorage.setItem('systemCalendarAutoCreateTasks', enabled ? 'true' : 'false');
  }

  isSyncEnabled(): boolean {
    return localStorage.getItem('systemCalendarSyncEnabled') === 'true';
  }

  setSyncEnabled(enabled: boolean): void {
    localStorage.setItem('systemCalendarSyncEnabled', enabled ? 'true' : 'false');
  }

  // Get events that have been converted to tasks
  getConvertedEventIds(): string[] {
    try {
      const ids = localStorage.getItem('systemCalendarConvertedEventIds');
      return ids ? JSON.parse(ids) : [];
    } catch {
      return [];
    }
  }

  addConvertedEventId(eventId: string): void {
    const ids = this.getConvertedEventIds();
    if (!ids.includes(eventId)) {
      ids.push(eventId);
      localStorage.setItem('systemCalendarConvertedEventIds', JSON.stringify(ids));
    }
  }

  isEventConverted(eventId: string): boolean {
    return this.getConvertedEventIds().includes(eventId);
  }

  // Calendar filter settings
  getSelectedCalendarIds(): string[] {
    try {
      const ids = localStorage.getItem('systemCalendarSelectedIds');
      return ids ? JSON.parse(ids) : [];
    } catch {
      return [];
    }
  }

  setSelectedCalendarIds(ids: string[]): void {
    localStorage.setItem('systemCalendarSelectedIds', JSON.stringify(ids));
  }

  isCalendarSelected(calendarId: string): boolean {
    const selectedIds = this.getSelectedCalendarIds();
    // If no calendars are explicitly selected, include all
    if (selectedIds.length === 0) return true;
    return selectedIds.includes(calendarId);
  }

  // Conflict detection
  detectConflicts(tasks: any[]): { eventId: string; taskId: string; eventTitle: string; taskTitle: string }[] {
    const conflicts: { eventId: string; taskId: string; eventTitle: string; taskTitle: string }[] = [];
    const syncedEvents = this.getSyncedEvents();
    
    for (const event of syncedEvents) {
      const eventStart = new Date(event.startDate).getTime();
      const eventEnd = new Date(event.endDate).getTime();
      
      for (const task of tasks) {
        if (!task.dueDate) continue;
        
        const taskTime = new Date(task.dueDate).getTime();
        
        // Check if task falls within event time range (within 30 minutes overlap)
        const overlapThreshold = 30 * 60 * 1000; // 30 minutes
        
        if (taskTime >= eventStart - overlapThreshold && taskTime <= eventEnd + overlapThreshold) {
          conflicts.push({
            eventId: event.id,
            taskId: task.id,
            eventTitle: event.title,
            taskTitle: task.text,
          });
        }
      }
    }
    
    return conflicts;
  }

  getLastSyncTime(): Date | null {
    const time = localStorage.getItem('systemCalendarLastSync');
    return time ? new Date(time) : null;
  }

  setLastSyncTime(date: Date): void {
    localStorage.setItem('systemCalendarLastSync', date.toISOString());
  }

  getSyncedEvents(): SystemCalendarEvent[] {
    try {
      const events = localStorage.getItem('systemCalendarSyncedEvents');
      if (!events) return [];
      const selectedIds = this.getSelectedCalendarIds();
      return JSON.parse(events)
        .map((e: any) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
          isSystemEvent: true,
        }))
        .filter((e: SystemCalendarEvent) => {
          // If no calendars selected, show all
          if (selectedIds.length === 0) return true;
          return e.calendarId && selectedIds.includes(e.calendarId);
        });
    } catch (error) {
      console.error('Failed to get synced events:', error);
      return [];
    }
  }

  getAllSyncedEvents(): SystemCalendarEvent[] {
    try {
      const events = localStorage.getItem('systemCalendarSyncedEvents');
      if (!events) return [];
      return JSON.parse(events).map((e: any) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
        isSystemEvent: true,
      }));
    } catch (error) {
      console.error('Failed to get synced events:', error);
      return [];
    }
  }

  setSyncedEvents(events: SystemCalendarEvent[]): void {
    localStorage.setItem('systemCalendarSyncedEvents', JSON.stringify(events));
  }

  async syncWithSystemCalendar(): Promise<{ success: boolean; count: number }> {
    if (!this.isNativePlatform()) {
      return { success: false, count: 0 };
    }

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return { success: false, count: 0 };
      }

      // Get events for the next 30 days
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const events = await this.getEvents(now, endDate);
      
      this.setSyncedEvents(events);
      this.setLastSyncTime(new Date());

      return { success: true, count: events.length };
    } catch (error) {
      console.error('Failed to sync with system calendar:', error);
      return { success: false, count: 0 };
    }
  }

  // Convert system calendar event to NPD task
  convertEventToTask(event: SystemCalendarEvent): Omit<TodoItem, 'id' | 'completed'> {
    return {
      text: event.title,
      dueDate: event.startDate,
      location: event.location,
      description: event.notes,
      priority: 'medium',
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
  }
}

export const systemCalendarManager = SystemCalendarManager.getInstance();
