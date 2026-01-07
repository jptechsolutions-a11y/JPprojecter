
import React, { useState } from 'react';
import { Task, TaskGroup, User, Status, Priority, Subtask } from '../types';
import { ChevronDown, ChevronRight, Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle2, Clock, CornerDownRight, ShieldCheck, ShieldAlert, Shield, Trash2, FolderX, Info } from 'lucide-react';
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

  const toggleGroup = (groupId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Concluído': return 'bg-[#00c875]'; // Green
      case 'Em Progresso': return 'bg-[#fdab3d]'; // Orange
      case 'Revisão': return 'bg-[#a25ddc]'; // Purple
      default: return 'bg-[#c4c4c4]'; // Gray
    }
  };

  const calculateEffectiveDateRange = (task: Task) => {
      // Se não tiver subtarefas, usa as datas da tarefa
      if (!task.subtasks || task.subtasks.length === 0) {
          return { start: task.startDate, end: task.dueDate };
      }

      // Filtra datas válidas
      const startDates = task.subtasks.map(s => s.startDate).filter(d => d).sort();
      const endDates = task.subtasks.map(s => s.dueDate).filter(d => d).sort();

      // Pega a menor data de início e a maior data de fim
      const start = startDates.length > 0 ? startDates[0] : task.startDate;
      const end = endDates.length > 0 ? endDates[endDates.length - 1] : task.dueDate;

      return { start, end };
  };

  const formatDateRange = (start?: string, end?: string) => {
      if (!start) return '-';
      
      // Ajuste de timezone simples para exibição correta (evita dia anterior)
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
              <div className="flex items-center gap-2">
                <button onClick={() => toggleGroup(group.id)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" style={{ color: group.color }}>
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </button>
                <h3 className="text-xl font-bold" style={{ color: group.color }}>{group.title}</h3>
                <span className="text-gray-400 text-sm font-normal ml-2">{groupTasks.length} tarefas</span>
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
                {/* Table Header */}
                <div className="grid grid-cols-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1b263b]/50 text-xs text-gray-500 dark:text-gray-400 h-10 items-center">
                  <div className="col-span-5 px-4 border-r border-gray-200 dark:border-gray-800 pl-10">Tarefa</div>
                  <div className="col-span-2 text-center border-r border-gray-200 dark:border-gray-800">Status</div>
                  <div className="col-span-2 text-center border-r border-gray-200 dark:border-gray-800 flex items-center justify-center gap-1">Timeline <Info size={10}/></div>
                  <div className="col-span-1 text-center border-r border-gray-200 dark:border-gray-800">Duração</div>
                  <div className="col-span-2 text-center">Esforço</div>
                </div>

                {/* Rows */}
                {groupTasks.map(task => {
                   const totalDuration = calculateTotalDuration(task.subtasks);
                   const { start: effectiveStart, end: effectiveEnd } = calculateEffectiveDateRange(task);
                   const timelineWidth = Math.min(100, totalDuration * 5); // Visual hack for timeline pill width

                   return (
                    <div key={task.id} className="grid grid-cols-12 h-12 items-center hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors border-b border-gray-100 dark:border-gray-800 cursor-pointer text-sm" onClick={() => onTaskClick(task)}>
                        {/* Title Column */}
                        <div className="col-span-5 px-4 h-full flex items-center relative border-r border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: group.color }}></div>
                            <div className="pl-4 flex flex-col justify-center min-w-0">
                                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{task.title}</span>
                                {task.subtasks.length > 0 && (
                                    <span className="text-[10px] text-gray-400 truncate">
                                        {task.subtasks.length} atividades
                                    </span>
                                )}
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
                        <div className="col-span-2 flex items-center h-full">
                             <div className="flex-1 h-full flex flex-col justify-center items-center border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
                                 <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Previsto</span>
                                 <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{totalDuration * 8}h</span>
                             </div>
                             <div className="flex-1 h-full flex flex-col justify-center items-center">
                                 <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Real</span>
                                 <span className="text-xs font-bold text-gray-800 dark:text-gray-200">-</span> 
                             </div>
                        </div>
                    </div>
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
