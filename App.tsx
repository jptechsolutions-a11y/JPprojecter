import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Layout, Columns, Users, Settings, Plus, Search, CalendarRange, List, BarChart3, ChevronDown, ChevronLeft, ChevronRight, LogOut, Sparkles, Repeat, Sun, Moon, Image as ImageIcon, Briefcase, Link as LinkIcon, X, Filter, Save, Bell, Info, ShieldAlert, CheckCircle, Video, FolderPlus } from 'lucide-react';
import { Avatar } from './components/Avatar';
import { Modal } from './components/Modal';
import { TaskDetail } from './components/TaskDetail';
import { GanttView } from './components/GanttView';
import { ProjectListView } from './components/ProjectListView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { TeamOnboarding } from './components/TeamOnboarding';
import { RoutineTasksView } from './components/RoutineTasksView';
import { AIAssistantView } from './components/AIAssistantView';
import { MeetingRoomView } from './components/MeetingRoomView';
import { TeamView } from './components/TeamView';
import { ProfileView } from './components/ProfileView'; // Import New Profile
import { Task, User, Column, Status, Team, TaskGroup, RoutineTask, Notification } from './types';
import { api } from './services/dataService'; 
import { supabase } from './services/supabaseClient';

// Components
// SMALLER ICONS AND PADDING
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
    <Icon size={15} className="flex-shrink-0" />
    {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-xs">{label}</span>}
  </button>
);

