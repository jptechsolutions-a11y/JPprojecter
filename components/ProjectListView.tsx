
import React, { useState } from 'react';
import { Task, TaskGroup, User, Status, Priority, Subtask } from '../types';
import { ChevronDown, ChevronRight, Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle2, Clock, CornerDownRight, ShieldCheck, ShieldAlert, Shield, Trash2, FolderX } from 'lucide-react';
import { Avatar } from './Avatar';
import { api } from '../services/dataService';

interface ProjectListViewProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onAddTask: (groupId: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteProject: (groupId: string) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({ 
  tasks, 
  taskGroups, 
  users, 
  onTaskClick,
  onAddTask,
  onUpdateTask,
  onDeleteProject
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

  const handleAddSubtask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Create on API
    const res = await api.createSubtask(taskId, 'Novo subelemento');
    if (res.success && res.data) {
        const newSubtask: Subtask = { 
            id: res.data.id, 
            title: res.data.title, 
            completed: false 
        };
        onUpdateTask({ ...task, subtasks: [...task.subtasks, newSubtask] });
    }
  };

  const handleSubtaskUpdate = async (taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
      const task = tasks.find(t => t.id === taskId);
      if(!task) return;
      
      const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, ...updates } : s);
      const completedCount = updatedSubtasks.filter(s => s.completed).length;
      const newProgress = updatedSubtasks.length ? Math.round((completedCount / updatedSubtasks.length) * 100) : 0;
      
      onUpdateTask({ ...task, subtasks: updatedSubtasks, progress: newProgress });
      
      // Save to API
      await api.updateSubtask(subtaskId, updates);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Concluído': return 'bg-teal-500 text-white';
      case 'Em Progresso': return 'bg-blue-400 text-white';
      case 'Revisão': return 'bg-purple-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {taskGroups.map(group => {
        const groupTasks = tasks.filter(t => t.groupId === group.id);
        const isCollapsed = collapsedGroups.has(group.id);
        const progressSum = groupTasks.reduce((acc, t) => acc + calculateProgress(t), 0);
        const avgProgress = groupTasks.length ? Math.round(progressSum / groupTasks.length) : 0;
        
        return (
          <div key={group.id} className="flex flex-col animate-fade-in">
            <div className="group sticky top-0 z-10 bg-gray-50 dark:bg-[#021221] pt-2 pb-2 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleGroup(group.id)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" style={{ color: group.color }}>
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </button>
                <h3 className="text-lg font-bold" style={{ color: group.color }}>{group.title}</h3>
                <span className="text-gray-400 text-sm font-normal ml-2">{groupTasks.length} tarefas</span>
              </div>
              <button 
                  onClick={() => onDeleteProject(group.id)} 
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2 text-xs font-bold" 
                  title="Excluir Projeto"
              >
                  <Trash2 size={16} /> <span className="hidden sm:inline">Excluir Grupo</span>
              </button>
            </div>

            {!isCollapsed && (
              <div className="bg-white dark:bg-[#0d1b2a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="grid grid-cols-12 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1b263b] text-[10px] font-bold text-gray-500 uppercase tracking-wider h-10 items-center">
                  <div className="col-span-4 px-4 border-r border-gray-100 dark:border-gray-800 pl-10">Tarefa</div>
                  <div className="col-span-2 text-center border-r border-gray-100 dark:border-gray-800">Equipe</div>
                  <div className="col-span-2 text-center border-r border-gray-100 dark:border-gray-800">Status</div>
                  <div className="col-span-2 text-center border-r border-gray-100 dark:border-gray-800">Progresso</div>
                  <div className="col-span-2 text-center">Prioridade</div>
                </div>

                {groupTasks.map(task => {
                   const assignee = users.find(u => u.id === task.assigneeId);
                   const supportUsers = users.filter(u => task.supportIds?.includes(u.id));
                   const isExpanded = expandedTasks.has(task.id);
                   const currentProgress = calculateProgress(task);

                   return (
                    <div key={task.id} className="flex flex-col border-b border-gray-100 dark:border-gray-800">
                        <div onClick={() => onTaskClick(task)} className={`grid grid-cols-12 h-12 items-center cursor-pointer text-sm hover:bg-gray-50 dark:hover:bg-[#1b263b] transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}>
                          <div className="col-span-4 px-4 h-full flex items-center relative border-r border-gray-100 dark:border-gray-800">
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: group.color }}></div>
                            <button onClick={(e) => toggleTask(e, task.id)} className="mr-2 text-gray-400 p-1 hover:text-indigo-500">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <span className="truncate font-medium">{task.title}</span>
                          </div>
                          <div className="col-span-2 flex justify-center -space-x-2 border-r border-gray-100 dark:border-gray-800">
                            {assignee && <Avatar src={assignee.avatar} alt={assignee.name} size="sm" className="ring-2 ring-white dark:ring-[#0d1b2a]" />}
                            {supportUsers.slice(0, 2).map(u => <Avatar key={u.id} src={u.avatar} alt={u.name} size="sm" className="ring-2 ring-white dark:ring-[#0d1b2a]" />)}
                          </div>
                          <div className="col-span-2 px-2 border-r border-gray-100 dark:border-gray-800">
                            <div className={`w-full text-[10px] py-1 text-center rounded font-bold ${getStatusColor(task.status)}`}>{task.status}</div>
                          </div>
                          <div className="col-span-2 px-4 border-r border-gray-100 dark:border-gray-800">
                             <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{width: `${currentProgress}%`}}></div>
                             </div>
                          </div>
                          <div className="col-span-2 text-center text-[10px] font-bold">
                             <span className={`${task.priority === 'Alta' ? 'text-red-500' : task.priority === 'Média' ? 'text-yellow-500' : 'text-teal-500'}`}>{task.priority}</span>
                          </div>
                        </div>
                        {isExpanded && (
                            <div className="bg-gray-50/50 dark:bg-black/10 pl-12 pr-4 py-2 text-xs space-y-2">
                                {task.subtasks.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-3 group">
                                        <input type="checkbox" checked={sub.completed} onChange={(e) => handleSubtaskUpdate(task.id, sub.id, { completed: e.target.checked })} className="rounded accent-[#00b4d8]" />
                                        <input 
                                            type="text" 
                                            value={sub.title}
                                            onChange={(e) => handleSubtaskUpdate(task.id, sub.id, { title: e.target.value })}
                                            className={`bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full transition-colors ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>
                                ))}
                                <button onClick={() => handleAddSubtask(task.id)} className="text-[#00b4d8] font-bold hover:underline">+ Subtarefa</button>
                            </div>
                        )}
                    </div>
                  );
                })}

                <div className="h-10 flex items-center px-10 group/add">
                   <button onClick={() => onAddTask(group.id)} className="text-gray-400 hover:text-[#00b4d8] text-xs flex items-center gap-2 font-medium">
                       <Plus size={14} /> Adicionar tarefa rápida
                   </button>
                </div>
                
                <div className="bg-gray-50 dark:bg-[#1b263b] h-8 flex items-center justify-between px-4 text-[10px] font-bold text-gray-400 uppercase">
                   <span>Resumo: {groupTasks.length} itens</span>
                   <span>{avgProgress}% completo</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
