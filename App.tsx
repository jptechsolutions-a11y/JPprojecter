
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Layout, Columns, Users, Settings, Plus, Search, CalendarRange, List, BarChart3, ChevronDown, ChevronLeft, ChevronRight, LogOut, Repeat, Sun, Moon, FolderPlus, Building2, Loader2, Calendar as CalendarIcon, Clock, Trash2, AlertCircle, AlertTriangle, X, Edit2, Check, Inbox, Palette, Filter, Bell } from 'lucide-react';
import { Avatar } from './components/Avatar';
import { Modal } from './components/Modal';
import { TaskDetail } from './components/TaskDetail';
import { GanttView } from './components/GanttView';
import { ProjectListView } from './components/ProjectListView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { TeamOnboarding } from './components/TeamOnboarding';
import { RoutineTasksView } from './components/RoutineTasksView';
import { TeamView } from './components/TeamView';
import { ProfileView } from './components/ProfileView'; 
import { FilterPopover, FilterState } from './components/FilterPopover';
import { Task, User, Column, Status, Team, TaskGroup, RoutineTask, AppNotification, TeamRole, Subtask } from './types';
import { api } from './services/dataService'; 
import { supabase } from './services/supabaseClient';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
  <button
    onClick={onClick}
    title={collapsed ? label : ''}
    className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2 rounded-lg transition-all mb-1 ${
      active 
        ? 'bg-[#00b4d8] text-white shadow-md' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
    }`}
  >
    <Icon size={18} className="flex-shrink-0" />
    {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-xs">{label}</span>}
  </button>
);

// Updated Compact Task Card
const TaskCard: React.FC<{ task: Task; allUsers: User[]; onClick: () => void; onDragStart: (e: React.DragEvent, task: Task) => void }> = ({ task, allUsers, onClick, onDragStart }) => {
  const priorityColors = {
    'Baixa': 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    'Média': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    'Alta': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  // Responsibles
  const assignee = allUsers.find(u => u.id === task.assigneeId);
  const supportUsers = allUsers.filter(u => task.supportIds?.includes(u.id));
  const responsibles = Array.from(new Set([assignee, ...supportUsers].filter(Boolean))) as User[];

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className="bg-white dark:bg-[#1e293b] p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
    >
      {/* Tiny Labels Row */}
      <div className="flex gap-1 mb-1.5 flex-wrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          {task.dueDate && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'Concluído' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>
                  <Clock size={8} /> {new Date(task.dueDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
              </span>
          )}
      </div>
      
      <h3 className="text-gray-800 dark:text-gray-100 font-medium mb-1.5 leading-snug text-xs line-clamp-3">
        {task.title}
      </h3>
      
      {/* Thin Progress Bar */}
      {task.subtasks.length > 0 && (
        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full mb-1.5 overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${task.progress}%` }}
            ></div>
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <div className="flex -space-x-1.5 overflow-hidden pl-1">
            {responsibles.slice(0, 3).map(u => (
                <Avatar key={u.id} src={u.avatar} alt={u.name} size="sm" className="inline-block ring-1 ring-white dark:ring-[#1e293b] w-4 h-4 text-[8px]" />
            ))}
        </div>
        
        {task.subtasks.length > 0 && (
             <span className={`text-[9px] font-medium flex items-center gap-1 ${completedSubtasks === task.subtasks.length ? 'text-green-600' : 'text-gray-400'}`}>
               <Check size={10} /> {completedSubtasks}/{task.subtasks.length}
             </span>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'board' | 'gantt' | 'dashboard' | 'team' | 'profile' | 'routines'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // THEME: Default to Light (false)
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false); 
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [preSelectedGroupId, setPreSelectedGroupId] = useState<string | null>(null);
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter Logic
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
      status: [],
      priority: [],
      assigneeIds: [],
      tags: [],
      dateRange: { start: '', end: '' }
  });

  // Notifications Logic
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // New Task Form State
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<Partial<Subtask>[]>([]);
  const [newTaskSubTitle, setNewTaskSubTitle] = useState('');
  const [newTaskSubDuration, setNewTaskSubDuration] = useState(1);
  const [newTaskSubAssignee, setNewTaskSubAssignee] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(''); // Estado para o Responsável da Tarefa Principal
  const [newTaskStartDate, setNewTaskStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Kanban Customization State
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  
  // Column Color Picker State
  const [activeColorMenuColumnId, setActiveColorMenuColumnId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  const [hasTeams, setHasTeams] = useState<boolean>(true);

  const currentTeam = teams.find(t => t.id === currentTeamId) || (teams.length > 0 ? teams[0] : null);
  const currentGroups = taskGroups.filter(g => g.teamId === currentTeamId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if(session?.user) {
           setCurrentUser({
               id: session.user.id,
               name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
               email: session.user.email || '',
               role: 'Membro',
               team: '',
               avatar: session.user.user_metadata?.avatar_url
           });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveringPassword(true);
      } else {
          setIsAuthenticated(!!session);
          if (!session) {
              setTeams([]);
              setTasks([]);
              setCurrentUser(null);
          } else {
              setCurrentUser({
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || '',
                role: 'Membro',
                team: '',
                avatar: session.user.user_metadata?.avatar_url
              });
          }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoadingData(true);
        const data = await api.fetchProjectData(currentTeamId);
        
        if (data) {
          if (data.teams.length === 0) {
              setHasTeams(false);
          } else {
              setHasTeams(true);
              setUsers(data.users);
              setTeams(data.teams);
              setTaskGroups(data.groups);
              setColumns(data.columns);
              setTasks(data.tasks);
              setRoutines(data.routines);
              setNotifications(data.notifications);
              setRoles(data.roles || []);
              
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                  const foundUser = data.users.find((u: User) => u.id === session.user.id);
                  if (foundUser) {
                      const enrichedUser = { ...foundUser };
                      (enrichedUser as any).teamId = currentTeamId || data.teams[0].id;
                      setCurrentUser(enrichedUser);
                  }
              }

              if (!currentTeamId && data.teams.length > 0) {
                  setCurrentTeamId(data.teams[0].id);
              }
          }
        }
        setIsLoadingData(false);
  }, [currentTeamId, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]); 

  // Realtime Notifications Setup
  useEffect(() => {
    if (!currentUser) return;

    // Request permissions for browser notifications
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          // New notification received
          const newNotif = payload.new;
          
          const mappedNotif: AppNotification = {
            id: newNotif.id,
            userId: newNotif.user_id,
            taskId: newNotif.task_id,
            type: newNotif.type,
            title: newNotif.title,
            message: newNotif.message,
            read: newNotif.read,
            timestamp: newNotif.created_at
          };
          
          setNotifications(prev => [mappedNotif, ...prev]);
          
          // Browser Notification (Uses global Notification object)
          if (Notification.permission === 'granted') {
             new Notification(mappedNotif.title, { body: mappedNotif.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setHasTeams(true);
      setCurrentTeamId(null);
      setCurrentUser(null);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    
    return tasks.filter(t => {
      // 1. Basic Team Check
      if (t.teamId !== currentTeamId) return false;
      
      // 2. Search Query Check
      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          const matchesSearch = t.title.toLowerCase().includes(lowerQ) || 
                                t.tags.some(tag => tag.toLowerCase().includes(lowerQ));
          if (!matchesSearch) return false;
      }

      // 3. Advanced Filters
      
      // Status
      if (filters.status.length > 0 && !filters.status.includes(t.status)) return false;
      
      // Priority
      if (filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
      
      // Assignees
      if (filters.assigneeIds.length > 0) {
          // Check if assignee is in list OR if support contains user
          const isAssignee = t.assigneeId && filters.assigneeIds.includes(t.assigneeId);
          // const isSupport = t.supportIds && t.supportIds.some(id => filters.assigneeIds.includes(id));
          if (!isAssignee) return false;
      }

      // Date Range (Due Date)
      if (filters.dateRange.start && t.dueDate) {
          if (new Date(t.dueDate) < new Date(filters.dateRange.start)) return false;
      }
      if (filters.dateRange.end && t.dueDate) {
          if (new Date(t.dueDate) > new Date(filters.dateRange.end)) return false;
      }

      // Tags
      if (filters.tags.length > 0) {
          const hasTag = t.tags && t.tags.some(tag => filters.tags.includes(tag));
          if (!hasTag) return false;
      }

      return true;
    });
  }, [tasks, currentTeamId, searchQuery, filters, currentUser]);

  const allTags = useMemo(() => {
      const tags = new Set<string>();
      tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
      return Array.from(tags);
  }, [tasks]);

  const activeFiltersCount = filters.status.length + filters.priority.length + filters.assigneeIds.length + filters.tags.length + (filters.dateRange.start ? 1 : 0);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleTaskClick = async (task: Task) => {
      setSelectedTask(task);
      const fullTask = await api.getTaskDetails(task.id);
      if (fullTask) {
          setSelectedTask(fullTask);
          setTasks(prev => prev.map(t => t.id === fullTask.id ? fullTask : t));
      }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
      await api.markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      
      if (notification.taskId) {
          const task = tasks.find(t => t.id === notification.taskId);
          if (task) {
              handleTaskClick(task);
          } else {
              // Try fetching if not in list
              const fullTask = await api.getTaskDetails(notification.taskId);
              if(fullTask) {
                  setSelectedTask(fullTask);
              }
          }
      }
      setIsNotificationsOpen(false);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask && selectedTask.id === updatedTask.id) setSelectedTask(updatedTask);
    await api.updateTask(updatedTask);
  };

  const handleDeleteTask = async (taskId: string) => {
    if(!confirm('Excluir esta tarefa?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    await api.deleteTask(taskId);
  };

  // --- Kanban Column Management ---
  const handleAddColumn = async () => {
      if (!newColumnTitle.trim() || !currentTeamId) return;
      // Passa o teamId para criar a coluna vinculada ao time
      const newCol = await api.createColumn(currentTeamId, newColumnTitle.trim());
      if (newCol) {
          setColumns([...columns, newCol]);
          setNewColumnTitle('');
          setIsAddingColumn(false);
      }
  };

  const handleDeleteColumn = async (columnId: string, index: number) => {
      if (index === 0) {
          alert("A coluna 'Tarefas de Entrada' é padrão e não pode ser excluída.");
          return;
      }
      if (!confirm("Excluir esta lista? Tarefas nesta lista ficarão visíveis na primeira coluna.")) return;
      
      const success = await api.deleteColumn(columnId);
      if (success) {
          setColumns(columns.filter(c => c.id !== columnId));
      }
  };

  const startEditingColumn = (col: Column) => {
      setEditingColumnId(col.id);
      setEditingColumnTitle(col.title);
  };

  const handleUpdateColumn = async () => {
      if (editingColumnId && editingColumnTitle.trim()) {
          const success = await api.updateColumn(editingColumnId, { title: editingColumnTitle });
          if (success) {
              setColumns(columns.map(c => c.id === editingColumnId ? { ...c, title: editingColumnTitle } : c));
          }
      }
      setEditingColumnId(null);
  };

  const handleUpdateColumnColor = async (columnId: string, colorClass: string) => {
      // 1. Optimistic UI Update (Immediate)
      const oldColumns = [...columns];
      setColumns(columns.map(c => c.id === columnId ? { ...c, color: colorClass } : c));
      setActiveColorMenuColumnId(null);

      // 2. API Update
      const success = await api.updateColumn(columnId, { color: colorClass });
      
      // 3. Rollback if failed
      if (!success) {
          console.error("Failed to update column color");
          setColumns(oldColumns);
          alert("Erro ao salvar cor. Verifique se a coluna 'color' foi criada no banco de dados.");
      }
  };

  // ... Rest of the file logic ...
  // Task Creation Logic, etc.

  const handleAddSubtaskToForm = () => {
      if (!newTaskSubTitle.trim()) return;
      
      const start = new Date(newTaskStartDate);
      const end = new Date(start);
      end.setDate(end.getDate() + newTaskSubDuration);

      const sub: Partial<Subtask> = {
          title: newTaskSubTitle,
          duration: newTaskSubDuration,
          assigneeId: newTaskSubAssignee || undefined,
          startDate: newTaskStartDate, // Use Task Start Date
          dueDate: end.toISOString().split('T')[0] // Calculated End Date
      };

      setNewTaskSubtasks([...newTaskSubtasks, sub]);
      setNewTaskSubTitle('');
      setNewTaskSubDuration(1);
      setNewTaskSubAssignee('');
  };

  const handleRemoveSubtaskFromForm = (index: number) => {
      setNewTaskSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const calculateEndDate = () => {
      if (!newTaskStartDate) return '';
      const totalDays = newTaskSubtasks.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      if (totalDays === 0) return newTaskStartDate;
      
      const start = new Date(newTaskStartDate);
      const end = new Date(start);
      end.setDate(end.getDate() + totalDays);
      return end.toISOString().split('T')[0];
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(isCreatingTask) return;
    setIsCreatingTask(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const status = formData.get('status') as Status; 
    const groupId = formData.get('groupId') as string;
    
    const actualGroupId = groupId || (currentGroups.length > 0 ? currentGroups[0].id : '');
    
    if (!actualGroupId && currentGroups.length === 0) {
        alert("Crie um projeto antes de criar tarefas!");
        setIsCreatingTask(false);
        return;
    }

    const calculatedDueDate = calculateEndDate();
    
    // Default Kanban Column is the first one available
    const defaultKanbanColumnId = columns.length > 0 ? columns[0].id : undefined;

    const tempId = crypto.randomUUID();
    const newTask: Task = {
      id: tempId, // Temporary ID
      groupId: actualGroupId, 
      title, 
      status: status || 'A Fazer', 
      kanbanColumnId: defaultKanbanColumnId, // Set Default Column
      description: '', 
      priority: 'Média',
      startDate: newTaskStartDate,
      dueDate: calculatedDueDate,
      assigneeId: newTaskAssignee || undefined, // Set Assignee
      tags: [], subtasks: [] as any, progress: 0, attachments: [], comments: [],
      createdAt: new Date().toISOString(), teamId: currentTeamId || '',
      approvalStatus: 'none',
      color: 'default' // Default color
    };
    
    // Create task WITH subtasks
    const result = await api.createTask(newTask, newTaskSubtasks);
    
    if(result.success && result.data) {
        setTasks([...tasks, result.data]);
        setIsNewTaskModalOpen(false);
        // Reset Form
        setNewTaskSubtasks([]);
        setNewTaskSubTitle('');
        setNewTaskSubDuration(1);
        setNewTaskSubAssignee('');
        setNewTaskAssignee('');
        setNewTaskStartDate(new Date().toISOString().split('T')[0]);
        loadData();
    } else {
        alert("Erro ao criar tarefa.");
        console.error(result.error);
    }
    setIsCreatingTask(false);
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if(!currentTeamId) return;
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const color = formData.get('color') as string;

      const newGroup = await api.createTaskGroup(currentTeamId, title, color);
      if(newGroup) {
          setTaskGroups([...taskGroups, {id: newGroup.id, title: newGroup.title, color: newGroup.color, teamId: newGroup.teamId}]);
          setIsNewProjectModalOpen(false);
      }
  };

  const handleDeleteProject = async (groupId: string) => {
      if(!confirm('Excluir este projeto e todas as suas tarefas?')) return;
      const success = await api.deleteTaskGroup(groupId);
      if(success) {
          setTaskGroups(prev => prev.filter(g => g.id !== groupId));
          setTasks(prev => prev.filter(t => t.groupId !== groupId));
      }
  };

  const handleDeleteTeam = async (teamId: string) => {
      if (!confirm("ATENÇÃO: Você tem certeza que deseja excluir este time?\n\nIsso apagará permanentemente:\n- Todos os projetos\n- Todas as tarefas\n\nEssa ação não pode ser desfeita.")) return;
      setIsLoadingData(true);
      const success = await api.deleteTeam(teamId);
      if (success) {
          setTeams(prev => prev.filter(t => t.id !== teamId));
          setCurrentTeamId(null);
          await loadData();
      } else {
          alert("Erro ao excluir o time. Verifique se você é o dono (Admin).");
          setIsLoadingData(false);
      }
  };

  if (!isAuthenticated || isRecoveringPassword) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} initialMode={isRecoveringPassword ? 'update-password' : 'login'} />;
  }

  if (!hasTeams) {
    return currentUser ? <TeamOnboarding currentUser={currentUser} onComplete={loadData} /> : null;
  }

  // Define allowed List Colors (Expanded)
  const listColors = [
      { id: 'gray', class: 'bg-gray-100 dark:bg-gray-800' },
      { id: 'blue', class: 'bg-blue-100 dark:bg-blue-900/30' },
      { id: 'green', class: 'bg-green-100 dark:bg-green-900/30' },
      { id: 'yellow', class: 'bg-yellow-100 dark:bg-yellow-900/30' },
      { id: 'red', class: 'bg-red-100 dark:bg-red-900/30' },
      { id: 'purple', class: 'bg-purple-100 dark:bg-purple-900/30' },
      { id: 'pink', class: 'bg-pink-100 dark:bg-pink-900/30' },
      { id: 'indigo', class: 'bg-indigo-100 dark:bg-indigo-900/30' },
      { id: 'teal', class: 'bg-teal-100 dark:bg-teal-900/30' },
      { id: 'orange', class: 'bg-orange-100 dark:bg-orange-900/30' },
      { id: 'cyan', class: 'bg-cyan-100 dark:bg-cyan-900/30' },
      { id: 'lime', class: 'bg-lime-100 dark:bg-lime-900/30' },
  ];

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-[#021221] text-gray-900 dark:text-gray-100`}>
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-56'} bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 relative z-30 shadow-sm`}>
        {/* ... Sidebar content same as before ... */}
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-8 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-md text-gray-500 hover:text-[#00b4d8] z-10">
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 relative">
          <button onClick={() => setIsTeamSelectorOpen(!isTeamSelectorOpen)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00b4d8] rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {currentTeam?.name.substring(0, 2).toUpperCase() || 'JP'}
                </div>
                {!isSidebarCollapsed && (
                    <div className="text-left overflow-hidden">
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Time Atual</span>
                        <span className="block text-xs font-bold text-gray-800 dark:text-white truncate w-24">{currentTeam?.name || 'Selecione'}</span>
                    </div>
                )}
             </div>
             {!isSidebarCollapsed && <ChevronDown size={14} className="text-gray-500" />}
          </button>
          
          {isTeamSelectorOpen && !isSidebarCollapsed && (
              <div className="absolute top-full left-0 w-full bg-white dark:bg-[#1b263b] shadow-xl border border-gray-100 dark:border-gray-700 z-50 rounded-b-xl py-2 mt-[-10px] animate-fade-in">
                  <div className="px-3 py-1 mb-1 border-b border-gray-50 dark:border-gray-700">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Seus Times</span>
                  </div>
                  {teams.map(t => (
                      <button key={t.id} onClick={() => { setCurrentTeamId(t.id); setIsTeamSelectorOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#0d1b2a] flex items-center gap-2 ${currentTeamId === t.id ? 'text-[#00b4d8] font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                          <Building2 size={14} /> <span className="truncate">{t.name}</span>
                      </button>
                  ))}
                  <div className="p-2 mt-2 border-t border-gray-50 dark:border-gray-700">
                    <button onClick={() => setHasTeams(false)} className="w-full text-xs text-center text-[#00b4d8] hover:underline font-bold">+ Novo Time</button>
                  </div>
              </div>
          )}
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-hidden">
          <SidebarItem icon={List} label="Projetos (Lista)" active={activeView === 'list'} onClick={() => setActiveView('list')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Columns} label="Quadro Kanban" active={activeView === 'board'} onClick={() => setActiveView('board')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={CalendarRange} label="Cronograma" active={activeView === 'gantt'} onClick={() => setActiveView('gantt')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Repeat} label="Rotinas" active={activeView === 'routines'} onClick={() => setActiveView('routines')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={BarChart3} label="Indicadores" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} collapsed={isSidebarCollapsed} />
          
          <div className={`pt-4 pb-2 transition-opacity ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            <span className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Geral</span>
          </div>
          <SidebarItem icon={Users} label="Membros" active={activeView === 'team'} onClick={() => setActiveView('team')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Settings} label="Meu Perfil" active={activeView === 'profile'} onClick={() => setActiveView('profile')} collapsed={isSidebarCollapsed} />
           <div className="mt-4 px-2">
               <button onClick={() => setIsNewProjectModalOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-2'} border border-dashed border-gray-400 text-gray-500 hover:text-indigo-500 hover:border-indigo-500 p-2 rounded-lg transition-colors text-xs font-bold`}>
                   <FolderPlus size={16} /> {!isSidebarCollapsed && "Novo Projeto"}
               </button>
           </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
             <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-xs font-bold`}>
                 <LogOut size={15} /> {!isSidebarCollapsed && "Sair"}
             </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#021221] transition-colors relative">
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-[#1e293b] shrink-0 z-20 shadow-sm relative">
           {/* ... Header content ... */}
           <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">
                  JP Nexus
               </h2>
               <div className="hidden md:flex relative ml-4 items-center gap-2">
                   <div className="relative">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                       <input 
                          type="text" 
                          placeholder="Buscar tarefas..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-1.5 bg-gray-100 dark:bg-[#0f172a] border border-transparent focus:bg-white dark:focus:bg-[#0f172a] dark:text-white focus:ring-2 focus:ring-[#00b4d8] rounded-full text-xs outline-none transition-all w-56"
                       />
                   </div>
                   
                   {/* Filter Button */}
                   <div className="relative">
                       <button 
                          onClick={() => setIsFilterOpen(!isFilterOpen)} 
                          className={`p-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border ${activeFiltersCount > 0 ? 'bg-[#00b4d8] text-white border-[#00b4d8]' : 'bg-gray-100 dark:bg-[#0f172a] text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                       >
                           <Filter size={14} /> 
                           <span className="hidden sm:inline">Filtro</span>
                           {activeFiltersCount > 0 && (
                               <span className="bg-white text-[#00b4d8] rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{activeFiltersCount}</span>
                           )}
                       </button>
                       
                       <FilterPopover 
                          isOpen={isFilterOpen} 
                          onClose={() => setIsFilterOpen(false)} 
                          filters={filters} 
                          setFilters={setFilters} 
                          users={users}
                          availableTags={allTags}
                       />
                   </div>
               </div>
           </div>
           
           <div className="flex items-center gap-4">
             {/* Notification Bell */}
             <div className="relative">
                 <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
                 >
                    <Bell size={20} />
                    {unreadNotificationsCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1e293b]"></span>
                    )}
                 </button>

                 {isNotificationsOpen && (
                     <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in z-50">
                         <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-[#1b263b]">
                             <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Notificações</span>
                             <button onClick={() => { if(currentUser) api.markAllNotificationsAsRead(currentUser.id); setNotifications(prev => prev.map(n => ({...n, read: true}))); }} className="text-[10px] text-[#00b4d8] hover:underline font-bold">Marcar todas como lidas</button>
                         </div>
                         <div className="max-h-80 overflow-y-auto">
                             {notifications.length === 0 ? (
                                 <div className="p-6 text-center text-gray-400 text-xs italic">
                                     Nenhuma notificação recente.
                                 </div>
                             ) : (
                                 notifications.map(n => (
                                     <div 
                                        key={n.id} 
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#0f172a] cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                     >
                                         <div className="flex justify-between items-start mb-1">
                                             <span className={`text-xs font-bold ${!n.read ? 'text-[#00b4d8]' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</span>
                                             <span className="text-[9px] text-gray-400">{new Date(n.timestamp).toLocaleDateString()}</span>
                                         </div>
                                         <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>
                 )}
             </div>

             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-[#00b4d8]" />}
             </button>
             <div className="border-l border-gray-200 dark:border-gray-700 pl-4 cursor-pointer" onClick={() => setActiveView('profile')}>
                <Avatar src={currentUser?.avatar} alt={currentUser?.name || '?'} />
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-0 scrollbar-hide">
           {activeView === 'list' && <div className="p-6"><ProjectListView tasks={filteredTasks} taskGroups={currentGroups} users={users} onTaskClick={handleTaskClick} onAddTask={(groupId) => { setPreSelectedGroupId(groupId); setIsNewTaskModalOpen(true); }} onUpdateTask={handleUpdateTask} onDeleteProject={handleDeleteProject} /></div>}
           
           {/* Compact Trello-like Board View */}
           {activeView === 'board' && (
               <div className="h-full overflow-x-auto overflow-y-hidden whitespace-nowrap p-4 bg-[#0079bf] dark:bg-[#021221] bg-opacity-10 dark:bg-opacity-100">
                 <div className="flex h-full gap-2 items-start">
                     {columns.map((column, index) => {
                       const columnTasks = filteredTasks.filter(t => {
                           if (t.kanbanColumnId) return t.kanbanColumnId === column.id;
                           return index === 0; // Default bucket for legacy tasks or default logic
                       });

                       return (
                         <div 
                            key={column.id} 
                            // Reduced width w-64 for more compact view
                            className={`w-64 flex-shrink-0 flex flex-col max-h-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors ${column.color}`}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} 
                            onDrop={(e) => {
                                e.preventDefault();
                                const taskId = e.dataTransfer.getData('taskId');
                                const task = tasks.find(t => t.id === taskId);
                                
                                // FIX: Update only kanbanColumnId, NOT status.
                                if(task && task.kanbanColumnId !== column.id) {
                                    handleUpdateTask({ ...task, kanbanColumnId: column.id });
                                }
                            }}
                         >
                           {/* Column Header */}
                           <div className="p-2 font-bold text-gray-700 dark:text-gray-200 text-xs flex justify-between items-center handle cursor-grab active:cursor-grabbing border-b border-gray-200/50 dark:border-gray-600/50">
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                                {index === 0 && <Inbox size={14} className="text-[#00b4d8]" />}
                                {editingColumnId === column.id ? (
                                    <input 
                                        autoFocus
                                        value={editingColumnTitle}
                                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                                        onBlur={handleUpdateColumn}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumn()}
                                        className="w-full bg-white dark:bg-[#0f172a] border border-[#00b4d8] rounded px-1 text-xs outline-none"
                                    />
                                ) : (
                                    <span 
                                        className="truncate cursor-text hover:text-[#00b4d8] transition-colors"
                                        onClick={() => startEditingColumn(column)}
                                        title="Clique para editar"
                                    >
                                        {column.title}
                                    </span>
                                )}
                                <span className="bg-black/10 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-1.5 rounded text-[10px]">{columnTasks.length}</span>
                             </div>
                             
                             <div className="flex items-center gap-1 relative">
                                 {/* Column Color Picker Trigger */}
                                 <button 
                                    onClick={() => setActiveColorMenuColumnId(activeColorMenuColumnId === column.id ? null : column.id)}
                                    className="p-1 text-gray-400 hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                                 >
                                     <Palette size={12} />
                                 </button>

                                 {/* Color Menu Popover */}
                                 {activeColorMenuColumnId === column.id && (
                                     <div className="absolute top-6 right-0 z-50 bg-white dark:bg-[#1e293b] p-2 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-1 w-32 animate-fade-in">
                                         {listColors.map(c => (
                                             <button 
                                                key={c.id}
                                                onClick={() => handleUpdateColumnColor(column.id, c.class)}
                                                className={`w-5 h-5 rounded-full ${c.class} border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform`}
                                                title={c.id}
                                             />
                                         ))}
                                     </div>
                                 )}

                                 {index !== 0 && ( // Prevent deleting the first column
                                     <button onClick={() => handleDeleteColumn(column.id, index)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors">
                                         <Trash2 size={12} />
                                     </button>
                                 )}
                             </div>
                           </div>
                           
                           {/* Cards Container - Dense Spacing */}
                           <div className="p-1.5 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar min-h-[50px]">
                             {columnTasks.map(task => (
                               <TaskCard 
                                key={task.id} 
                                task={task} 
                                allUsers={users} 
                                onClick={() => handleTaskClick(task)} 
                                onDragStart={(e, t) => e.dataTransfer.setData('taskId', t.id)}
                               />
                             ))}
                           </div>

                           {/* Column Footer */}
                           <div className="p-1.5 pt-0">
                               <button 
                                onClick={() => { setIsNewTaskModalOpen(true); /* You might want to pre-select status here in a real app */ }}
                                className="w-full py-1 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-md text-[10px] font-medium px-2 transition-colors"
                                >
                                   <Plus size={12} /> Adicionar cartão
                               </button>
                           </div>
                         </div>
                       );
                     })}

                     {/* Add List Button */}
                     <div className="w-64 flex-shrink-0">
                        {isAddingColumn ? (
                            <div className="bg-gray-100 dark:bg-[#1e293b] p-2 rounded-xl border border-gray-300 dark:border-gray-700 animate-fade-in">
                                <input 
                                    autoFocus
                                    value={newColumnTitle}
                                    onChange={(e) => setNewColumnTitle(e.target.value)}
                                    placeholder="Título da lista..."
                                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg mb-2 focus:ring-2 focus:ring-[#00b4d8] outline-none bg-white dark:bg-[#0f172a] dark:text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddColumn} className="bg-[#00b4d8] hover:bg-[#0096c7] text-white px-3 py-1.5 rounded text-[10px] font-bold transition-colors">Adicionar</button>
                                    <button onClick={() => setIsAddingColumn(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={16} /></button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAddingColumn(true)}
                                className="w-full bg-white/20 hover:bg-white/30 dark:bg-gray-800/50 dark:hover:bg-gray-800/80 p-3 rounded-xl text-white dark:text-gray-300 text-xs font-bold flex items-center gap-2 transition-all backdrop-blur-sm border border-white/10 dark:border-gray-700"
                            >
                                <Plus size={14} /> Adicionar lista
                            </button>
                        )}
                     </div>
                 </div>
               </div>
           )}

           {/* ... Other views ... */}
           {activeView === 'gantt' && <div className="p-6 h-full"><GanttView tasks={filteredTasks} users={users} onTaskClick={handleTaskClick} /></div>}
           {activeView === 'dashboard' && <div className="p-6"><DashboardView tasks={tasks.filter(t => t.teamId === currentTeamId)} users={users} /></div>}
           {activeView === 'routines' && <div className="p-6"><RoutineTasksView routines={routines} users={users} currentTeamId={currentTeamId || ''} onToggleRoutine={(id) => { api.updateRoutine(id, { lastCompletedDate: new Date().toISOString().split('T')[0] }).then(loadData); }} onAddRoutine={async (r) => { await api.createRoutine(r); loadData(); }} /></div>}
           {activeView === 'profile' && currentUser && <div className="p-6"><ProfileView currentUser={currentUser} /></div>}
           {activeView === 'team' && currentTeam && currentUser && <div className="p-6"><TeamView users={users} currentTeam={currentTeam} currentUser={currentUser} onDeleteTeam={handleDeleteTeam} roles={roles} onRolesUpdate={loadData} /></div>}
        </div>
      </main>

      {/* ... Modals (New Task, New Project) keep same ... */}
      {/* Task Modal */}
      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Detalhes da Tarefa" maxWidth="max-w-5xl">
        {selectedTask && currentUser && <TaskDetail task={selectedTask} taskGroups={currentGroups} users={users} columns={columns} currentUser={currentUser} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onRequestApproval={() => {}} />}
      </Modal>

      {/* New Task Modal Expanded */}
      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title="Criar Nova Tarefa" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateTask} className="space-y-6">
          {/* ... Task Form Fields ... */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Título da Tarefa</label>
                <input name="title" required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#00b4d8] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Grupo / Projeto</label>
                <select name="groupId" defaultValue={preSelectedGroupId || ''} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white outline-none">
                    {currentGroups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
          </div>

          <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-sm font-bold mb-1 dark:text-gray-300 flex items-center gap-2"><CalendarIcon size={14} /> Data de Início</label>
                <input 
                    type="date" 
                    value={newTaskStartDate} 
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                />
             </div>
             <div className="flex-1">
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Status Inicial</label>
                <select name="status" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white outline-none">
                    <option value="A Fazer">A Fazer</option>
                    <option value="Em Progresso">Em Progresso</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Em Pausa">Em Pausa</option>
                    <option value="Concluído">Concluído</option>
                </select>
             </div>
          </div>

          <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Responsável pela Tarefa</label>
                <select 
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                >
                    <option value="">Selecione um responsável...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
          </div>

          {/* Subtasks Section */}
          <div className="bg-gray-50 dark:bg-[#0f172a] p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              {/* ... Subtask UI same as before ... */}
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                  <span>Atividades da Tarefa</span>
                  <span className="text-xs font-normal text-gray-500">Defina responsável e prazo para cada etapa</span>
              </h4>
              
              <div className="space-y-2 mb-3">
                  {newTaskSubtasks.map((sub, idx) => {
                      const assigneeName = users.find(u => u.id === sub.assigneeId)?.name || 'Sem dono';
                      return (
                      <div key={idx} className="flex flex-col gap-1 bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{sub.title}</span>
                              <button type="button" onClick={() => handleRemoveSubtaskFromForm(idx)} className="text-red-400 hover:text-red-500">
                                  <Trash2 size={14} />
                              </button>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500">
                              <span>{sub.duration} dias</span> • 
                              <span>{new Date(sub.startDate!).toLocaleDateString()} - {new Date(sub.dueDate!).toLocaleDateString()}</span> •
                              <span>{assigneeName}</span>
                          </div>
                      </div>
                      )
                  })}
                  {newTaskSubtasks.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-2">Nenhuma atividade adicionada.</p>
                  )}
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Atividade</label>
                      <input 
                          value={newTaskSubTitle}
                          onChange={(e) => setNewTaskSubTitle(e.target.value)}
                          placeholder="Ex: Criar Wireframe"
                          className="w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-[#1e293b] dark:border-gray-600 outline-none"
                      />
                  </div>
                  <div className="col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Duração</label>
                      <input 
                          type="number"
                          min="1"
                          value={newTaskSubDuration}
                          onChange={(e) => setNewTaskSubDuration(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-[#1e293b] dark:border-gray-600 outline-none"
                      />
                  </div>
                  <div className="col-span-3">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Responsável</label>
                      <select 
                          value={newTaskSubAssignee}
                          onChange={(e) => setNewTaskSubAssignee(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-[#1e293b] dark:border-gray-600 outline-none"
                      >
                          <option value="">Ninguém</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                  </div>
                  <div className="col-span-2">
                      <button 
                          type="button" 
                          onClick={handleAddSubtaskToForm}
                          className="w-full px-2 py-1.5 bg-[#00b4d8] text-white rounded text-sm font-bold hover:bg-[#0096c7]"
                      >
                          Add
                      </button>
                  </div>
              </div>
          </div>

          {/* Auto Calculated Summary */}
          <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                  <Clock size={16} /> Total Esforço: {newTaskSubtasks.reduce((acc, curr) => acc + (curr.duration || 0), 0)} dias
              </div>
              <div className="text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                  Previsão de Entrega: {new Date(calculateEndDate()).toLocaleDateString('pt-BR')}
              </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Cancelar</button>
            <button type="submit" disabled={isCreatingTask} className="px-6 py-2 bg-[#00b4d8] text-white rounded-lg font-bold hover:bg-[#0096c7] transition-colors flex items-center gap-2">
                {isCreatingTask ? <Loader2 size={16} className="animate-spin" /> : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </Modal>

      {/* New Project Modal (Fixed Colors) */}
      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Novo Projeto" maxWidth="max-w-md">
        <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nome do Projeto</label>
                <input 
                    name="title" 
                    required 
                    className="w-full px-4 py-3 border rounded-lg bg-gray-50 dark:bg-[#1e293b] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#00b4d8] outline-none transition-all"
                    placeholder="Ex: Marketing Digital"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Cor de Identificação</label>
                <div className="flex gap-3">
                    {['#00b4d8', '#a25ddc', '#fdab3d', '#ff5c8d', '#20c997'].map(color => (
                        <label key={color} className="cursor-pointer relative">
                            <input type="radio" name="color" value={color} className="peer sr-only" defaultChecked={color === '#00b4d8'} />
                            <div className="w-10 h-10 rounded-full hover:scale-110 transition-transform shadow-sm" style={{backgroundColor: color}}></div>
                            <div className="absolute inset-0 rounded-full border-2 border-white dark:border-[#0f172a] peer-checked:ring-2 peer-checked:ring-offset-2 ring-[#00b4d8] opacity-0 peer-checked:opacity-100 transition-all"></div>
                        </label>
                    ))}
                </div>
            </div>
            <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-white">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-[#00b4d8] text-white rounded-lg font-bold hover:bg-[#0096c7] shadow-lg shadow-cyan-500/20 transition-all">Criar</button>
            </div>
        </form>
      </Modal>
    </div>
  );
}