const TaskCard: React.FC<{ task: Task; user?: User; onClick: () => void; onDragStart: (e: React.DragEvent, task: Task) => void }> = ({ task, user, onClick, onDragStart }) => {
  const priorityColors = {
    'Baixa': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200 border-teal-200 dark:border-teal-800',
    'Média': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    'Alta': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {user && <Avatar src={user.avatar} alt={user.name} size="sm" />}
      </div>
      <h3 className="text-gray-800 dark:text-gray-100 font-semibold mb-3 leading-tight group-hover:text-[#00b4d8] transition-colors text-sm">
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
  
  // Data State
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
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false); // Modal for New Project (Group)
  const [preSelectedGroupId, setPreSelectedGroupId] = useState<string | null>(null);
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Notification UI State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMyTasks, setFilterMyTasks] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  const [hasTeams, setHasTeams] = useState<boolean>(true); // Assume true initially

  // Derived state
  const currentTeam = teams.find(t => t.id === currentTeamId) || (teams.length > 0 ? teams[0] : null);
  const currentGroups = taskGroups.filter(g => g.teamId === currentTeamId);

  // --- Session Check ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if(session?.user) {
          // Temporarily set a shell user until profile loads
           setCurrentUser({
               id: session.user.id,
               name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
               email: session.user.email || '',
               role: 'Loading...',
               team: ''
           });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Loading Wrapper ---
  const loadData = useCallback(async () => {
        setIsLoadingData(true);
        const data = await api.fetchProjectData(currentTeamId);
        
        if (data) {
          // Check if user has ANY teams. If teams array is empty, we must trigger onboarding.
          if (data.teams.length === 0) {
              setHasTeams(false);
              // Still set user info if available from auth even if no teams
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                 setCurrentUser({
                     id: session.user.id,
                     name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
                     email: session.user.email || '',
                     role: 'Novo Membro',
                     team: ''
                 });
              }
          } else {
              setHasTeams(true);
              setUsers(data.users);
              setTeams(data.teams);
              setTaskGroups(data.groups);
              setColumns(data.columns);
              setTasks(data.tasks);
              setRoutines(data.routines);
              setNotifications(data.notifications);
              
              // Resolve Current User from fetched profiles
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                  const foundUser = data.users.find((u: User) => u.id === session.user.id);
                  if (foundUser) setCurrentUser(foundUser);
              }

              // Set active Team
              if (!currentTeamId && data.teams.length > 0) {
                  setCurrentTeamId(data.teams[0].id);
              }
          }
        }
        setIsLoadingData(false);
  }, [currentTeamId]);

  // Trigger Load
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setHasTeams(true); // Reset state
      setCurrentTeamId(null);
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

  // Notification Helper
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

  // --- Task CRUD Wrappers (Optimistic updates handled here) ---
  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask && selectedTask.id === updatedTask.id) setSelectedTask(updatedTask);
    await api.updateTask(updatedTask);
  };

  const handleRequestApproval = (taskId: string, approverId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !currentUser) return;
      const updatedTask = { ...task, approvalStatus: 'pending' as const, approverId };
      handleUpdateTask(updatedTask);
      addNotification('Aprovação Solicitada', `${currentUser.name} solicitou sua aprovação`, 'approval', approverId, taskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    await api.deleteTask(taskId);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const status = formData.get('status') as Status;
    const groupId = formData.get('groupId') as string;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      groupId,
      title,
      status,
      description: '',
      priority: 'Média',
      startDate: new Date().toISOString().split('T')[0],
      tags: [],
      subtasks: [],
      progress: 0,
      attachments: [],
      comments: [],
      createdAt: new Date().toISOString(),
      teamId: currentTeamId || '',
      approvalStatus: 'none'
    };
    
    setTasks([...tasks, newTask]);
    setIsNewTaskModalOpen(false);
    addNotification('Nova Tarefa', `Tarefa "${title}" criada.`, 'success');
    await api.createTask(newTask);
  };

  // --- Project (Group) Create ---
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
          addNotification('Projeto Criado', `Projeto "${title}" criado com sucesso.`, 'success');
      }
  };

  // --- Kanban Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, task: Task) => {
      e.dataTransfer.setData('taskId', task.id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      const task = tasks.find(t => t.id === taskId);
      
      if(task && task.status !== statusId) {
          // Optimistic update
          const updatedTask = { ...task, status: statusId };
          setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
          
          // API Call
          api.updateTask(updatedTask);
          
          // Optional: Add notification toast
          // addNotification('Tarefa Movida', `${task.title} movida para ${statusId}`, 'info');
      }
  };


  // --- Views ---
  const renderBoard = () => (
    <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start snap-x">
      {columns.map(column => {
        const columnTasks = filteredTasks.filter(t => t.status === column.id);
        return (
          <div 
            key={column.id} 
            className="min-w-[300px] w-[300px] flex flex-col snap-center shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`flex items-center justify-between p-3 rounded-t-xl ${column.color} dark:bg-[#1e293b] border-b-2 border-[#00b4d8]`}>
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">{column.title}</h3>
              <span className="bg-white/50 dark:bg-black/30 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold">
                {columnTasks.length}
              </span>
            </div>
            <div className={`p-3 space-y-3 bg-gray-50 dark:bg-[#0f172a] border-x border-b border-gray-200 dark:border-gray-700 rounded-b-xl h-full min-h-[150px] transition-colors ${columnTasks.length === 0 ? 'opacity-80' : ''}`}>
              {columnTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  user={users.find(u => u.id === task.assigneeId)}
                  onClick={() => setSelectedTask(task)} 
                  onDragStart={handleDragStart}
                />
              ))}
              {columnTasks.length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                      Arraste itens aqui
                  </div>
              )}
            </div>
          </div>
        );
      })}
       {/* Add Column Button (Simplified) */}
      <button className="min-w-[300px] h-[150px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#00b4d8] hover:text-[#00b4d8] transition-all">
        <Plus size={32} />
      </button>
    </div>
  );

  // --- Main Render Flow ---

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  if (isLoadingData) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#021221] text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00b4d8] mb-4"></div>
            <p className="animate-pulse">Sincronizando Workspace...</p>
        </div>
      );
  }

  // FORCE TEAM ONBOARDING IF NO TEAMS
  if (!hasTeams && currentUser) {
      return <TeamOnboarding currentUser={currentUser} onComplete={() => loadData()} />;
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100`}>
      <aside 
        className={`${isSidebarCollapsed ? 'w-16' : 'w-56'} bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out relative shadow-sm z-30`}
      >
        <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-8 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-md text-gray-500 hover:text-[#00b4d8] z-10"
        >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 relative h-16 flex items-center justify-center">
          <button 
            onClick={() => setIsTeamSelectorOpen(!isTeamSelectorOpen)}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
          >
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00b4d8] rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {currentTeam?.name.substring(0, 2).toUpperCase() || 'JP'}
                </div>
                {!isSidebarCollapsed && (
                    <div className="text-left overflow-hidden">
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase whitespace-nowrap">Time</span>
                        <span className="block text-xs font-bold text-gray-800 dark:text-white truncate w-24">{currentTeam?.name || 'Selecione'}</span>
                    </div>
                )}
             </div>
             {!isSidebarCollapsed && <ChevronDown size={14} className="text-gray-500" />}
          </button>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-hidden">
          <SidebarItem icon={List} label="Projetos (Lista)" active={activeView === 'list'} onClick={() => setActiveView('list')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Columns} label="Quadro Kanban" active={activeView === 'board'} onClick={() => setActiveView('board')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={CalendarRange} label="Cronograma" active={activeView === 'gantt'} onClick={() => setActiveView('gantt')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Repeat} label="Rotinas" active={activeView === 'routines'} onClick={() => setActiveView('routines')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Video} label="Sala de Reunião" active={activeView === 'meeting'} onClick={() => setActiveView('meeting')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={BarChart3} label="Indicadores" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Sparkles} label="IA Assistant" active={activeView === 'ai'} onClick={() => setActiveView('ai')} collapsed={isSidebarCollapsed} />
          
          <div className={`pt-4 pb-2 transition-opacity ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            <span className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Geral</span>
          </div>
          <SidebarItem icon={Users} label="Membros" active={activeView === 'team'} onClick={() => setActiveView('team')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Settings} label="Meu Perfil" active={activeView === 'profile'} onClick={() => setActiveView('profile')} collapsed={isSidebarCollapsed} />
          
           {/* Add Project Button */}
           <div className="mt-4 px-2">
               <button 
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-2'} border border-dashed border-gray-400 text-gray-500 hover:text-indigo-500 hover:border-indigo-500 p-2 rounded-lg transition-colors text-xs font-bold`}
               >
                   <FolderPlus size={16} />
                   {!isSidebarCollapsed && "Novo Projeto"}
               </button>
           </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-100 text-gray-600'}`}>
             {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
           </button>
           <button onClick={handleLogout} className="w-full flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
             <LogOut size={16} />
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0f172a] transition-colors relative">
        {/* Header */}
        {activeView !== 'meeting' && (
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-[#1e293b] shrink-0 z-20 shadow-sm relative">
           <h2 className="text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">
              {activeView === 'list' ? 'Resumo do Projeto' : activeView === 'board' ? 'Quadro de Tarefas' : activeView === 'gantt' ? 'Cronograma' : activeView === 'dashboard' ? 'Indicadores & Retro' : activeView === 'team' ? 'Gestão de Equipe' : 'JP Projects'}
           </h2>
           <div className="flex items-center gap-4">
             {activeView !== 'profile' && activeView !== 'ai' && (
                 <div className="flex items-center gap-2">
                    <button onClick={() => setFilterMyTasks(!filterMyTasks)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterMyTasks ? 'bg-[#00b4d8] text-white border-[#00b4d8]' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-[#00b4d8]'}`}>
                        <Filter size={14} /> Minhas
                    </button>
                    <div className="relative hidden md:block group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00b4d8]" size={16} />
                        <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-[#0f172a] dark:text-white rounded-full text-sm focus:bg-white dark:focus:bg-[#0f172a] focus:ring-2 focus:ring-[#00b4d8] border border-transparent focus:border-transparent transition-all outline-none w-48 hover:w-64" />
                    </div>
                </div>
             )}
             <div className="relative">
                 <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 text-gray-500 hover:text-indigo-600 relative hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                     <Bell size={20} />
                     {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-[#1e293b]"></span>}
                 </button>
                 {isNotificationsOpen && (
                     <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in-up">
                         <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-bold text-sm">Notificações</div>
                         <div className="max-h-80 overflow-y-auto p-2 text-xs text-gray-500">{notifications.length === 0 ? 'Nada por aqui.' : 'Notificações...'}</div>
                     </div>
                 )}
             </div>
             <div className="border-l border-gray-200 dark:border-gray-700 pl-4 cursor-pointer" onClick={() => setActiveView('profile')}>
                <Avatar src={currentUser?.avatar} alt={currentUser?.name || '?'} />
             </div>
           </div>
        </header>
        )}

        {/* Dynamic View Content */}
        <div className={`flex-1 overflow-auto ${activeView === 'meeting' ? 'p-0' : 'p-6'}`}>
           {activeView === 'list' && <ProjectListView tasks={filteredTasks} taskGroups={currentGroups} users={users} onTaskClick={setSelectedTask} onAddTask={(groupId) => { setPreSelectedGroupId(groupId); setIsNewTaskModalOpen(true); }} onUpdateTask={handleUpdateTask} />}
           {activeView === 'board' && renderBoard()}
           {activeView === 'gantt' && <GanttView tasks={filteredTasks} users={users} onTaskClick={setSelectedTask} />}
           {activeView === 'dashboard' && <DashboardView tasks={tasks.filter(t => t.teamId === currentTeamId)} users={users} />}
           {activeView === 'routines' && <RoutineTasksView routines={routines} users={users} currentTeamId={currentTeamId || ''} onToggleRoutine={(id) => { const r = routines.find(x => x.id === id); if(r) api.updateRoutine(id, { lastCompletedDate: new Date().toISOString().split('T')[0] }).then(loadData); }} onAddRoutine={async (r) => { await api.createRoutine(r); loadData(); }} />}
           {activeView === 'profile' && currentUser && <ProfileView currentUser={currentUser} />}
           {activeView === 'ai' && <AIAssistantView />}
           {activeView === 'meeting' && currentUser && <MeetingRoomView users={users} currentUser={currentUser} />}
           {activeView === 'team' && currentTeam && <TeamView users={users} currentTeam={currentTeam} />}
        </div>
      </main>

      {/* Task Modals */}
      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Detalhes da Tarefa">
        {selectedTask && currentUser && <TaskDetail task={selectedTask} users={users} columns={columns} currentUser={currentUser} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onRequestApproval={handleRequestApproval} />}
      </Modal>

      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title="Criar Nova Tarefa" maxWidth="max-w-md">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Título</label><input name="title" required className="w-full px-3 py-2 border rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Status</label><select name="status" className="w-full px-3 py-2 border rounded-lg">{columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Grupo</label><select name="groupId" defaultValue={preSelectedGroupId || ''} className="w-full px-3 py-2 border rounded-lg">{currentGroups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          </div>
          <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="px-4 py-2 text-gray-600">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Criar</button></div>
        </form>
      </Modal>

      {/* New Project Modal */}
      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Novo Projeto" maxWidth="max-w-md">
        <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Nome do Projeto</label>
                <input name="title" required placeholder="Ex: Campanha de Marketing 2025" className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Cor de Identificação</label>
                <div className="flex gap-2">
                    {['#00b4d8', '#a25ddc', '#fdab3d', '#ff5c8d', '#48cae4', '#20c997'].map(color => (
                        <label key={color} className="cursor-pointer">
                            <input type="radio" name="color" value={color} className="peer sr-only" defaultChecked={color === '#00b4d8'} />
                            <div className="w-8 h-8 rounded-full peer-checked:ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 peer-checked:scale-110 transition-all" style={{backgroundColor: color}}></div>
                        </label>
                    ))}
                </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Criar Projeto</button>
            </div>
        </form>
      </Modal>
    </div>
  );
}