
import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { Avatar } from './Avatar';
import { Calendar as CalendarIcon } from 'lucide-react';

interface GanttViewProps {
  tasks: Task[];
  users: User[];
  onTaskClick: (task: Task) => void;
}

type ViewMode = 'day' | 'week' | 'month';

export const GanttView: React.FC<GanttViewProps> = ({ tasks, users, onTaskClick }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const headerHeight = 60;
  
  // Configuration per view mode
  const VIEW_CONFIG = {
    day: { dayWidth: 50, label: 'Dia' },
    week: { dayWidth: 20, label: 'Semana' },   // ~140px per week
    month: { dayWidth: 6, label: 'Mês' }       // ~180px per month
  };

  const dayWidth = VIEW_CONFIG[viewMode].dayWidth;

  const calculateEffectiveDateRange = (task: Task) => {
      const startDates = task.subtasks?.map(s => s.startDate).filter(d => d).sort() || [];
      const endDates = task.subtasks?.map(s => s.dueDate).filter(d => d).sort() || [];

      // Start: Earliest subtask start or task start
      const start = startDates.length > 0 ? startDates[0] : task.startDate;
      
      // End: Latest subtask end or task end
      const end = endDates.length > 0 ? endDates[endDates.length - 1] : task.dueDate;

      return { start, end };
  };

  // 1. Calculate the timeline range
  const { minDate, totalDays, dates, groupedHeaders } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      now.setHours(0,0,0,0);
      const start = new Date(now);
      start.setDate(start.getDate() - 7); // Buffer
      return { 
        minDate: start, 
        totalDays: 30, 
        dates: Array.from({length: 30}, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        }),
        groupedHeaders: []
      };
    }

    // Find absolute min/max
    let minTs = Number.MAX_SAFE_INTEGER;
    let maxTs = 0;

    tasks.forEach(t => {
      const { start: effectiveStart, end: effectiveEnd } = calculateEffectiveDateRange(t);
      
      const start = new Date(effectiveStart || t.createdAt).getTime();
      const end = new Date(effectiveEnd || new Date(effectiveStart || t.createdAt).getTime() + 86400000 * 3).getTime();
      
      if (start < minTs) minTs = start;
      if (end > maxTs) maxTs = end;
    });

    // Validar se minTs e maxTs foram setados corretamente
    if (minTs === Number.MAX_SAFE_INTEGER) minTs = Date.now();
    if (maxTs === 0) maxTs = minTs + 86400000 * 7;

    let minDateObj = new Date(minTs);
    let maxDateObj = new Date(maxTs);
    
    // Normalize to start of day
    minDateObj.setHours(0,0,0,0);
    maxDateObj.setHours(0,0,0,0);

    // Add Buffer & Snap to Grid based on View Mode
    if (viewMode === 'week') {
        // Snap to previous Monday
        const day = minDateObj.getDay();
        const diff = minDateObj.getDate() - day + (day === 0 ? -6 : 1);
        minDateObj.setDate(diff);
        // Add 4 weeks buffer
        maxDateObj.setDate(maxDateObj.getDate() + 28);
    } else if (viewMode === 'month') {
        // Snap to 1st of month
        minDateObj.setDate(1);
        // Add 2 months buffer
        maxDateObj.setMonth(maxDateObj.getMonth() + 2);
    } else {
        // Day mode buffer
        minDateObj.setDate(minDateObj.getDate() - 3);
        maxDateObj.setDate(maxDateObj.getDate() + 7);
    }

    const diffTime = Math.abs(maxDateObj.getTime() - minDateObj.getTime());
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const dateArray = [];
    for (let i = 0; i <= totalDays; i++) {
        const d = new Date(minDateObj);
        d.setDate(d.getDate() + i);
        dateArray.push(d);
    }

    // Calculate Grouped Headers (for Week and Month views)
    const headers = [];
    if (viewMode === 'week') {
        let currentWeekStart = new Date(minDateObj);
        for (let i = 0; i < totalDays; i+=7) {
             // Ensure we don't go out of bounds visually
             if (i + 7 > totalDays && i > 0) break;
             const d = new Date(currentWeekStart);
             d.setDate(d.getDate() + i);
             
             // End date of this block
             const e = new Date(d);
             e.setDate(e.getDate() + 6);
             
             headers.push({
                 label: `Semana ${getWeekNumber(d)}`,
                 subLabel: `${d.getDate()}/${d.getMonth()+1} - ${e.getDate()}/${e.getMonth()+1}`,
                 width: 7 * dayWidth,
                 date: d
             });
        }
    } else if (viewMode === 'month') {
        let currentDate = new Date(minDateObj);
        // Iterate through days to find month starts
        let currentMonth = currentDate.getMonth();
        let daysInCurrentBlock = 0;
        let blockStart = new Date(currentDate);

        for (let i = 0; i <= totalDays; i++) {
            const d = new Date(minDateObj);
            d.setDate(d.getDate() + i);
            
            if (d.getMonth() !== currentMonth || i === totalDays) {
                // Month changed or end of loop, push previous block
                headers.push({
                    label: blockStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                    subLabel: '',
                    width: daysInCurrentBlock * dayWidth,
                    date: blockStart
                });
                
                // Reset
                currentMonth = d.getMonth();
                daysInCurrentBlock = 0;
                blockStart = d;
            }
            daysInCurrentBlock++;
        }
    }

    return { minDate: minDateObj, totalDays, dates: dateArray, groupedHeaders: headers };
  }, [tasks, viewMode, dayWidth]);

  // Helper: Get ISO Week Number
  function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
  }

  // Helper to get position
  const getPosition = (dateStr?: string, fallbackDateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : (fallbackDateStr ? new Date(fallbackDateStr) : new Date());
    d.setHours(0,0,0,0);
    const diff = Math.ceil((d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff * dayWidth;
  };

  const getDurationDays = (startStr?: string, endStr?: string, createdStr?: string) => {
      const start = startStr ? new Date(startStr) : new Date(createdStr!);
      const end = endStr ? new Date(endStr) : new Date(start.getTime() + 86400000 * 3); // Default 3 days if no due date
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      // Add 1 day to be inclusive of the end date visually
      return days + 1;
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Concluído': return 'bg-green-500 hover:bg-green-600 border-green-600';
          case 'Em Progresso': return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
          case 'Revisão': return 'bg-purple-500 hover:bg-purple-600 border-purple-600';
          default: return 'bg-gray-400 hover:bg-gray-500 border-gray-500';
      }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d1b2a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Controls Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1b2a]">
             <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                 <CalendarIcon size={18} />
                 <span>Cronograma</span>
             </div>
             <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                 {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                     <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            viewMode === mode 
                            ? 'bg-white dark:bg-[#1b263b] shadow text-indigo-600 dark:text-indigo-400' 
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                        }`}
                     >
                         {VIEW_CONFIG[mode].label}
                     </button>
                 ))}
             </div>
        </div>

        {/* Gantt Header Container */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1b263b] z-10">
            {/* Top Left Corner */}
            <div className="w-80 flex-shrink-0 p-4 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 flex items-end">
                Tarefa
            </div>
            
            {/* Timeline Header */}
            <div className="flex-1 overflow-hidden relative">
                 <div className="flex">
                    {viewMode === 'day' ? (
                        dates.map((date, i) => (
                            <div key={i} className="flex-shrink-0 flex flex-col items-center justify-end border-r border-gray-200/50 dark:border-gray-700/50 pb-2" style={{width: dayWidth, height: headerHeight}}>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{date.toLocaleDateString('pt-BR', {month: 'short'})}</span>
                                <span className={`text-sm font-medium ${date.getDay() === 0 || date.getDay() === 6 ? 'text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {date.getDate()}
                                </span>
                                <span className="text-[9px] text-gray-400">{date.toLocaleDateString('pt-BR', {weekday: 'narrow'})}</span>
                            </div>
                        ))
                    ) : (
                        // Render Grouped Headers for Week/Month
                        groupedHeaders.map((header, i) => (
                            <div key={i} className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-200/50 dark:border-gray-700/50 px-2" style={{width: header.width, height: headerHeight}}>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">{header.label}</span>
                                {header.subLabel && <span className="text-[10px] text-gray-400">{header.subLabel}</span>}
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </div>

        {/* Body Container */}
        <div className="flex flex-1 overflow-auto bg-gray-50/20 dark:bg-[#021221]">
             {/* Left Column (Task List) - Sticky */}
             <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1b2a] sticky left-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                {tasks.map(task => {
                     const user = users.find(u => u.id === task.assigneeId);
                     const { start, end } = calculateEffectiveDateRange(task);
                     
                     return (
                        <div 
                            key={task.id} 
                            onClick={() => onTaskClick(task)}
                            className="h-12 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1b263b] cursor-pointer group transition-colors"
                        >
                            <div className="flex-1 min-w-0 mr-3">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${task.priority === 'Alta' ? 'bg-red-500' : task.priority === 'Média' ? 'bg-yellow-500' : 'bg-teal-500'}`}></span>
                                    <p className="text-xs text-gray-400 truncate">
                                        {start ? new Date(start).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : ''} 
                                        {start && end ? ' - ' : ''}
                                        {end ? new Date(end).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : ''}
                                    </p>
                                </div>
                            </div>
                            {user && <Avatar src={user.avatar} alt={user.name} size="sm" />}
                        </div>
                     );
                })}
             </div>

             {/* Gantt Grid */}
             <div className="flex-1 relative min-w-0">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 flex h-full pointer-events-none">
                     {viewMode === 'day' ? (
                         dates.map((_, i) => (
                            <div key={i} className="flex-shrink-0 border-r border-gray-100 dark:border-gray-800 h-full" style={{width: dayWidth}}></div>
                         ))
                     ) : (
                         groupedHeaders.map((header, i) => (
                            <div key={i} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 h-full" style={{width: header.width}}></div>
                         ))
                     )}
                </div>

                {/* Task Bars */}
                <div className="relative pt-0">
                     {tasks.map((task, index) => {
                         const { start, end } = calculateEffectiveDateRange(task);
                         const left = getPosition(start, task.createdAt);
                         const width = getDurationDays(start, end, task.createdAt) * dayWidth;
                         
                         return (
                            <div key={task.id} className="h-12 flex items-center relative border-b border-transparent"> 
                                <div 
                                    onClick={() => onTaskClick(task)}
                                    className={`absolute h-7 rounded-md shadow-sm border cursor-pointer transition-all flex items-center px-2 overflow-hidden whitespace-nowrap text-xs font-bold text-white ${getStatusColor(task.status)} group/bar`}
                                    style={{
                                        left: `${left}px`,
                                        width: `${width}px`,
                                        minWidth: '10px' // Ensure visibility
                                    }}
                                >
                                    {width > 40 && (
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="truncate">{task.title}</span>
                                            {width > 100 && <span className="ml-auto opacity-80 text-[10px]">{task.progress}%</span>}
                                        </div>
                                    )}
                                    {/* Tooltip */}
                                    <div className="absolute opacity-0 group-hover/bar:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded pointer-events-none whitespace-nowrap z-50">
                                        {start ? new Date(start).toLocaleDateString() : 'N/A'} - {end ? new Date(end).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>
                         );
                     })}
                </div>
                
                {/* Today Line */}
                {viewMode === 'day' && (
                     <div 
                        className="absolute top-0 bottom-0 border-l-2 border-red-400 z-10 pointer-events-none opacity-50"
                        style={{ left: getPosition(new Date().toISOString()) }}
                     >
                         <div className="bg-red-400 text-white text-[9px] px-1 rounded-sm absolute -top-0 -left-6">HOJE</div>
                     </div>
                )}
             </div>
        </div>
    </div>
  );
};
