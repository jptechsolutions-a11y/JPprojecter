import React, { useState } from 'react';
import { Task, TaskGroup, User, Status, Priority } from '../types';
import { ChevronDown, ChevronRight, Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle2, Clock, CornerDownRight, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { Avatar } from './Avatar';

interface ProjectListViewProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onAddTask: (groupId: string) => void;
  onUpdateTask: (task: Task) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({ 
  tasks, 
  taskGroups, 
  users, 
  onTaskClick,
  onAddTask,
  onUpdateTask
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const toggleTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const calculateProgress = (task: Task) => {
      if (task.subtasks.length === 0) return task.progress;
      const completed = task.subtasks.filter(s => s.completed).length;
      return Math.round((completed / task.subtasks.length) * 100);
  };

  const handleAddSubtask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newSubtask = {
        id: crypto.randomUUID(),
        title: 'Novo subelemento',
        completed: false,
        startDate: new Date().toISOString().split('T')[0]
    };
    
    // Recalculate progress on subtask add might be weird, but let's update task
    const updatedSubtasks = [...task.subtasks, newSubtask];
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleSubtaskUpdate = (taskId: string, subtaskId: string, updates: any) => {
      const task = tasks.find(t => t.id === taskId);
      if(!task) return;

      const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, ...updates } : s);
      
      // Auto update parent progress
      const completedCount = updatedSubtasks.filter(s => s.completed).length;
      const newProgress = Math.round((completedCount / updatedSubtasks.length) * 100);

      onUpdateTask({ ...task, subtasks: updatedSubtasks, progress: newProgress });
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Concluído': return 'bg-teal-500 text-white dark:bg-teal-600';
      case 'Em Progresso': return 'bg-blue-400 text-white dark:bg-blue-600';
      case 'Revisão': return 'bg-purple-400 text-white dark:bg-purple-600';
      default: return 'bg-gray-400 text-white dark:bg-gray-600';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'Alta': return 'bg-red-500 text-white';
      case 'Média': return 'bg-yellow-500 text-white';
      case 'Baixa': return 'bg-teal-400 text-white';
    }
  };

  const getApprovalIcon = (status: string) => {
      switch(status) {
          case 'approved': return <div title="Aprovado"><ShieldCheck size={16} className="text-green-500" /></div>;
          case 'rejected': return <div title="Rejeitado"><ShieldAlert size={16} className="text-red-500" /></div>;
          case 'pending': return <div title="Pendente Aprovação"><Shield size={16} className="text-yellow-500" /></div>;
          default: return <div title="Sem fluxo de aprovação"><Shield size={16} className="text-gray-300" /></div>;
      }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {taskGroups.map(group => {
        const groupTasks = tasks.filter(t => t.groupId === group.id);
        const isCollapsed = collapsedGroups.has(group.id);
        
        // Calculate Group Stats
        const progressSum = groupTasks.reduce((acc, t) => acc + calculateProgress(t), 0);
        const avgProgress = groupTasks.length ? Math.round(progressSum / groupTasks.length) : 0;
        
        return (
          <div key={group.id} className="flex flex-col">
            {/* Group Header */}
            <div className="group sticky top-0 z-10 bg-gray-50 dark:bg-[#021221] pt-2 pb-2 border-b border-transparent transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => toggleGroup(group.id)}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors`}
                  style={{ color: group.color }}
                >
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </button>
                <h3 className="text-lg font-bold" style={{ color: group.color }}>
                  {group.title}
                </h3>
                <span className="text-gray-400 text-sm font-normal ml-2">
                  {groupTasks.length} tarefas
                </span>
              </div>
            </div>

            {/* Table Container */}
            {!isCollapsed && (
              <div className="bg-white dark:bg-[#0d1b2a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-0 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1b263b] text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider h-10 items-center">
                  <div className="col-span-4 px-4 border-r border-gray-100 dark:border-gray-800 h-full flex items-center pl-10">Tarefa</div>
                  <div className="col-span-2 px-2 border-r border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">Resp. / Apoio</div>
                  <div className="col-span-2 px-2 border-r border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">Status</div>
                  <div className="col-span-2 px-2 border-r border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">Timeline</div>
                  <div className="col-span-1 px-2 border-r border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">Prioridade</div>
                  <div className="col-span-1 px-2 h-full flex items-center justify-center">Aprovação</div>
                </div>

                {/* Rows */}
                {groupTasks.map(task => {
                   const assignee = users.find(u => u.id === task.assigneeId);
                   const supportUsers = users.filter(u => task.supportIds?.includes(u.id));
                   const isExpanded = expandedTasks.has(task.id);
                   const currentProgress = calculateProgress(task);

                   return (
                    <div key={task.id} className="flex flex-col group/row">
                        {/* Main Task Row */}
                        <div 
                          onClick={() => onTaskClick(task)}
                          className={`grid grid-cols-12 gap-0 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1b263b] transition-colors h-12 items-center cursor-pointer text-sm text-gray-700 dark:text-gray-200 ${isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                        >
                          {/* Task Name + Expand Button */}
                          <div className="col-span-4 px-4 h-full flex items-center relative border-r border-gray-100 dark:border-gray-800">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: group.color }}></div>
                            <button 
                                onClick={(e) => toggleTask(e, task.id)}
                                className="mr-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <span className="truncate font-medium group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400">{task.title}</span>
                            <span className="ml-2 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 rounded-full">{task.subtasks.length}</span>
                          </div>

                          {/* Assignee & Support */}
                          <div className="col-span-2 h-full flex items-center justify-center border-r border-gray-100 dark:border-gray-800 gap-1 pl-2">
                            {/* Main */}
                            {assignee ? (
                                <div className="relative group/avatar z-10" title={`Responsável: ${assignee.name}`}>
                                    <Avatar src={assignee.avatar} alt={assignee.name} size="sm" className="ring-2 ring-white dark:ring-[#0d1b2a]" />
                                </div>
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 border border-gray-300 dark:border-gray-600 border-dashed">
                                    <UserIcon size={12} />
                                </div>
                            )}
                            
                            {/* Support */}
                            {supportUsers.length > 0 && (
                                <div className="flex -space-x-2 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
                                    {supportUsers.map(u => (
                                        <div key={u.id} className="relative group/s-avatar" title={`Apoio: ${u.name}`}>
                                            <Avatar src={u.avatar} alt={u.name} size="sm" className="w-5 h-5 text-[10px] ring-1 ring-white dark:ring-[#0d1b2a]" />
                                        </div>
                                    ))}
                                </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="col-span-2 h-full flex items-center justify-center border-r border-gray-100 dark:border-gray-800 p-2">
                            <div className={`w-full h-full flex items-center justify-center text-xs font-medium text-center transition-colors rounded ${getStatusColor(task.status)}`}>
                              {task.status}
                            </div>
                          </div>

                          {/* Timeline Bar */}
                          <div className="col-span-2 h-full flex items-center justify-center border-r border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 px-4">
                             {task.startDate && task.dueDate ? (
                               <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative group/bar">
                                  <div 
                                    className={`h-full ${currentProgress === 100 ? 'bg-teal-500' : 'bg-indigo-500'}`} 
                                    style={{width: `${currentProgress}%`}}
                                  ></div>
                                  <span className="hidden group-hover/bar:block absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-2 py-1 rounded text-[10px] whitespace-nowrap z-20">
                                    {new Date(task.startDate).toLocaleDateString()} - {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                               </div>
                             ) : (
                                <span className="text-gray-300 dark:text-gray-600">-</span>
                             )}
                          </div>

                          {/* Priority */}
                          <div className="col-span-1 h-full flex items-center justify-center border-r border-gray-100 dark:border-gray-800 p-2">
                             <div className={`w-full h-full flex items-center justify-center text-xs font-medium text-center rounded ${getPriorityColor(task.priority)}`}>
                               {task.priority}
                             </div>
                          </div>

                          {/* Approval */}
                          <div className="col-span-1 h-full flex items-center justify-center">
                             {getApprovalIcon(task.approvalStatus)}
                          </div>
                        </div>

                        {/* Subtasks Expansion (Nested Table look) */}
                        {isExpanded && (
                            <div className="bg-[#1e1f2e] text-gray-300 pl-10 pr-4 py-2 border-b border-gray-700/50 shadow-inner">
                                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-gray-500 mb-2 pl-2 border-b border-gray-700 pb-1">
                                    <div className="col-span-4">Subelemento</div>
                                    <div className="col-span-2">Responsável</div>
                                    <div className="col-span-2">Prazo</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2"></div>
                                </div>
                                {task.subtasks.length > 0 ? (
                                    task.subtasks.map(sub => (
                                        <div key={sub.id} className="grid grid-cols-12 gap-2 border-b border-gray-700/30 h-10 items-center text-sm hover:bg-white/5 transition-colors">
                                             <div className="col-span-4 flex items-center pl-2 h-full">
                                                <input 
                                                    type="checkbox" 
                                                    checked={sub.completed} 
                                                    onChange={(e) => handleSubtaskUpdate(task.id, sub.id, { completed: e.target.checked })}
                                                    className="mr-2 accent-teal-500" 
                                                />
                                                <span className={`truncate ${sub.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>{sub.title}</span>
                                             </div>
                                             <div className="col-span-2 flex items-center h-full">
                                                <select 
                                                    value={sub.assigneeId || ''}
                                                    onChange={(e) => handleSubtaskUpdate(task.id, sub.id, { assigneeId: e.target.value })}
                                                    className="bg-transparent border border-gray-700 rounded text-xs text-gray-400 focus:border-teal-500 outline-none w-full"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                             </div>
                                             <div className="col-span-2 flex items-center h-full">
                                                 <input 
                                                    type="date" 
                                                    value={sub.dueDate || ''}
                                                    onChange={(e) => handleSubtaskUpdate(task.id, sub.id, { dueDate: e.target.value })}
                                                    className="bg-transparent text-xs text-gray-400 border-none outline-none focus:ring-0"
                                                 />
                                             </div>
                                             <div className="col-span-2 flex items-center justify-center h-full">
                                                <span className={`text-[10px] px-2 py-0.5 rounded ${sub.completed ? 'bg-teal-900 text-teal-300' : 'bg-gray-700 text-gray-300'}`}>
                                                    {sub.completed ? 'Feito' : 'A Fazer'}
                                                </span>
                                             </div>
                                             <div className="col-span-2 h-full"></div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-gray-500 italic">Nenhum subelemento.</div>
                                )}
                                <button 
                                    onClick={() => handleAddSubtask(task.id)}
                                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 mt-2 pl-2 py-1"
                                >
                                    <CornerDownRight size={12} /> Adicionar subelemento
                                </button>
                            </div>
                        )}
                    </div>
                  );
                })}

                {/* Add Task Row */}
                <div className="grid grid-cols-12 gap-0 h-9 items-center group">
                   <div className="col-span-4 px-4 h-full flex items-center border-r border-gray-100 dark:border-gray-800 relative">
                     <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-50" style={{ backgroundColor: group.color }}></div>
                     <button 
                        onClick={() => onAddTask(group.id)}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm pl-4 w-full h-full"
                     >
                       <Plus size={16} /> Adicionar tarefa
                     </button>
                   </div>
                   <div className="col-span-8 h-full bg-gray-50/30 dark:bg-gray-800/30"></div>
                </div>
                
                {/* Summary Footer */}
                <div className="grid grid-cols-12 gap-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1b263b] h-8 items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                   <div className="col-span-4 px-4 text-right pr-4">Resumo</div>
                   <div className="col-span-2"></div>
                   <div className="col-span-2 flex items-center justify-center">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="bg-teal-500 h-full" style={{width: `${(groupTasks.filter(t => t.status === 'Concluído').length / groupTasks.length) * 100}%`}}></div>
                        <div className="bg-blue-400 h-full" style={{width: `${(groupTasks.filter(t => t.status === 'Em Progresso').length / groupTasks.length) * 100}%`}}></div>
                        <div className="bg-gray-300 dark:bg-gray-600 h-full flex-1"></div>
                      </div>
                   </div>
                   <div className="col-span-4 px-4 text-right">
                      {Math.round(avgProgress)}% Completo
                   </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};