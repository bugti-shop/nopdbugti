export interface NotificationHistoryItem {
  id: string;
  noteId: string;
  noteTitle: string;
  noteContent: string;
  triggeredAt: Date;
  sound?: string;
  recurring?: string;
  wasOpened: boolean;
}

const STORAGE_KEY = 'nota-notification-history';

export const getNotificationHistory = (): NotificationHistoryItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map((item: NotificationHistoryItem) => ({
      ...item,
      triggeredAt: new Date(item.triggeredAt),
    }));
  } catch {
    return [];
  }
};

export const saveNotificationHistory = (item: NotificationHistoryItem): void => {
  try {
    const history = getNotificationHistory();
    history.unshift(item);
    // Keep only last 50 items
    const trimmed = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save notification history:', error);
  }
};

export const clearNotificationHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

