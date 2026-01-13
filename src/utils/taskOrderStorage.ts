/**
 * Task Order Storage - Persists custom task ordering to localStorage
 */

const TASK_ORDER_KEY = 'taskCustomOrder';
const SECTION_ORDER_KEY = 'taskSectionOrder';

interface TaskOrderMap {
  [sectionId: string]: string[]; // sectionId -> array of taskIds in order
}

/**
 * Load custom task order from localStorage
 */
export const loadTaskOrder = (): TaskOrderMap => {
  try {
    const saved = localStorage.getItem(TASK_ORDER_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load task order:', e);
    return {};
  }
};

/**
 * Save custom task order to localStorage
 */
export const saveTaskOrder = (order: TaskOrderMap): void => {
  try {
    localStorage.setItem(TASK_ORDER_KEY, JSON.stringify(order));
  } catch (e) {
    console.error('Failed to save task order:', e);
  }
};

/**
 * Update order for a specific section
 */
export const updateSectionOrder = (sectionId: string, taskIds: string[]): void => {
  const currentOrder = loadTaskOrder();
  currentOrder[sectionId] = taskIds;
  saveTaskOrder(currentOrder);
};

/**
 * Get order for a specific section
 */
export const getSectionOrder = (sectionId: string): string[] => {
  const order = loadTaskOrder();
  return order[sectionId] || [];
};

/**
 * Apply saved order to tasks within a section
 */
export const applyTaskOrder = <T extends { id: string }>(
  tasks: T[], 
  sectionId: string
): T[] => {
  const savedOrder = getSectionOrder(sectionId);
  if (savedOrder.length === 0) return tasks;
  
  const orderedTasks: T[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  // First, add tasks in saved order
  for (const taskId of savedOrder) {
    const task = taskMap.get(taskId);
    if (task) {
      orderedTasks.push(task);
      taskMap.delete(taskId);
    }
  }
  
  // Then add any remaining tasks (new tasks not in saved order)
  for (const task of taskMap.values()) {
    orderedTasks.push(task);
  }
  
  return orderedTasks;
};

/**
 * Clear all saved task orders
 */
export const clearAllTaskOrders = (): void => {
  localStorage.removeItem(TASK_ORDER_KEY);
};

/**
 * Remove a specific task from all orders (when task is deleted)
 */
export const removeTaskFromOrders = (taskId: string): void => {
  const order = loadTaskOrder();
  let changed = false;
  
  for (const sectionId of Object.keys(order)) {
    const idx = order[sectionId].indexOf(taskId);
    if (idx !== -1) {
      order[sectionId].splice(idx, 1);
      changed = true;
    }
  }
  
  if (changed) {
    saveTaskOrder(order);
  }
};
