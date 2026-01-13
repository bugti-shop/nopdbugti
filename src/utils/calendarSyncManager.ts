import { TodoItem } from '@/types/note';
import { GoogleCalendar, getAccessToken, isGoogleCalendarEnabled } from './googleCalendar';

const CALENDAR_SYNC_ENABLED_KEY = 'calendarSyncEnabled';
const SELECTED_CALENDARS_KEY = 'selectedCalendars';
const LAST_SYNC_TIME_KEY = 'calendarLastSyncTime';

class CalendarSyncManager {
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;

  isCalendarSyncEnabled(): boolean {
    return localStorage.getItem(CALENDAR_SYNC_ENABLED_KEY) === 'true';
  }

  setCalendarSyncEnabled(enabled: boolean): void {
    localStorage.setItem(CALENDAR_SYNC_ENABLED_KEY, String(enabled));
  }

  getSelectedCalendars(): string[] {
    const stored = localStorage.getItem(SELECTED_CALENDARS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return ['primary'];
      }
    }
    return ['primary'];
  }

  setSelectedCalendars(calendars: string[]): void {
    localStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(calendars));
  }

  getLastSyncTime(): Date | null {
    const stored = localStorage.getItem(LAST_SYNC_TIME_KEY);
    return stored ? new Date(stored) : null;
  }

  setLastSyncTime(time: Date): void {
    localStorage.setItem(LAST_SYNC_TIME_KEY, time.toISOString());
  }

  async fetchAvailableCalendars(): Promise<GoogleCalendar[]> {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated with Google');
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      return [];
    }
  }

  async importFromCalendar(): Promise<{ tasks: TodoItem[]; count: number }> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated with Google');
    }

    const selectedCalendars = this.getSelectedCalendars();
    const tasks: TodoItem[] = [];

    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    for (const calendarId of selectedCalendars) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
            new URLSearchParams({
              timeMin: now.toISOString(),
              timeMax: futureDate.toISOString(),
              singleEvents: 'true',
              orderBy: 'startTime',
            }),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        
        for (const event of data.items || []) {
          if (!event.summary) continue;

          const task: TodoItem = {
            id: `gcal-${event.id}`,
            text: event.summary,
            completed: false,
            description: event.description || '',
            dueDate: event.start?.dateTime 
              ? new Date(event.start.dateTime)
              : event.start?.date 
              ? new Date(event.start.date)
              : undefined,
            googleCalendarEventId: event.id,
          };

          tasks.push(task);
        }
      } catch (error) {
        console.error(`Error importing from calendar ${calendarId}:`, error);
      }
    }

    this.setLastSyncTime(new Date());
    return { tasks, count: tasks.length };
  }

  async syncTwoWay(localTasks: TodoItem[]): Promise<{
    imported: TodoItem[];
    updated: number;
    conflicts: number;
  }> {
    const { tasks: importedTasks } = await this.importFromCalendar();
    
    const existingEventIds = new Set(
      localTasks
        .filter(t => t.googleCalendarEventId)
        .map(t => t.googleCalendarEventId)
    );

    const newTasks = importedTasks.filter(
      t => !existingEventIds.has(t.googleCalendarEventId)
    );

    this.setLastSyncTime(new Date());

    return {
      imported: newTasks,
      updated: 0,
      conflicts: 0,
    };
  }

  async enableAutoSync(intervalMinutes: number = 15): Promise<void> {
    this.disableAutoSync();
    
    this.autoSyncInterval = setInterval(async () => {
      try {
        const isEnabled = await isGoogleCalendarEnabled();
        if (!isEnabled || !this.isCalendarSyncEnabled()) {
          this.disableAutoSync();
          return;
        }

        const existingTasks = JSON.parse(localStorage.getItem('todoItems') || '[]');
        await this.syncTwoWay(existingTasks);
      } catch (error) {
        console.error('Auto sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  disableAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }
}

export const calendarSyncManager = new CalendarSyncManager();
