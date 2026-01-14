import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Notebook, Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { triggerHaptic } from '@/utils/haptics';
import {
  Book,
  BookOpen,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Pin,
  PinOff,
  ChevronRight,
  Folder as FolderIcon,
  Star,
  Archive,
  X,
  Check,
  GripVertical,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from '@/components/ui/alert-dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const NOTEBOOK_COLORS = [
  '#3c78f0', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

const NOTEBOOK_ICONS = [
  'book', 'journal', 'notes', 'work', 'personal', 'ideas', 'projects', 'archive'
];

interface NotebookNavigationProps {
  notebooks: Notebook[];
  notes: Note[];
  selectedNotebookId: string | null;
  onSelectNotebook: (notebookId: string | null) => void;
  onCreateNotebook: (notebook: Omit<Notebook, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNotebook: (notebookId: string, updates: Partial<Notebook>) => void;
  onDeleteNotebook: (notebookId: string) => void;
  onReorderNotebooks: (notebooks: Notebook[]) => void;
  onMoveNoteToNotebook?: (noteId: string, notebookId: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const NotebookNavigation = ({
  notebooks,
  notes,
  selectedNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onUpdateNotebook,
  onDeleteNotebook,
  onReorderNotebooks,
  onMoveNoteToNotebook,
  isOpen,
  onClose,
}: NotebookNavigationProps) => {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(NOTEBOOK_COLORS[0]);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);

  const getNotebookNoteCount = (notebookId: string) => {
    return notes.filter(n => n.folderId === notebookId && !n.isDeleted && !n.isArchived).length;
  };

  const handleCreateNotebook = () => {
    if (!newName.trim()) return;
    
    triggerHaptic('medium');
    onCreateNotebook({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      color: newColor,
      isDefault: false,
      isPinned: false,
      order: notebooks.length,
    });
    
    setNewName('');
    setNewDescription('');
    setNewColor(NOTEBOOK_COLORS[0]);
    setIsCreating(false);
  };

  const handleUpdateNotebook = () => {
    if (!editingNotebook || !editName.trim()) return;
    
    triggerHaptic('light');
    onUpdateNotebook(editingNotebook.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      color: editColor,
    });
    
    setEditingNotebook(null);
  };

  const handleDeleteNotebook = () => {
    if (!notebookToDelete) return;
    
    triggerHaptic('heavy');
    onDeleteNotebook(notebookToDelete.id);
    setNotebookToDelete(null);
  };

  const handleTogglePin = (notebook: Notebook) => {
    triggerHaptic('light');
    onUpdateNotebook(notebook.id, { isPinned: !notebook.isPinned });
  };

  const startEdit = (notebook: Notebook) => {
    setEditingNotebook(notebook);
    setEditName(notebook.name);
    setEditDescription(notebook.description || '');
    setEditColor(notebook.color);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const reordered = Array.from(notebooks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    const updated = reordered.map((nb, idx) => ({ ...nb, order: idx }));
    onReorderNotebooks(updated);
    triggerHaptic('light');
  };

  const handleSelectNotebook = (notebookId: string | null) => {
    triggerHaptic('medium');
    onSelectNotebook(notebookId);
    onClose();
  };

  // Sort notebooks: pinned first, then by order
  const sortedNotebooks = [...notebooks].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.order - b.order;
  });

  const pinnedNotebooks = sortedNotebooks.filter(nb => nb.isPinned);
  const unpinnedNotebooks = sortedNotebooks.filter(nb => !nb.isPinned);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-[85vw] max-w-[360px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('notebooks.title', 'Notebooks')}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-3 space-y-4">
            {/* All Notes Option */}
            <Button
              variant={selectedNotebookId === null ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleSelectNotebook(null)}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">{t('notebooks.allNotes', 'All Notes')}</p>
                <p className="text-xs text-muted-foreground">
                  {notes.filter(n => !n.isDeleted && !n.isArchived).length} {t('notebooks.notes', 'notes')}
                </p>
              </div>
              {selectedNotebookId === null && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </Button>

            {/* Pinned Notebooks */}
            {pinnedNotebooks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-2 flex items-center gap-1">
                  <Pin className="h-3 w-3" />
                  {t('notebooks.pinned', 'Pinned')}
                </p>
                {pinnedNotebooks.map((notebook) => (
                  <NotebookItem
                    key={notebook.id}
                    notebook={notebook}
                    noteCount={getNotebookNoteCount(notebook.id)}
                    isSelected={selectedNotebookId === notebook.id}
                    onSelect={() => handleSelectNotebook(notebook.id)}
                    onEdit={() => startEdit(notebook)}
                    onDelete={() => setNotebookToDelete(notebook)}
                    onTogglePin={() => handleTogglePin(notebook)}
                  />
                ))}
              </div>
            )}

            {/* Regular Notebooks */}
            {unpinnedNotebooks.length > 0 && (
              <div className="space-y-2">
                {pinnedNotebooks.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground px-2">
                    {t('notebooks.notebooks', 'Notebooks')}
                  </p>
                )}
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="notebooks">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                        {unpinnedNotebooks.map((notebook, index) => (
                          <Draggable key={notebook.id} draggableId={notebook.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(snapshot.isDragging && "opacity-80")}
                              >
                                <NotebookItem
                                  notebook={notebook}
                                  noteCount={getNotebookNoteCount(notebook.id)}
                                  isSelected={selectedNotebookId === notebook.id}
                                  onSelect={() => handleSelectNotebook(notebook.id)}
                                  onEdit={() => startEdit(notebook)}
                                  onDelete={() => setNotebookToDelete(notebook)}
                                  onTogglePin={() => handleTogglePin(notebook)}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Create New Notebook */}
            {isCreating ? (
              <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                <Input
                  placeholder={t('notebooks.notebookName', 'Notebook name')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder={t('notebooks.description', 'Description (optional)')}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  {NOTEBOOK_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all border-2",
                        newColor === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateNotebook} disabled={!newName.trim()}>
                    <Check className="h-4 w-4 mr-1" />
                    {t('common.create', 'Create')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={() => {
                  triggerHaptic('light');
                  setIsCreating(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('notebooks.newNotebook', 'New Notebook')}
              </Button>
            )}
          </div>
        </ScrollArea>

        {/* Edit Notebook Dialog */}
        {editingNotebook && (
          <Sheet open={!!editingNotebook} onOpenChange={() => setEditingNotebook(null)}>
            <SheetContent side="bottom" className="h-auto max-h-[70vh]">
              <SheetHeader>
                <SheetTitle>{t('notebooks.editNotebook', 'Edit Notebook')}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder={t('notebooks.notebookName', 'Notebook name')}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder={t('notebooks.description', 'Description (optional)')}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  {NOTEBOOK_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        editColor === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateNotebook} disabled={!editName.trim()} className="flex-1">
                    <Check className="h-4 w-4 mr-1" />
                    {t('common.save', 'Save')}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingNotebook(null)} className="flex-1">
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!notebookToDelete} onOpenChange={() => setNotebookToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('notebooks.deleteNotebook', 'Delete Notebook')}?</AlertDialogTitle>
              <AlertDialogDescription>
                {t('notebooks.deleteWarning', 'Notes in this notebook will be moved to All Notes. This action cannot be undone.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteNotebook}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common.delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};

// Individual Notebook Item Component
interface NotebookItemProps {
  notebook: Notebook;
  noteCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  dragHandleProps?: any;
}

const NotebookItem = ({
  notebook,
  noteCount,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onTogglePin,
  dragHandleProps,
}: NotebookItemProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer group",
        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      {dragHandleProps && (
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: notebook.color }}
      >
        <Book className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-medium truncate">{notebook.name}</p>
          {notebook.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
        </div>
        {notebook.description && (
          <p className="text-xs text-muted-foreground truncate">{notebook.description}</p>
        )}
      </div>
      
      <Badge variant="secondary" className="text-xs flex-shrink-0">
        {noteCount}
      </Badge>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onTogglePin}>
            {notebook.isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                {t('notebooks.unpin', 'Unpin')}
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                {t('notebooks.pin', 'Pin')}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            {t('common.edit', 'Edit')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete', 'Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {isSelected && (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      )}
    </div>
  );
};

export default NotebookNavigation;
