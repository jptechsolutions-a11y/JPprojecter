
import React, { useState } from 'react';
import { Task, TaskGroup, User, Status, Priority, Subtask } from '../types';
import { ChevronDown, ChevronRight, Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle2, Clock, CornerDownRight, ShieldCheck, ShieldAlert, Shield, Trash2, FolderX, Info, AlertTriangle, CheckSquare } from 'lucide-react';
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

  const toggleTask = (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedTasks);
      if (newExpanded.has(taskId)) {
          newExpanded.delete(taskId);
      } else {
          newExpanded.add(taskId);
      }
      setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Concluído': return 'bg-[#00c875]'; // Green
      case 'Em Progresso': return 'bg-[#fdab3d]'; // Orange
      case 'Revisão': return 'bg-[#a25ddc]'; // Purple
      default: return 'bg-[#c4c4c4]'; // Gray
    }
  };

  const getDeadlineStatus = (dueDate?: string, status?: string) => {
      if (!dueDate || status === 'Concluído') return null;
      const due = new Date(dueDate);
      due.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { label: 'Atrasado', color: 'text-red-600 bg-red-100', icon: AlertTriangle };
      if (diffDays === 0) return { label: 'Entrega Hoje', color: 'text-orange-600 bg-orange-100', icon: Clock };
      if (diffDays <= 2) return { label: 'Prazo Próximo', color: 'text-yellow-600 bg-yellow-100', icon: AlertCircle };
      return null;
  };

  const calculateEffectiveDateRange = (task: Task) => {
      if (!task.subtasks || task.subtasks.length === 0) {
          return { start: task.startDate, end: task.dueDate };
      }
      const startDates = task.subtasks.map(s => s.startDate).filter(d => d).sort();
      const endDates = task.subtasks.map(s => s.dueDate).filter(d => d).sort();
      const start = startDates.length > 0 ? startDates[0] : task.startDate;
      const end = endDates.length > 0 ? endDates[endDates.length - 1] : task.dueDate;
      return { start, end };
  };

  const formatDateRange = (start?: string, end?: string) => {
      if (!start) return '-';
      const parseDate = (dateStr: string) => {
          const parts = dateStr.split('T')[0].split('-');
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      };
      const s = parseDate(start);
      const e = end ? parseDate(end) : null;
      const sStr = s.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
      if (!e) return sStr;
      const eStr = e.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
      return `${sStr} - ${eStr}`;
  };

  const calculateTotalDuration = (subtasks: Subtask[]) => {
      return subtasks.reduce((acc, curr) => acc + (curr.duration || 1), 0);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {taskGroups.map(group => {
        const groupTasks = tasks.filter(t => t.groupId === group.id);
        const isCollapsed = collapsedGroups.has(group.id);
        
        return (
          <div key={group.id} className="flex flex-col animate-fade-in">
            {/* Group Header */}
            <div className="group sticky top-0 z-10 bg-gray-50 dark:bg-[#021221] pt-2 pb-2 flex items-center justify-between transition-colors mb-2">
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => toggleGroup(group.id)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" style={{ color: group.color }}>
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </button>
                <h3 className="text-xl font-bold" style={{ color: group.color }}>{group.title}</h3>
                
                <span className="text-gray-400 text-sm font-normal ml-2 hidden sm:inline">{groupTasks.length} tarefas</span>
              </div>
              <button 
                  onClick={() => onDeleteProject(group.id)} 
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2 text-xs font-bold" 
                  title="Excluir Projeto"
              >
                  <Trash2 size={16} />
              </button>
            </div>

            {!isCollapsed && (
              <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Table Header - Adjusted Layout */}
                <div className="grid grid-cols-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1b263b]/50 text-xs text-gray-500 dark:text-gray-400 h-10 items-center">
                  <div className="col-span-4 px-4 border-r border-gray-200 dark:border-gray-800 pl-10">Tarefa</div>
                  <div className="col-span-2 px-2 border-r border-gray-200 dark:border-gray-800 text-center">Progresso</div>
                  <div className="col-span-2 text-center border-r border-gray-200 dark:border-gray-800">Status</div>
                  <div className="col-span-2 text-center border-r border-gray-200 dark:border-gray-800 flex items-center justify-center gap-1">Timeline <Info size={10}/></div>
                  <div className="col-span-1 text-center border-r border-gray-200 dark:border-gray-800">Duração</div>
                  <div className="col-span-1 text-center">Esforço</div>
                </div>

                {/* Rows */}
                {groupTasks.map(task => {
                   const totalDuration = calculateTotalDuration(task.subtasks);
                   const { start: effectiveStart, end: effectiveEnd } = calculateEffectiveDateRange(task);
                   const timelineWidth = Math.min(100, totalDuration * 5); 
                   const deadlineInfo = getDeadlineStatus(task.dueDate, task.status);
                   const isExpanded = expandedTasks.has(task.id);
                   const hasSubtasks = task.subtasks && task.subtasks.length > 0;

                   return (
                    <React.Fragment key={task.id}>
                        <div className="grid grid-cols-12 h-14 items-center hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors border-b border-gray-100 dark:border-gray-800 cursor-pointer text-sm" onClick={() => onTaskClick(task)}>
                            {/* Title Column */}
                            <div className="col-span-4 px-4 h-full flex items-center relative border-r border-gray-100 dark:border-gray-800 overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: group.color }}></div>
                                <div className="pl-4 flex items-center gap-2 min-w-0 flex-1">
                                    {hasSubtasks && (
                                        <button 
                                            onClick={(e) => toggleTask(task.id, e)} 
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        >
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    )}
                                    {!hasSubtasks && <div className="w-4"></div>} {/* Spacer */}
                                    
                                    <div className="flex flex-col truncate">
                                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{task.title}</span>
                                        {deadlineInfo && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 w-fit mt-0.5 ${deadlineInfo.color}`}>
                                                <deadlineInfo.icon size={10} /> {deadlineInfo.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progress Column (NEW) */}
                            <div className="col-span-2 px-4 border-r border-gray-100 dark:border-gray-800 flex items-center justify-center h-full">
                                <div className="w-full flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${task.progress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-8 text-right">{task.progress}%</span>
                                </div>
                            </div>

                            {/* Status Column */}
                            <div className="col-span-2 px-2 border-r border-gray-100 dark:border-gray-800 flex items-center justify-center h-full">
                                <div className={`w-full h-8 flex items-center justify-center text-white text-xs font-bold truncate ${getStatusColor(task.status)}`}>
                                    {task.status}
                                </div>
                            </div>

                            {/* Timeline Column */}
                            <div className="col-span-2 px-4 border-r border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center h-full">
                                 <div className="w-full h-6 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden flex items-center justify-center group/timeline">
                                     <div 
                                        className="absolute left-0 top-0 bottom-0 bg-[#00b4d8] opacity-70 rounded-full" 
                                        style={{ width: `${timelineWidth}%` }}
                                     ></div>
                                     <span className="relative z-10 text-[10px] font-bold text-gray-700 dark:text-white px-2 truncate">
                                         {formatDateRange(effectiveStart, effectiveEnd)}
                                     </span>
                                 </div>
                            </div>

                            {/* Duration Column */}
                            <div className="col-span-1 border-r border-gray-100 dark:border-gray-800 text-center text-gray-600 dark:text-gray-400 text-xs">
                                {totalDuration} dias
                            </div>

                            {/* Effort Column */}
                            <div className="col-span-1 flex items-center justify-center h-full text-center">
                                 <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{totalDuration * 8}h</span>
                            </div>
                        </div>

                        {/* Subtasks Expanded View */}
                        {isExpanded && hasSubtasks && (
                            <div className="bg-gray-50 dark:bg-[#021221] border-b border-gray-200 dark:border-gray-700 shadow-inner">
                                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-gray-400 tracking-wider py-2 border-b border-gray-200 dark:border-gray-700 px-4">
                                    <div className="col-span-6 pl-14">Atividade</div>
                                    <div className="col-span-2 text-center">Status</div>
                                    <div className="col-span-2 text-center">Prazo</div>
                                    <div className="col-span-2 text-center">Responsável</div>
                                </div>
                                {task.subtasks.map(sub => (
                                    <div key={sub.id} className="grid grid-cols-12 py-2 px-4 items-center hover:bg-gray-100 dark:hover:bg-[#1b263b] transition-colors border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                                        <div className="col-span-6 pl-14 flex items-center gap-2">
                                            <CornerDownRight size={12} className="text-gray-400" />
                                            <span className={`text-sm text-gray-700 dark:text-gray-300 ${sub.completed ? 'line-through opacity-50' : ''}`}>{sub.title}</span>
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            {sub.completed ? (
                                                <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded font-bold">
                                                    <CheckCircle2 size={10} /> Feito
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded font-bold">
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-center text-xs text-gray-500 dark:text-gray-400">
                                            {sub.dueDate ? new Date(sub.dueDate).toLocaleDateString() : '-'}
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            {/* Logic to show assignee avatar if supported in Subtask type, defaulting to task assignee or unassigned */}
                                            <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[8px] text-white">
                                                ?
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </React.Fragment>
                  );
                })}

                {/* Add Task Row */}
                <div className="h-10 flex items-center px-4 group/add border-t border-gray-200 dark:border-gray-700">
                   <div className="w-1.5 h-full mr-4" style={{ backgroundColor: group.color, opacity: 0.3 }}></div>
                   <button onClick={() => onAddTask(group.id)} className="text-gray-400 hover:text-[#00b4d8] text-xs flex items-center gap-2 font-medium w-full h-full">
                       <Plus size={14} /> Adicionar Item
                   </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
