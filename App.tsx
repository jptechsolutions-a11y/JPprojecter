import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Columns, Users, Settings, Plus, Search, CalendarRange, List, BarChart3, ChevronDown, ChevronLeft, ChevronRight, LogOut, Sparkles, Repeat, Sun, Moon, Image as ImageIcon, Briefcase, Link as LinkIcon, X, Filter, Save, Bell, Info, ShieldAlert, CheckCircle, Video } from 'lucide-react';
import { Avatar } from './components/Avatar';
import { Modal } from './components/Modal';
import { TaskDetail } from './components/TaskDetail';
import { GanttView } from './components/GanttView';
import { ProjectListView } from './components/ProjectListView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { RoutineTasksView } from './components/RoutineTasksView';
import { AIAssistantView } from './components/AIAssistantView';
import { MeetingRoomView } from './components/MeetingRoomView';
import { TeamView } from './components/TeamView';
import { Task, User, Column, Status, Team, TaskGroup, RoutineTask, Notification } from './types';
import { api } from './services/dataService'; 
import { supabase } from './services/supabaseClient'; // Import Supabase Client

// Components
const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
  <button
    onClick={onClick}
    title={collapsed ? label : ''}
    className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg transition-all mb-1 ${
      active 
        ? 'bg-[#00b4d8] text-white shadow-md' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
    }`}
  >
    <Icon size={18} className="flex-shrink-0" />
    {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-sm">{label}</span>}
  </button>
);

const TaskCard: React.FC<{ task: Task; user?: User; onClick: () => void }> = ({ task, user, onClick }) => {
  const priorityColors = {
    'Baixa': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200 border-teal-200 dark:border-teal-800',
    'Média': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    'Alta': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {user && <Avatar src={user.avatar} alt={user.name} size="sm" />}
      </div>
      <h3 className="text-gray-800 dark:text-gray-100 font-semibold mb-3 leading-tight group-hover:text-[#00b4d8] transition-colors">
        {task.title}
      </h3>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 mb-2 overflow-hidden">
        <div 
            className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-teal-500' : 'bg-[#00b4d8]'}`} 
            style={{ width: `${task.progress}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 text-xs">
        <div className="flex items-center gap-3">
           {task.subtasks.length > 0 && (
             <span className="flex items-center gap-1" title="Checklist">
               <span className={completedSubtasks === task.subtasks.length ? 'text-teal-500' : ''}>
                 {completedSubtasks}/{task.subtasks.length}
               </span>
             </span>
           )}
           {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'board' | 'gantt' | 'dashboard' | 'team' | 'profile' | 'routines' | 'ai' | 'meeting'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); 
  
  // Data State - Initialized as null/empty
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [preSelectedGroupId, setPreSelectedGroupId] = useState<string | null>(null);
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Notification UI State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMyTasks, setFilterMyTasks] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  
  // Derived state safety checks
  const currentTeam = teams.find(t => t.id === currentTeamId) || (teams.length > 0 ? teams[0] : { id: 'loading', name: 'Carregando...', description: '', members: [] });
  const currentGroups = taskGroups.filter(g => g.teamId === currentTeamId);

  // --- Session Check & Data Loading ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Data Effect
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setIsLoadingData(true);
        // dataService handles logic if currentTeamId is null (fetches first team)
        const data = await api.fetchProjectData(currentTeamId);
        if (data) {
          setUsers(data.users);
          setTeams(data.teams);
          setTaskGroups(data.groups);
          setColumns(data.columns);
          setTasks(data.tasks);
          setRoutines(data.routines);
          setNotifications(data.notifications);
          
          // Set current user based on Auth Session
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
             // Find user in fetched profiles, or mock if not found (for safety)
             const foundUser = data.users.find((u: User) => u.email === session.user.email);
             if (foundUser) {
                 setCurrentUser(foundUser);
             } else {
                 // Fallback if profile trigger didn't run or is slow
                 setCurrentUser({
                     id: session.user.id,
                     name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
                     email: session.user.email || '',
                     role: 'Novo Usuário',
                     team: 't1'
                 });
             }
          } else if(data.users.length > 0) {
             // Fallback for dev/mock without real auth
             setCurrentUser(data.users[0]);
          }
          
          // Ensure we lock onto the actual team ID fetched
          if(data.teams.length > 0) {
              const activeTeam = currentTeamId ? data.teams.find((t: Team) => t.id === currentTeamId) : data.teams[0];
              if (activeTeam) setCurrentTeamId(activeTeam.id);
          }
        }
        setIsLoadingData(false);
      };
      loadData();
    }
  }, [isAuthenticated, currentTeamId]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
  };

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Filter Logic
  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(t => {
      // Team Filter
      if (t.teamId !== currentTeamId) return false;
      
      // My Tasks Filter
      if (filterMyTasks && t.assigneeId !== currentUser.id) return false;

      // Search
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      return true;
    });
  }, [tasks, currentTeamId, searchQuery, filterMyTasks, currentUser]);

  // --- Notification Helper ---
  const addNotification = (title: string, message: string, type: Notification['type'], userId: string = currentUser?.id || '0', taskId?: string) => {
      const newNote: Notification = {
          id: crypto.randomUUID(),
          userId, 
          type,
          title,
          message,
          read: false,
          timestamp: new Date().toISOString(),
          taskId
      };
      setNotifications(prev => [newNote, ...prev]);
  };

  // Actions
  const handleUpdateTask = async (updatedTask: Task) => {
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask && selectedTask.id === updatedTask.id) {
        setSelectedTask(updatedTask);
    }
    
    // API Call
    await api.updateTask(updatedTask);
    
    // Check if critical fields changed to notify (Local check)
    const oldTask = tasks.find(t => t.id === updatedTask.id);
    if (oldTask && currentUser) {
        if (oldTask.status !== updatedTask.status) {
            addNotification('Status Atualizado', `Tarefa "${updatedTask.title}" moveu para ${updatedTask.status}`, 'info', currentUser.id, updatedTask.id);
        }
        if (oldTask.approvalStatus !== updatedTask.approvalStatus && updatedTask.assigneeId) {
             const statusMsg = updatedTask.approvalStatus === 'approved' ? 'Aprovada' : updatedTask.approvalStatus === 'rejected' ? 'Rejeitada' : 'Pendente';
             addNotification('Atualização de Aprovação', `Sua tarefa foi ${statusMsg}`, updatedTask.approvalStatus === 'rejected' ? 'alert' : 'success', updatedTask.assigneeId, updatedTask.id);
        }
    }
  };

  const handleRequestApproval = (taskId: string, approverId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !currentUser) return;

      const updatedTask = { ...task, approvalStatus: 'pending' as const, approverId };
      handleUpdateTask(updatedTask);

      // Notify the approver
      addNotification('Aprovação Solicitada', `${currentUser.name} solicitou sua aprovação em "${task.title}"`, 'approval', approverId, taskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    // API
    await api.deleteTask(taskId);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const status = formData.get('status') as Status;
    const groupId = formData.get('groupId') as string;
    
    const today = new Date().toISOString().split('T')[0];

    const newTask: Task = {
      id: crypto.randomUUID(),
      groupId,
      title,
      status,
      description: '',
      priority: 'Média',
      startDate: today,
      tags: [],
      subtasks: [],
      progress: 0,
      attachments: [],
      comments: [],
      createdAt: new Date().toISOString(),
      teamId: currentTeamId || '',
      approvalStatus: 'none'
    };
    
    // Optimistic
    setTasks([...tasks, newTask]);
    setIsNewTaskModalOpen(false);
    setPreSelectedGroupId(null);
    addNotification('Nova Tarefa Criada', `A tarefa "${title}" foi adicionada ao quadro.`, 'success');

    // API
    await api.createTask(newTask);
  };

  // Routine Handlers
  const handleToggleRoutine = async (routineId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const newDate = routine.lastCompletedDate === today ? undefined : today;
    
    setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, lastCompletedDate: newDate } : r));
    await api.updateRoutine(routineId, { lastCompletedDate: newDate });
  };

  const handleAddRoutine = async (routine: RoutineTask) => {
      setRoutines([...routines, routine]);
      addNotification('Nova Rotina', `Rotina "${routine.title}" configurada.`, 'info');
      await api.createRoutine(routine);
  };

  const handleAddColumn = () => {
    // Column API creation not implemented in this snippet for brevity, but UI exists
    const newTitle = prompt("Nome da nova coluna:");
    if (newTitle) {
      const newColumn: Column = {
        id: newTitle,
        title: newTitle,
        color: 'bg-gray-100 dark:bg-gray-700'
      };
      setColumns([...columns, newColumn]);
    }
  };

  const handleUpdateProfile = (field: keyof User, value: any) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, [field]: value };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    // Note: API update for user profile would go here
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Renderers
  const renderBoard = () => (
    <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start snap-x">
      {columns.map(column => {
        const columnTasks = filteredTasks.filter(t => t.status === column.id);
        return (
          <div key={column.id} className="min-w-[300px] w-[300px] flex flex-col snap-center shrink-0">
            <div className={`flex items-center justify-between p-3 rounded-t-xl ${column.color} dark:bg-[#1e293b] border-b-2 border-[#00b4d8]`}>
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">{column.title}</h3>
              <span className="bg-white/50 dark:bg-black/30 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold">
                {columnTasks.length}
              </span>
            </div>
            <div className={`p-3 space-y-3 bg-gray-50 dark:bg-[#0f172a] border-x border-b border-gray-200 dark:border-gray-700 rounded-b-xl h-full min-h-[150px]`}>
              {columnTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  user={users.find(u => u.id === task.assigneeId)}
                  onClick={() => setSelectedTask(task)} 
                />
              ))}
            </div>
          </div>
        );
      })}
      <button 
        onClick={handleAddColumn}
        className="min-w-[300px] h-[150px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#00b4d8] hover:text-[#00b4d8] hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-all"
      >
        <Plus size={32} className="mb-2" />
        <span className="font-medium">Adicionar Coluna</span>
      </button>
    </div>
  );

  const renderProfile = () => {
    if (!currentUser) return <div>Carregando...</div>;
    return (
    <div className="max-w-5xl mx-auto mb-10">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div 
            className="h-48 bg-cover bg-center relative group"
            style={{ backgroundImage: `url(${currentUser.coverImage || 'https://via.placeholder.com/800x200'})` }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] to-transparent opacity-80"></div>
            <button 
                className="absolute bottom-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-lg transition-all flex items-center gap-2 text-sm backdrop-blur-sm border border-white/20"
                onClick={() => {
                    const url = prompt("URL da imagem de capa:", currentUser.coverImage);
                    if(url) handleUpdateProfile('coverImage', url);
                }}
            >
                <ImageIcon size={16} /> Alterar Capa
            </button>
        </div>
        
        <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6 relative">
                <div className="-mt-16 flex flex-col items-center md:items-start relative z-10">
                    <div className="relative group">
                        <Avatar src={currentUser.avatar} alt={currentUser.name} className="w-32 h-32 border-4 border-white dark:border-[#0f172a] text-3xl shadow-xl bg-white dark:bg-[#0f172a]" />
                        <button 
                            className="absolute bottom-0 right-0 bg-[#00b4d8] text-white p-2 rounded-full shadow-lg hover:bg-[#0096c7] transition-all transform hover:scale-110"
                            onClick={() => {
                                const url = prompt("URL da imagem de perfil:", currentUser.avatar);
                                if(url) handleUpdateProfile('avatar', url);
                            }}
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 mt-4 md:mt-2 space-y-1 text-center md:text-left">
                     <div className="flex items-center justify-center md:justify-start gap-2">
                        <input 
                            value={currentUser.name}
                            onChange={(e) => handleUpdateProfile('name', e.target.value)}
                            className="text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#00b4d8] outline-none transition-colors w-auto min-w-[200px]"
                        />
                     </div>
                     <div className="flex items-center justify-center md:justify-start gap-2">
                        <Briefcase size={14} className="text-[#00b4d8]" />
                        <input 
                            value={currentUser.role} 
                            onChange={(e) => handleUpdateProfile('role', e.target.value)}
                            className="text-gray-500 dark:text-gray-400 font-medium bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#00b4d8] outline-none transition-colors w-auto min-w-[200px]"
                            placeholder="Sua Função (ex: Dev Full Stack)"
                        />
                     </div>
                     <p className="text-gray-400 text-sm">{currentUser.email}</p>
                </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8">
                <section>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <Users size={18} className="text-[#00b4d8]" /> Sobre Mim
                    </h3>
                    <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 resize-none focus:ring-2 focus:ring-[#00b4d8] outline-none transition-all shadow-inner"
                        rows={4}
                        value={currentUser.bio || ''}
                        onChange={(e) => handleUpdateProfile('bio', e.target.value)}
                        placeholder="Escreva uma breve biografia..."
                    />
                </section>
                {/* Simplified profile for brevity, logic remains same */}
            </div>
        </div>
      </div>
    </div>
    );
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }
  
  if (isLoadingData) {
      return <div className="h-screen w-full flex items-center justify-center bg-[#021221] text-white">Carregando Projeto...</div>
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100`}>
      <aside 
        className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out relative shadow-sm z-30`}
      >
        {/* Sidebar content same as before, no changes needed for logic */}
        <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-8 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-md text-gray-500 hover:text-[#00b4d8] z-10"
        >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 relative h-20 flex items-center justify-center">
          <button 
            onClick={() => setIsTeamSelectorOpen(!isTeamSelectorOpen)}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
          >
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#00b4d8] rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {currentTeam?.name.substring(0, 2).toUpperCase()}
                </div>
                {!isSidebarCollapsed && (
                    <div className="text-left overflow-hidden">
                        <span className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase whitespace-nowrap">Time Atual</span>
                        <span className="block text-sm font-bold text-gray-800 dark:text-white truncate w-32">{currentTeam?.name}</span>
                    </div>
                )}
             </div>
             {!isSidebarCollapsed && <ChevronDown size={16} className="text-gray-500" />}
          </button>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
          <SidebarItem 
            icon={List} 
            label="Projetos (Lista)" 
            active={activeView === 'list'} 
            onClick={() => setActiveView('list')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={Columns} 
            label="Quadro Kanban" 
            active={activeView === 'board'} 
            onClick={() => setActiveView('board')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={CalendarRange} 
            label="Cronograma" 
            active={activeView === 'gantt'} 
            onClick={() => setActiveView('gantt')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={Repeat} 
            label="Rotinas" 
            active={activeView === 'routines'} 
            onClick={() => setActiveView('routines')} 
            collapsed={isSidebarCollapsed}
          />
           <SidebarItem 
            icon={Video} 
            label="Sala de Reunião" 
            active={activeView === 'meeting'} 
            onClick={() => setActiveView('meeting')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Indicadores" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={Sparkles} 
            label="IA Assistant" 
            active={activeView === 'ai'} 
            onClick={() => setActiveView('ai')} 
            collapsed={isSidebarCollapsed}
          />

          <div className={`pt-4 pb-2 transition-opacity ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Geral</span>
          </div>
          <SidebarItem 
            icon={Users} 
            label="Membros" 
            active={activeView === 'team'} 
            onClick={() => setActiveView('team')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={Settings} 
            label="Meu Perfil" 
            active={activeView === 'profile'} 
            onClick={() => setActiveView('profile')} 
            collapsed={isSidebarCollapsed}
          />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)}
             className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-100 text-gray-600'}`}
             title="Alternar Tema"
           >
             {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
           </button>
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
             title="Sair"
           >
             <LogOut size={18} />
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0f172a] transition-colors relative">
        {/* Header */}
        {activeView !== 'meeting' && (
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-[#1e293b] shrink-0 z-20 shadow-sm relative">
           <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">
                {activeView === 'list' ? 'Resumo do Projeto' : 
                 activeView === 'board' ? 'Quadro de Tarefas' : 
                 activeView === 'gantt' ? 'Cronograma' : 
                 activeView === 'dashboard' ? 'Indicadores & Retro' : 
                 activeView === 'profile' ? 'Meu Perfil' : 
                 activeView === 'routines' ? 'Tarefas de Rotina' :
                 activeView === 'ai' ? 'IA Assistant & Code' : 
                 activeView === 'meeting' ? 'Sala de Reunião' : 'Equipe'}
              </h2>
           </div>
           
           <div className="flex items-center gap-4">
             {/* Filter & Search */}
             {activeView !== 'profile' && activeView !== 'ai' && (
                 <div className="flex items-center gap-2">
                    {/* My Tasks Toggle */}
                    <button 
                        onClick={() => setFilterMyTasks(!filterMyTasks)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            filterMyTasks 
                            ? 'bg-[#00b4d8] text-white border-[#00b4d8]' 
                            : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-[#00b4d8]'
                        }`}
                    >
                        <Filter size={14} /> Minhas
                    </button>

                    <div className="relative hidden md:block group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00b4d8]" size={16} />
                        <input 
                        type="text" 
                        placeholder="Pesquisar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-[#0f172a] dark:text-white rounded-full text-sm focus:bg-white dark:focus:bg-[#0f172a] focus:ring-2 focus:ring-[#00b4d8] border border-transparent focus:border-transparent transition-all outline-none w-48 hover:w-64"
                        />
                    </div>
                </div>
             )}

             {/* Notifications */}
             <div className="relative">
                 <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 text-gray-500 hover:text-indigo-600 relative hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                 >
                     <Bell size={20} />
                     {unreadNotifications > 0 && (
                         <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-[#1e293b]"></span>
                     )}
                 </button>

                 {isNotificationsOpen && (
                     <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in-up overflow-hidden">
                         <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-[#0d1b2a]">
                             <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Notificações</h3>
                             <button onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} className="text-[10px] text-indigo-500 hover:underline">Marcar lidas</button>
                         </div>
                         <div className="max-h-80 overflow-y-auto">
                             {notifications.length === 0 ? (
                                 <div className="p-6 text-center text-gray-400 text-sm">
                                     Nenhuma notificação nova.
                                 </div>
                             ) : (
                                 notifications.map(note => (
                                     <div key={note.id} className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1b263b] transition-colors ${!note.read ? 'bg-indigo-50/30' : ''}`}>
                                         <div className="flex gap-3">
                                             <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                 note.type === 'approval' ? 'bg-yellow-100 text-yellow-600' :
                                                 note.type === 'alert' ? 'bg-red-100 text-red-600' :
                                                 note.type === 'success' ? 'bg-green-100 text-green-600' :
                                                 'bg-blue-100 text-blue-600'
                                             }`}>
                                                 {note.type === 'approval' ? <ShieldAlert size={14} /> :
                                                  note.type === 'alert' ? <ShieldAlert size={14} /> :
                                                  note.type === 'success' ? <CheckCircle size={14} /> :
                                                  <Info size={14} />}
                                             </div>
                                             <div>
                                                 <h4 className={`text-sm font-medium ${!note.read ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-300'}`}>{note.title}</h4>
                                                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{note.message}</p>
                                                 <span className="text-[10px] text-gray-400 mt-1 block">{new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                             </div>
                                         </div>
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>
                 )}
             </div>

             {/* Profile */}
             <div className="border-l border-gray-200 dark:border-gray-700 pl-4 cursor-pointer" onClick={() => setActiveView('profile')}>
                <Avatar src={currentUser?.avatar} alt={currentUser?.name || '?'} />
             </div>
           </div>
        </header>
        )}

        {/* View Content */}
        <div className={`flex-1 overflow-auto ${activeView === 'meeting' ? 'p-0' : 'p-6'}`}>
           {activeView === 'list' && (
              <ProjectListView 
                tasks={filteredTasks} 
                taskGroups={currentGroups} 
                users={users} 
                onTaskClick={setSelectedTask} 
                onAddTask={(groupId) => {
                  setPreSelectedGroupId(groupId);
                  setIsNewTaskModalOpen(true);
                }}
                onUpdateTask={handleUpdateTask}
              />
           )}
           {activeView === 'board' && renderBoard()}
           {activeView === 'gantt' && <GanttView tasks={filteredTasks} users={users} onTaskClick={setSelectedTask} />}
           {activeView === 'dashboard' && <DashboardView tasks={tasks.filter(t => t.teamId === currentTeamId)} users={users} />}
           {activeView === 'routines' && (
              <RoutineTasksView 
                  routines={routines} 
                  users={users} 
                  onToggleRoutine={handleToggleRoutine} 
                  onAddRoutine={handleAddRoutine}
              />
           )}
           {activeView === 'profile' && renderProfile()}
           {activeView === 'ai' && <AIAssistantView />}
           {activeView === 'meeting' && currentUser && <MeetingRoomView users={users} currentUser={currentUser} />}
           {activeView === 'team' && <TeamView users={users} currentTeam={currentTeam} />}
           
        </div>
      </main>

      {/* Modals remain the same... */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Detalhes da Tarefa"
      >
        {selectedTask && currentUser && (
          <TaskDetail 
            task={selectedTask} 
            users={users} 
            columns={columns}
            currentUser={currentUser}
            onUpdate={handleUpdateTask} 
            onDelete={handleDeleteTask}
            onRequestApproval={handleRequestApproval}
          />
        )}
      </Modal>

      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Criar Nova Tarefa"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título da Tarefa</label>
            <input 
              name="title" 
              type="text" 
              required
              autoFocus
              placeholder="Ex: Atualizar documentação da API"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none">
                  {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
              <select 
                name="groupId" 
                defaultValue={preSelectedGroupId || currentGroups[0]?.id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
              >
                  {currentGroups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button 
               type="button"
               onClick={() => setIsNewTaskModalOpen(false)}
               className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
             >
               Cancelar
             </button>
             <button 
               type="submit"
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
             >
               Criar Tarefa
             </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}