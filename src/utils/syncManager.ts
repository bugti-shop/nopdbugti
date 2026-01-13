// Simplified sync manager for local storage only (no Supabase)
const STORAGE_KEYS = {
  NOTES: 'nota-notes',
  FOLDERS: 'nota-folders',
  TODO_ITEMS: 'nota-todo-items',
  LAST_SYNC: 'nota-last-sync',
  SYNC_ENABLED: 'nota-sync-enabled',
};

class SyncManager {
  private static instance: SyncManager;

  private constructor() {}

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  isSyncEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) === 'true';
  }

  setSyncEnabled(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, enabled.toString());
  }

  getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSync ? new Date(lastSync) : null;
  }

  private setLastSyncTime() {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  async isAuthenticated(): Promise<boolean> {
    return false;
  }

  async syncAllData(): Promise<{
    success: boolean;
    error?: string;
    conflicts?: number;
  }> {
    // Local only - no sync needed
    this.setLastSyncTime();
    return { success: true };
  }

  async updateProfileSyncTime(): Promise<void> {
    this.setLastSyncTime();
  }
}

export const syncManager = SyncManager.getInstance();
