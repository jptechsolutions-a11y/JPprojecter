
import React, { useState, useRef, useEffect } from 'react';
import { Task, User, Priority, Status, Subtask, Attachment, Comment, Column, ApprovalStatus, TaskTimelineEntry } from '../types';
import { Calendar, Tag, User as UserIcon, CheckSquare, Wand2, Trash2, Plus, X, Paperclip, FileText, Send, MessageSquare, Clock, Users as UsersIcon, Shield, ShieldCheck, ShieldAlert, Check, Ban, ChevronDown, Loader2, AlertTriangle, Layout, PlayCircle, CheckCircle2, PauseCircle, XCircle, Info, Image as ImageIcon, Eye } from 'lucide-react';
import { Avatar } from './Avatar';
import { generateSubtasks, generateTaskDescription } from '../services/geminiService';
import { api } from '../services/dataService';
import { Modal } from './Modal';

interface TaskDetailProps {
  task: Task;
  users: User[];
  columns: Column[];
  currentUser: User;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onRequestApproval: (taskId: string, approverId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, users, columns, currentUser, onUpdate, onDelete, onRequestApproval }) => {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Change Logic
  const [showStatusReasonModal, setShowStatusReasonModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState('');
  
  const priorities: Priority[] = ['Baixa', 'Média', 'Alta'];

  // Helper para verificar prazo
  const getDeadlineAlert = () => {
    if (!task.dueDate || task.status === 'Concluído') return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(task.dueDate);
    due.setHours(0,0,0,0); 
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Atrasado ${Math.abs(diffDays)} dias`, color: 'bg-red-100 text-red-700 border-red-200' };
    if (diffDays === 0) return { label: 'Entrega Hoje', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (diffDays <= 2) return { label: 'Prazo Próximo', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return null;
  };

  const deadlineAlert = getDeadlineAlert();

  // --- GENERIC FIELD UPDATER WITH LOGGING ---
  const handleFieldUpdate = async (field: keyof Task, value: any, logMessage?: string) => {
      // Don't update if value hasn't changed (shallow check)
      if (task[field] === value) return;

      const updatedTask = { ...task, [field]: value };
      
      // Calculate automated log message if not provided
      let finalLogMessage = logMessage;
      if (!finalLogMessage) {
          if (field === 'title') finalLogMessage = `Título alterado para "${value}"`;
          else if (field === 'description') finalLogMessage = `Descrição da tarefa atualizada`;
          else if (field === 'priority') finalLogMessage = `Prioridade alterada para ${value}`;
          else if (field === 'startDate') finalLogMessage = `Data de início alterada para ${new Date(value).toLocaleDateString()}`;
          else if (field === 'dueDate') finalLogMessage = `Data de entrega alterada para ${new Date(value).toLocaleDateString()}`;
          else if (field === 'assigneeId') {
              const u = users.find(u => u.id === value);
              finalLogMessage = `Responsável principal alterado para ${u ? u.name : 'Ninguém'}`;
          }
      }

      // Optimistic update
      onUpdate(updatedTask); // Calls parent to update local state
      
      // API Calls
      await api.updateTask(updatedTask);
      
      if (finalLogMessage) {
          await api.logTimelineEvent(task.id, 'info', undefined, undefined, finalLogMessage);
          
          // Add local timeline entry for immediate feedback
          const newEntry: TaskTimelineEntry = {
              id: crypto.randomUUID(),
              taskId: task.id,
              eventType: 'info',
              reason: finalLogMessage,
              createdAt: new Date().toISOString(),
              userName: currentUser.name,
              userAvatar: currentUser.avatar
          };
          onUpdate({ ...updatedTask, timeline: task.timeline ? [...task.timeline, newEntry] : [newEntry] });
      }
  };

  // Handle Status Change manually via dropdown
  const handleStatusChange = (newStatus: string) => {
      if (newStatus === 'Cancelado' || newStatus === 'Em Pausa') {
          setPendingStatus(newStatus);
          setShowStatusReasonModal(true);
      } else if (task.status === 'Em Pausa' && newStatus === 'Em Progresso') {
          updateTaskStatus(newStatus, 'Retomado');
      } else {
          updateTaskStatus(newStatus);
      }
  };

  const confirmStatusChange = () => {
      if (pendingStatus) {
          updateTaskStatus(pendingStatus, statusReason);
          setShowStatusReasonModal(false);
          setPendingStatus(null);
          setStatusReason('');
      }
  };

  const updateTaskStatus = async (status: string, reason?: string) => {
      const now = new Date().toISOString();
      const updates: Partial<Task> = { status };
      let eventType = 'status_change';
      
      if (status === 'Em Progresso' && !task.startedAt) {
          updates.startedAt = now;
          eventType = 'started';
      }
      if (status === 'Concluído' && !task.completedAt) {
          updates.completedAt = now;
          eventType = 'completed';
      }
      if (status === 'Em Pausa') eventType = 'paused';
      if (status === 'Cancelado') eventType = 'cancelled';
      if (status === 'Em Progresso' && task.status === 'Em Pausa') eventType = 'resumed';

      const updatedTask = { ...task, ...updates };
      
      const newTimelineEntry: TaskTimelineEntry = {
          id: crypto.randomUUID(),
          taskId: task.id,
          eventType: eventType as any,
          oldStatus: task.status,
          newStatus: status,
          reason: reason,
          createdAt: now,
          userName: currentUser.name,
          userAvatar: currentUser.avatar
      };
      
      const newTimeline = task.timeline ? [...task.timeline, newTimelineEntry] : [newTimelineEntry];
      onUpdate({ ...updatedTask, timeline: newTimeline });

      await api.updateTask(updatedTask);
      await api.logTimelineEvent(task.id, eventType, status, task.status, reason);
  };

  const handleAiDescription = async () => {
    setIsGeneratingDesc(true);
    const desc = await generateTaskDescription(task.title);
    await handleFieldUpdate('description', desc, 'Descrição gerada por IA');
    setIsGeneratingDesc(false);
  };

  const handleAiSubtasks = async () => {
    setIsGeneratingSubs(true);
    const newSubtaskTitles = await generateSubtasks(task.title, task.description);
    
    const createdSubtasks = [];
    for (const title of newSubtaskTitles) {
        const res = await api.createSubtask(task.id, title);
        if (res.success && res.data) {
            createdSubtasks.push({
                id: res.data.id,
                title: res.data.title,
                completed: false,
                duration: res.data.duration || 1
            });
        }
    }
    
    if (createdSubtasks.length > 0) {
        const updatedSubtasks = [...task.subtasks, ...createdSubtasks];
        onUpdate({ ...task, subtasks: updatedSubtasks }); 
        // Adding subtasks logs internally in api.createSubtask, so we just refresh UI
    }
    setIsGeneratingSubs(false);
  };

  const toggleSubtask = async (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
        const newCompleted = !subtask.completed;
        const now = new Date().toISOString();

        const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, completed: newCompleted, completedAt: newCompleted ? now : undefined } : st
        );

        const total = updatedSubtasks.length;
        const completedCount = updatedSubtasks.filter(s => s.completed).length;
        const newProgress = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        let newStatus = task.status;
        let eventType = 'subtask_update';
        let reason = `Atividade "${subtask.title}" ${newCompleted ? 'concluída' : 'reaberta'}`;

        if (newCompleted && task.status === 'A Fazer') {
             newStatus = 'Em Progresso';
             eventType = 'started';
             reason = `Tarefa iniciada automaticamente pela atividade "${subtask.title}"`;
        } else if (newProgress === 100 && task.status !== 'Concluído') {
             newStatus = 'Concluído';
             eventType = 'completed';
             reason = 'Todas as atividades concluídas';
        } else if (!newCompleted && newProgress < 100 && task.status === 'Concluído') {
             newStatus = 'Em Progresso';
             eventType = 'resumed';
             reason = 'Tarefa reaberta (atividade pendente)';
        }

        const taskUpdates: any = { 
            subtasks: updatedSubtasks, 
            progress: newProgress,
            status: newStatus
        };

        if (newStatus === 'Em Progresso' && !task.startedAt) taskUpdates.startedAt = now;
        if (newStatus === 'Concluído' && !task.completedAt) taskUpdates.completedAt = now;
        if (newStatus !== 'Concluído') taskUpdates.completedAt = null;

        const newTimelineEntry: TaskTimelineEntry = {
            id: crypto.randomUUID(),
            taskId: task.id,
            eventType: eventType as any,
            newStatus: newStatus,
            oldStatus: task.status,
            reason: reason,
            createdAt: now,
            userName: currentUser.name,
            userAvatar: currentUser.avatar
        };
        const newTimeline = task.timeline ? [...task.timeline, newTimelineEntry] : [newTimelineEntry];

        onUpdate({ ...task, ...taskUpdates, timeline: newTimeline });
        
        await api.updateSubtask(subtaskId, { completed: newCompleted });
        await api.updateTask({ ...task, ...taskUpdates }); 
        await api.logTimelineEvent(task.id, eventType, newStatus, task.status, reason);
    }
  };

  const addSubtask = async () => {
    const res = await api.createSubtask(task.id, "Nova sub-tarefa");
    if (res.success && res.data) {
        const newSubtask: Subtask = { 
            id: res.data.id, 
            title: res.data.title, 
            completed: false,
            duration: res.data.duration || 1
        };
        const updatedSubtasks = [...task.subtasks, newSubtask];
        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter(s => s.completed).length;
        const newProgress = total === 0 ? 0 : Math.round((completed / total) * 100);

        // Timeline log handled in api.createSubtask, but let's refresh UI timeline
        const newTimelineEntry: TaskTimelineEntry = {
             id: crypto.randomUUID(),
             taskId: task.id,
             eventType: 'subtask_update',
             reason: 'Atividade criada: Nova sub-tarefa',
             createdAt: new Date().toISOString(),
             userName: currentUser.name,
             userAvatar: currentUser.avatar
        };
        const newTimeline = task.timeline ? [...task.timeline, newTimelineEntry] : [newTimelineEntry];

        onUpdate({ ...task, subtasks: updatedSubtasks, progress: newProgress, timeline: newTimeline });
        await api.updateTask({ ...task, progress: newProgress });
    }
  };

  const deleteSubtask = async (subtaskId: string, subtaskTitle: string) => {
      const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);
      const total = updatedSubtasks.length;
      const completed = updatedSubtasks.filter(s => s.completed).length;
      const newProgress = total === 0 ? 0 : Math.round((completed / total) * 100);

      // Log deletion
      await api.logTimelineEvent(task.id, 'info', undefined, undefined, `Atividade excluída: ${subtaskTitle}`);
      
      onUpdate({ ...task, subtasks: updatedSubtasks, progress: newProgress });
      await api.deleteSubtask(subtaskId);
      await api.updateTask({ ...task, progress: newProgress });
  };

  const handleSubtaskChange = async (subtaskId: string, field: keyof Subtask, value: any) => {
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if(!subtask) return;

      const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, [field]: value } : st
      );
      
      // Determine if we need to log this specific change immediately to timeline
      // Note: We don't want to log every keystroke for title, only onBlur ideally, but here we do it simply.
      // Ideally move title update to onBlur. For dates and assignee, logging immediately is fine.
      let logMsg = '';
      if (field === 'assigneeId') {
           const u = users.find(u => u.id === value);
           logMsg = `Atividade "${subtask.title}" atribuída para: ${u ? u.name : 'Ninguém'}`;
      } else if (field === 'dueDate') {
           logMsg = `Prazo da atividade "${subtask.title}" alterado para ${new Date(value).toLocaleDateString()}`;
      }

      onUpdate({ ...task, subtasks: updatedSubtasks });
      await api.updateSubtask(subtaskId, { [field]: value });

      if (logMsg) {
           await api.logTimelineEvent(task.id, 'subtask_update', undefined, undefined, logMsg);
           // Refresh local timeline
           const newEntry: TaskTimelineEntry = {
               id: crypto.randomUUID(),
               taskId: task.id,
               eventType: 'subtask_update',
               reason: logMsg,
               createdAt: new Date().toISOString(),
               userName: currentUser.name,
               userAvatar: currentUser.avatar
           };
           onUpdate({ ...task, subtasks: updatedSubtasks, timeline: task.timeline ? [...task.timeline, newEntry] : [newEntry] });
      }
  };

  // --- Attachments ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      const newAttachment = await api.uploadAttachment(task.id, file);
      if (newAttachment) {
          const msg = `Arquivo anexado: ${file.name}`;
          await api.logTimelineEvent(task.id, 'info', undefined, undefined, msg);
          onUpdate({ ...task, attachments: [...task.attachments, newAttachment] });
      } else {
          alert('Erro no upload. Tente novamente após atualizar a página.');
      }
      setIsUploading(false);
  };

  const deleteAttachment = async (id: string, name: string) => {
    if(!confirm("Excluir este anexo?")) return;
    const success = await api.deleteAttachment(id);
    if (success) {
        await api.logTimelineEvent(task.id, 'info', undefined, undefined, `Arquivo removido: ${name}`);
        onUpdate({ ...task, attachments: task.attachments.filter(a => a.id !== id) });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-4">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="flex justify-between items-start">
             {deadlineAlert && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${deadlineAlert.color}`}>
                      <AlertTriangle size={14} />
                      {deadlineAlert.label}
                  </div>
              )}
              {!deadlineAlert && <div></div>} {/* Spacer */}

              <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 uppercase">Progresso (Auto)</span>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg border dark:border-gray-700">
                       <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-600 transition-all duration-500" style={{width: `${task.progress}%`}}></div>
                       </div>
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 w-8 text-right">{task.progress}%</span>
                  </div>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <input
                  type="text" 
                  value={task.title}
                  onBlur={(e) => handleFieldUpdate('title', e.target.value)} // Log only on blur
                  onChange={(e) => onUpdate({...task, title: e.target.value})} // Local update for typing
                  className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white border-b-2 border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent transition-all w-full leading-tight"
                  placeholder="Título da Tarefa"
              />
              
              <div className="flex gap-2 flex-wrap shrink-0">
                  {/* Custom Status Select to handle logic */}
                  <div className="relative">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-bold outline-none appearance-none pr-8 cursor-pointer
                            ${task.status === 'Concluído' ? 'bg-green-100 text-green-700 border-green-200' :
                              task.status === 'Cancelado' ? 'bg-red-100 text-red-700 border-red-200' :
                              task.status === 'Em Pausa' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                              task.status === 'Em Progresso' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                      >
                        {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        <option value="Em Pausa">Em Pausa</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-70 pointer-events-none" />
                  </div>
                  
                  <select
                    value={task.priority}
                    onChange={(e) => handleFieldUpdate('priority', e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold outline-none
                      ${task.priority === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : 
                        task.priority === 'Média' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        'bg-green-50 text-green-700 border-green-200'}`}
                  >
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
              </div>
          </div>
      </div>

      {/* 2. People Section */}
      <div className="bg-gray-50 dark:bg-[#1b263b]/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-3">
                  <UserIcon size={14}/> Responsável Principal
              </label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                    <button 
                        key={u.id} 
                        onClick={() => handleFieldUpdate('assigneeId', u.id)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:bg-white dark:hover:bg-[#1e293b] ${task.assigneeId === u.id ? 'bg-white dark:bg-[#1e293b] border-indigo-500 ring-1 ring-indigo-500 shadow-sm' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
                    >
                        <Avatar src={u.avatar} alt={u.name} size="sm" />
                        <span className={`text-sm ${task.assigneeId === u.id ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300'}`}>{u.name}</span>
                        {task.assigneeId === u.id && <Check size={14} className="text-indigo-500 ml-1" />}
                    </button>
                ))}
              </div>
          </div>

          <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-3">
                  <UsersIcon size={14}/> Equipe de Apoio
              </label>
              <div className="flex flex-wrap gap-2">
                  {users.map(u => {
                      const isSelected = task.supportIds?.includes(u.id);
                      return (
                        <button key={u.id} onClick={() => {
                            const current = task.supportIds || [];
                            const next = current.includes(u.id) ? current.filter(id => id !== u.id) : [...current, u.id];
                            handleFieldUpdate('supportIds', next, isSelected ? `Removeu ${u.name} do apoio` : `Adicionou ${u.name} ao apoio`);
                        }} className={`relative`}>
                             <Avatar src={u.avatar} alt={u.name} size="sm" className={`transition-all ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-[#021221]' : 'opacity-50 hover:opacity-100'}`} />
                             {isSelected && <div className="absolute -top-1 -right-1 bg-indigo-500 w-3 h-3 rounded-full border-2 border-white dark:border-[#021221]"></div>}
                        </button>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* 3. Description Section */}
      <div className="space-y-3">
          <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                  <Layout size={16} /> Descrição
              </label>
              <button 
                  onClick={handleAiDescription} 
                  disabled={isGeneratingDesc} 
                  className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 rounded-full transition-colors font-medium border border-indigo-100 dark:border-indigo-800"
              >
                <Wand2 size={12} /> {isGeneratingDesc ? 'Gerando...' : 'Melhorar com IA'}
              </button>
          </div>
          <textarea
              value={task.description}
              onChange={(e) => onUpdate({...task, description: e.target.value})}
              onBlur={(e) => handleFieldUpdate('description', e.target.value)}
              rows={5}
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed shadow-sm"
              placeholder="Descreva os detalhes da tarefa, requisitos e contexto..."
          />
      </div>

      {/* 4. Subtasks (Activities & Dates) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-[#1b263b]/50">
               <label className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                   <CheckSquare size={16} /> Atividades & Cronograma
               </label>
               <button 
                   onClick={handleAiSubtasks} 
                   disabled={isGeneratingSubs} 
                   className="text-xs flex items-center gap-1 text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1.5 rounded-full font-medium border border-purple-100 dark:border-purple-800 hover:bg-purple-100 transition-colors"
               >
                   <Wand2 size={12} /> Sugerir Checklist
               </button>
          </div>
          
          <div className="p-4 space-y-3">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 px-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-1 text-center">Feito?</div>
                  <div className="col-span-4">Atividade</div>
                  <div className="col-span-2">Início</div>
                  <div className="col-span-2">Fim</div>
                  <div className="col-span-3">Responsável</div>
              </div>

              {task.subtasks.map(st => {
                  const assignee = users.find(u => u.id === st.assigneeId);
                  return (
                  <div key={st.id} className="grid grid-cols-12 gap-4 items-center group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2d3748] transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                      <div className="col-span-1 flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={st.completed} 
                            onChange={() => toggleSubtask(st.id)} 
                            className="w-5 h-5 rounded border-gray-300 cursor-pointer accent-indigo-600 focus:ring-indigo-500" 
                          />
                      </div>
                      <div className="col-span-4">
                          <input 
                            type="text"
                            value={st.title}
                            onBlur={(e) => handleSubtaskChange(st.id, 'title', e.target.value)}
                            onChange={(e) => {
                                const updatedSubtasks = task.subtasks.map(s => s.id === st.id ? { ...s, title: e.target.value } : s);
                                onUpdate({...task, subtasks: updatedSubtasks});
                            }}
                            className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium transition-colors ${st.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}
                            placeholder="Nome da atividade"
                          />
                      </div>
                      <div className="col-span-2">
                          <input 
                            type="date"
                            value={st.startDate ? st.startDate.split('T')[0] : ''}
                            onChange={(e) => handleSubtaskChange(st.id, 'startDate', e.target.value)}
                            className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-indigo-500"
                          />
                      </div>
                      <div className="col-span-2">
                          {st.completed && st.completedAt ? (
                              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded w-full block text-center">
                                  {new Date(st.completedAt).toLocaleDateString()}
                              </span>
                          ) : (
                            <input 
                                type="date"
                                value={st.dueDate ? st.dueDate.split('T')[0] : ''}
                                onChange={(e) => handleSubtaskChange(st.id, 'dueDate', e.target.value)}
                                className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-indigo-500"
                            />
                          )}
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                          <div className="relative w-full flex items-center gap-2">
                              {assignee ? (
                                  <Avatar src={assignee.avatar} alt={assignee.name} size="sm" className="w-6 h-6 flex-shrink-0" />
                              ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0">?</div>
                              )}
                              <select
                                 value={st.assigneeId || ''}
                                 onChange={(e) => handleSubtaskChange(st.id, 'assigneeId', e.target.value)}
                                 className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-indigo-500"
                              >
                                 <option value="">Sem dono</option>
                                 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                          </div>
                          <button onClick={() => deleteSubtask(st.id, st.title)} className="text-gray-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all ml-auto">
                              <Trash2 size={14} />
                          </button>
                      </div>
                  </div>
                  );
              })}

              <button 
                  onClick={addSubtask} 
                  className="w-full py-3 mt-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 font-medium"
              >
                  <Plus size={16} /> Adicionar Nova Atividade
              </button>
          </div>
      </div>

      {/* 5. Attachments Section */}
      <div className="bg-gray-50 dark:bg-[#1b263b]/30 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                    <Paperclip size={16} /> Arquivos & Anexos
                </label>
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading} 
                    className="text-xs flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-white hover:bg-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-all"
                >
                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Upload
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {task.attachments.length === 0 && (
                    <div className="col-span-full py-6 text-center text-gray-400 text-sm italic border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        Nenhum arquivo anexado.
                    </div>
                )}
                {task.attachments.map(att => (
                    <div key={att.id} className="flex flex-col p-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm group hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg shrink-0">
                                    {att.type === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <a href={att.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-indigo-600 truncate block max-w-[150px]">
                                        {att.name}
                                    </a>
                                    <span className="text-[10px] text-gray-400">{new Date(att.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <a href={att.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-500 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Visualizar">
                                    <Eye size={14} />
                                </a>
                                <button onClick={() => deleteAttachment(att.id, att.name)} className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Excluir">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Image Preview with Fallback */}
                        {att.type === 'image' && (
                            <div className="mt-3 relative w-full h-32 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 group/img">
                                <img 
                                    src={att.url} 
                                    alt={att.name} 
                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-105" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-gray-400', 'text-xs');
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="flex flex-col items-center gap-1"><span class="text-red-400 font-bold">Erro ao carregar</span><span>Link quebrado ou privado</span></span>';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
      </div>

      {/* 6. Timeline Section */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
           <label className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200 mb-6">
                <Clock size={16} /> Linha do Tempo
           </label>
           
           <div className="relative pl-6 space-y-8">
               {/* Vertical Line */}
               <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
               
               {/* Timeline Events */}
               {(task.timeline || []).length === 0 && (
                   <p className="text-xs text-gray-400 italic pl-2">Nenhum evento registrado ainda.</p>
               )}
               {task.timeline && [...task.timeline].reverse().map((event, idx) => {
                   let Icon = Clock;
                   let color = "bg-gray-100 text-gray-500";
                   
                   switch(event.eventType) {
                       case 'created': Icon = Plus; color = "bg-blue-100 text-blue-600"; break;
                       case 'started': Icon = PlayCircle; color = "bg-green-100 text-green-600"; break;
                       case 'completed': Icon = CheckCircle2; color = "bg-green-600 text-white"; break;
                       case 'paused': Icon = PauseCircle; color = "bg-orange-100 text-orange-600"; break;
                       case 'cancelled': Icon = XCircle; color = "bg-red-100 text-red-600"; break;
                       case 'resumed': Icon = PlayCircle; color = "bg-blue-100 text-blue-600"; break;
                       case 'subtask_update': Icon = CheckSquare; color = "bg-purple-100 text-purple-600"; break;
                       case 'info': Icon = Info; color = "bg-gray-200 text-gray-600"; break;
                   }

                   return (
                       <div key={event.id} className="relative flex items-start gap-4 group">
                            <div className={`absolute -left-[22px] w-8 h-8 rounded-full border-4 border-white dark:border-[#021221] flex items-center justify-center z-10 ${color}`}>
                                <Icon size={14} />
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-[#1b263b]/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">
                                        {event.eventType === 'subtask_update' ? 'Atividade' : event.eventType === 'status_change' ? 'Mudança de Status' : event.eventType === 'created' ? 'Criado' : event.eventType === 'started' ? 'Iniciado' : event.eventType === 'completed' ? 'Finalizado' : event.eventType === 'paused' ? 'Pausado' : event.eventType === 'cancelled' ? 'Cancelado' : event.eventType === 'info' ? 'Atualização' : 'Retomado'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(event.createdAt).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    {event.reason || (event.oldStatus && event.newStatus ? `Alterado de ${event.oldStatus} para ${event.newStatus}` : 'Sem detalhes adicionais.')}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Avatar src={event.userAvatar} alt={event.userName || '?'} size="sm" className="w-5 h-5 text-[10px]" />
                                    <span className="text-[10px] text-gray-500">{event.userName || 'Sistema'}</span>
                                </div>
                            </div>
                       </div>
                   )
               })}
           </div>
      </div>

      {/* Delete Footer */}
      <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end">
        <button 
            onClick={() => onDelete(task.id)} 
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          <Trash2 size={16} /> Excluir Tarefa Permanentemente
        </button>
      </div>

      {/* Status Reason Modal */}
      <Modal isOpen={showStatusReasonModal} onClose={() => { setShowStatusReasonModal(false); setPendingStatus(null); }} title={pendingStatus === 'Cancelado' ? 'Cancelar Tarefa' : 'Pausar Tarefa'} maxWidth="max-w-md">
           <div className="space-y-4">
               <p className="text-sm text-gray-600 dark:text-gray-300">
                   Por favor, informe o motivo para {pendingStatus === 'Cancelado' ? 'cancelar' : 'pausar'} esta tarefa. Isso ficará registrado na linha do tempo.
               </p>
               <textarea 
                  autoFocus
                  className="w-full p-3 border rounded-lg dark:bg-[#0f172a] dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Aguardando aprovação do cliente..."
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
               />
               <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => { setShowStatusReasonModal(false); setPendingStatus(null); }} className="px-4 py-2 text-gray-500 text-sm font-bold">Cancelar</button>
                   <button 
                    onClick={confirmStatusChange} 
                    disabled={!statusReason.trim()}
                    className={`px-4 py-2 text-white text-sm font-bold rounded-lg ${pendingStatus === 'Cancelado' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}
                   >
                       Confirmar
                   </button>
               </div>
           </div>
      </Modal>
    </div>
  );
};
