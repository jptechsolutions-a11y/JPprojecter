
import React, { useState, useRef, useEffect } from 'react';
import { Task, User, Priority, Status, Subtask, Attachment, Comment, Column, ApprovalStatus, TaskTimelineEntry, TaskGroup } from '../types';
import { Calendar, Tag, User as UserIcon, CheckSquare, Wand2, Trash2, Plus, X, Paperclip, FileText, Send, MessageSquare, Clock, Users as UsersIcon, Shield, ShieldCheck, ShieldAlert, Check, Ban, ChevronDown, Loader2, AlertTriangle, Layout, PlayCircle, CheckCircle2, PauseCircle, XCircle, Info, Image as ImageIcon, Eye, Download, Save, ThumbsUp, ThumbsDown, Folder } from 'lucide-react';
import { Avatar } from './Avatar';
import { generateSubtasks, generateTaskDescription } from '../services/geminiService';
import { api } from '../services/dataService';
import { Modal } from './Modal';

interface TaskDetailProps {
  task: Task;
  users: User[];
  taskGroups: TaskGroup[]; // Add taskGroups to props
  columns: Column[];
  currentUser: User;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onRequestApproval: (taskId: string, approverId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, users, taskGroups, columns, currentUser, onUpdate, onDelete, onRequestApproval }) => {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
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

    if (diffDays < 0) return { label: `Atrasado ${Math.abs(diffDays)} dias`, color: 'text-red-600' };
    if (diffDays === 0) return { label: 'Entrega Hoje', color: 'text-orange-600' };
    if (diffDays <= 2) return { label: 'Prazo Próximo', color: 'text-yellow-600' };
    return null;
  };

  const deadlineAlert = getDeadlineAlert();

  // --- APPROVAL LOGIC ---
  const handleApproverChange = async (approverId: string) => {
      if (!approverId) {
          await handleFieldUpdate('approverId', null);
          return;
      }
      
      const newApprover = users.find(u => u.id === approverId);
      const updates = { 
          ...task, 
          approverId: approverId, 
          approvalStatus: 'pending' as ApprovalStatus 
      };
      
      onUpdate(updates);
      await api.updateTask(updates);
      
      // Notify the new approver
      await api.createNotification(
          approverId, 
          task.id, 
          'approval_request', 
          'Aprovação Solicitada', 
          `Você foi definido como aprovador da tarefa "${task.title}".`
      );
      
      await api.logTimelineEvent(task.id, 'info', undefined, undefined, `Aprovador definido: ${newApprover?.name}`);
  };

  const handleApprovalAction = async (status: 'approved' | 'rejected') => {
      const updates = { ...task, approvalStatus: status };
      onUpdate(updates);
      await api.updateTask(updates);

      // Notify the Assignee
      if (task.assigneeId) {
          const title = status === 'approved' ? 'Tarefa Aprovada!' : 'Tarefa Rejeitada';
          const msg = status === 'approved' 
            ? `Sua tarefa "${task.title}" foi aprovada por ${currentUser.name}.`
            : `Sua tarefa "${task.title}" foi rejeitada por ${currentUser.name}. Verifique os comentários.`;
            
          await api.createNotification(task.assigneeId, task.id, 'approval_result', title, msg);
      }

      await api.logTimelineEvent(task.id, 'info', undefined, undefined, `Aprovação: ${status === 'approved' ? 'Aprovado' : 'Rejeitado'} por ${currentUser.name}`);
  };

  // --- GENERIC FIELD UPDATER WITH LOGGING ---
  const handleFieldUpdate = async (field: keyof Task, value: any, logMessage?: string) => {
      const updatedTask = { ...task, [field]: value };
      
      let finalLogMessage = logMessage;
      if (!finalLogMessage) {
          if (field === 'title') finalLogMessage = `Título alterado para "${value}"`;
          else if (field === 'description') finalLogMessage = `Descrição da tarefa atualizada`;
          else if (field === 'priority') finalLogMessage = `Prioridade alterada para ${value}`;
          else if (field === 'startDate') finalLogMessage = `Data de início alterada para ${new Date(value).toLocaleDateString()}`;
          else if (field === 'dueDate') finalLogMessage = `Data de entrega alterada para ${new Date(value).toLocaleDateString()}`;
          else if (field === 'groupId') {
              const g = taskGroups.find(g => g.id === value);
              finalLogMessage = `Tarefa movida para o projeto: ${g ? g.title : 'Desconhecido'}`;
          }
          else if (field === 'assigneeId') {
              if (value) {
                const u = users.find(u => u.id === value);
                finalLogMessage = `Responsável principal alterado para ${u ? u.name : 'Ninguém'}`;
              } else {
                finalLogMessage = `Responsável principal removido`;
              }
          }
          else if (field === 'supportIds') {
              // Only log if explicit message not provided, though supportIds changes are complex to log generically
              // We'll handle logging in the JSX event handler or just skip detailed logging for this batch update
          }
      }

      // Optimistic update
      onUpdate(updatedTask); // Calls parent to update local state
      
      // API Calls
      await api.updateTask(updatedTask);
      
      if (finalLogMessage) {
          await api.logTimelineEvent(task.id, 'info', undefined, undefined, finalLogMessage);
          
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

  const handleSaveDescription = async () => {
      setIsSavingDesc(true);
      await handleFieldUpdate('description', task.description);
      setTimeout(() => setIsSavingDesc(false), 500);
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
    onUpdate({...task, description: desc});
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
      
      let logMsg = '';
      if (field === 'assigneeId') {
           const u = users.find(u => u.id === value);
           logMsg = `Atividade "${subtask.title}" atribuída para: ${u ? u.name : 'Ninguém'}`;
      } else if (field === 'dueDate') {
           logMsg = `Prazo da atividade "${subtask.title}" alterado para ${new Date(value).toLocaleDateString()}`;
      } else if (field === 'startDate') {
           logMsg = `Início da atividade "${subtask.title}" alterado para ${new Date(value).toLocaleDateString()}`;
      }

      onUpdate({ ...task, subtasks: updatedSubtasks });
      await api.updateSubtask(subtaskId, { [field]: value });

      if (logMsg) {
           await api.logTimelineEvent(task.id, 'subtask_update', undefined, undefined, logMsg);
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

  const downloadAttachment = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed', error);
        window.open(url, '_blank');
    }
  };

  return (
    <div className="animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* 1. Header Area: Title & Meta Bar */}
      <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
          <input
              type="text" 
              value={task.title}
              onBlur={(e) => handleFieldUpdate('title', e.target.value)}
              onChange={(e) => onUpdate({...task, title: e.target.value})}
              className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 w-full mb-3 text-gray-900 dark:text-white"
              placeholder="Título da Tarefa"
          />
          
          <div className="flex flex-wrap items-center gap-3">
              {/* Status Select */}
              <div className="relative group">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                        ${task.status === 'Concluído' ? 'bg-green-100 text-green-700' :
                          task.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                          task.status === 'Em Pausa' ? 'bg-orange-100 text-orange-700' :
                          task.status === 'Em Progresso' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}
                  >
                    <option value="A Fazer">A Fazer</option>
                    <option value="Em Progresso">Em Progresso</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Em Pausa">Em Pausa</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>

              {/* Priority Select */}
              <div className="relative group">
                  <select
                    value={task.priority}
                    onChange={(e) => handleFieldUpdate('priority', e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                      ${task.priority === 'Alta' ? 'bg-red-50 text-red-700 border border-red-100' : 
                        task.priority === 'Média' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 
                        'bg-teal-50 text-teal-700 border border-teal-100'}`}
                  >
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>

              {/* Deadline Alert */}
              {deadlineAlert && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${deadlineAlert.color} bg-opacity-10 bg-current`}>
                      <AlertTriangle size={12} /> {deadlineAlert.label}
                  </div>
              )}

              {/* Progress Bar */}
              <div className="flex items-center gap-2 ml-auto">
                   <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${task.progress}%`}}></div>
                   </div>
                   <span className="text-xs font-medium text-gray-500">{task.progress}%</span>
              </div>
          </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6">
          
          {/* LEFT COLUMN: Content (Description, Subtasks, Files) - Spans 8 */}
          <div className="lg:col-span-8 space-y-6">
              
              {/* Description */}
              <div className="group">
                  <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <Layout size={14} /> Descrição
                      </label>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={handleAiDescription} disabled={isGeneratingDesc} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1">
                              <Wand2 size={10} /> IA
                          </button>
                          <button onClick={handleSaveDescription} disabled={isSavingDesc} className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 transition-colors flex items-center gap-1">
                              {isSavingDesc ? <Loader2 size={10} className="animate-spin"/> : <Save size={10} />} Salvar
                          </button>
                      </div>
                  </div>
                  <textarea
                      value={task.description}
                      onChange={(e) => onUpdate({...task, description: e.target.value})}
                      rows={4}
                      className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f172a] text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-[#1e293b] outline-none resize-y transition-all"
                      placeholder="Adicione detalhes..."
                  />
              </div>

              {/* Subtasks */}
              <div>
                  <div className="flex items-center justify-between mb-2 bg-gray-50 dark:bg-[#1b263b] p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                       <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                           <CheckSquare size={14} /> Checklist ({task.subtasks.filter(s=>s.completed).length}/{task.subtasks.length})
                       </label>
                       <button onClick={handleAiSubtasks} disabled={isGeneratingSubs} className="text-[10px] text-purple-600 hover:bg-purple-100 px-2 py-1 rounded transition-colors flex items-center gap-1">
                           <Wand2 size={10} /> Sugerir
                       </button>
                  </div>
                  <div className="space-y-2">
                      {task.subtasks.map(st => (
                          <div key={st.id} className="flex flex-col gap-2 p-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 rounded-lg group transition-all hover:shadow-sm">
                              {/* Top Line: Check, Title, Delete */}
                              <div className="flex items-center gap-3">
                                  <input 
                                    type="checkbox" 
                                    checked={st.completed} 
                                    onChange={() => toggleSubtask(st.id)} 
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <input 
                                    className={`flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 ${st.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}
                                    value={st.title}
                                    onChange={(e) => handleSubtaskChange(st.id, 'title', e.target.value)}
                                    placeholder="Nome da atividade"
                                  />
                                  <button onClick={() => deleteSubtask(st.id, st.title)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                              
                              {/* Bottom Line: Assignee, Start Date, Due Date */}
                              <div className="flex flex-wrap items-center gap-2 pl-7">
                                  {/* Assignee Selector */}
                                  <div className="relative group/assignee">
                                       <div className="flex items-center gap-1 cursor-pointer bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 hover:border-indigo-300">
                                           {st.assigneeId ? (
                                               <Avatar src={users.find(u => u.id === st.assigneeId)?.avatar} alt="User" size="sm" className="w-4 h-4 text-[8px]" />
                                           ) : (
                                               <UserIcon size={10} className="text-gray-400" />
                                           )}
                                           <span className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[60px] truncate">
                                              {st.assigneeId ? users.find(u => u.id === st.assigneeId)?.name.split(' ')[0] : 'Responsável'}
                                           </span>
                                       </div>
                                       <select 
                                          value={st.assigneeId || ''} 
                                          onChange={(e) => handleSubtaskChange(st.id, 'assigneeId', e.target.value)}
                                          className="absolute inset-0 opacity-0 cursor-pointer"
                                       >
                                          <option value="">Sem dono</option>
                                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                       </select>
                                  </div>

                                  {/* Start Date */}
                                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                                      <span className="text-[8px] text-gray-400 uppercase font-bold">INÍCIO</span>
                                      <input 
                                        type="date"
                                        value={st.startDate ? st.startDate.split('T')[0] : ''}
                                        onChange={(e) => handleSubtaskChange(st.id, 'startDate', e.target.value)}
                                        className="w-20 text-[10px] bg-transparent text-gray-600 dark:text-gray-300 border-none p-0 focus:ring-0 cursor-pointer"
                                      />
                                  </div>

                                  {/* Due Date */}
                                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                                      <span className="text-[8px] text-gray-400 uppercase font-bold">FIM</span>
                                      <input 
                                        type="date"
                                        value={st.dueDate ? st.dueDate.split('T')[0] : ''}
                                        onChange={(e) => handleSubtaskChange(st.id, 'dueDate', e.target.value)}
                                        className="w-20 text-[10px] bg-transparent text-gray-600 dark:text-gray-300 border-none p-0 focus:ring-0 cursor-pointer"
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                      <button onClick={addSubtask} className="flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-500 mt-2 pl-2 transition-colors">
                          <Plus size={12} /> Adicionar item
                      </button>
                  </div>
              </div>

              {/* Attachments */}
              <div>
                  <div className="flex items-center justify-between mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <Paperclip size={14} /> Anexos ({task.attachments.length})
                      </label>
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                          {isUploading ? '...' : '+ Add'}
                      </button>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {task.attachments.map(att => (
                          <div key={att.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors overflow-hidden">
                              {att.type === 'image' ? (
                                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                  </div>
                              ) : (
                                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
                                      <FileText size={16} />
                                  </div>
                              )}
                              <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate" title={att.name}>{att.name}</p>
                                  <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => downloadAttachment(att.url, att.name)} className="text-[10px] text-blue-500 hover:underline">Baixar</button>
                                      <button onClick={() => deleteAttachment(att.id, att.name)} className="text-[10px] text-red-500 hover:underline">Excluir</button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Timeline (Condensed) */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                   <div className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-2"><Clock size={12} /> Histórico Recente</div>
                   <div className="space-y-3 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1">
                       {(task.timeline || []).slice(-5).reverse().map(event => (
                           <div key={event.id} className="text-xs pl-3 relative">
                               <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 ring-2 ring-white dark:ring-[#1e293b]"></div>
                               <div className="flex items-center gap-2">
                                   <span className="font-bold text-gray-700 dark:text-gray-300">{event.userName || 'Sistema'}</span>
                                   <span className="text-gray-400 text-[10px]">{new Date(event.createdAt).toLocaleString()}</span>
                               </div>
                               <p className="text-gray-500 dark:text-gray-400 mt-0.5">{event.reason || event.eventType}</p>
                           </div>
                       ))}
                   </div>
              </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Metadata & Actions) - Spans 4 */}
          <div className="lg:col-span-4 bg-gray-50/50 dark:bg-[#1b263b]/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-fit space-y-6">
              
              {/* Project Move */}
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Projeto</label>
                  <div className="relative">
                      <select 
                          value={task.groupId} 
                          onChange={(e) => handleFieldUpdate('groupId', e.target.value)}
                          className="w-full appearance-none bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-600 rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                          {taskGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.title}</option>
                          ))}
                      </select>
                      <Folder size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Início</label>
                      <input 
                          type="date"
                          value={task.startDate ? task.startDate.split('T')[0] : ''}
                          onChange={(e) => handleFieldUpdate('startDate', e.target.value)}
                          className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 text-xs py-1 focus:border-indigo-500 outline-none text-gray-700 dark:text-gray-300"
                      />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Entrega</label>
                      <input 
                          type="date"
                          value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                          onChange={(e) => handleFieldUpdate('dueDate', e.target.value)}
                          className={`w-full bg-transparent border-b text-xs py-1 focus:border-indigo-500 outline-none ${deadlineAlert ? 'border-red-300 text-red-600 font-bold' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                      />
                  </div>
              </div>

              {/* Assignees */}
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Responsável Principal</label>
                  <div className="flex flex-wrap gap-2">
                      {users.map(u => (
                          <button 
                              key={u.id} 
                              onClick={() => handleFieldUpdate('assigneeId', task.assigneeId === u.id ? null : u.id)}
                              className={`relative w-8 h-8 rounded-full transition-all ${task.assigneeId === u.id ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-[#1b263b] z-10' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
                              title={u.name}
                          >
                              <Avatar src={u.avatar} alt={u.name} size="md" />
                              {task.assigneeId === u.id && <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-0.5 border border-white"><Check size={8} className="text-white"/></div>}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Support Team */}
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Equipe de Apoio</label>
                  <div className="flex flex-wrap gap-2">
                      {users.map(u => (
                          <button 
                              key={u.id} 
                              onClick={() => {
                                  const currentSupport = task.supportIds || [];
                                  const newSupport = currentSupport.includes(u.id) 
                                      ? currentSupport.filter(id => id !== u.id)
                                      : [...currentSupport, u.id];
                                  handleFieldUpdate('supportIds', newSupport);
                              }}
                              className={`relative w-7 h-7 rounded-full transition-all ${task.supportIds?.includes(u.id) ? 'ring-2 ring-purple-400 ring-offset-1 dark:ring-offset-[#1b263b] opacity-100' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}
                              title={u.name}
                          >
                              <Avatar src={u.avatar} alt={u.name} size="md" />
                          </button>
                      ))}
                  </div>
              </div>

              {/* Approval */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center justify-between">
                      <span>Aprovação</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${task.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : task.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                          {task.approvalStatus === 'approved' ? 'APROVADO' : task.approvalStatus === 'rejected' ? 'REJEITADO' : 'PENDENTE'}
                      </span>
                  </label>
                  
                  {task.approverId && task.approverId === currentUser.id && task.approvalStatus === 'pending' ? (
                      <div className="flex gap-2 mt-2">
                          <button onClick={() => handleApprovalAction('approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1.5 rounded font-bold flex justify-center items-center gap-1"><ThumbsUp size={12}/> Aprovar</button>
                          <button onClick={() => handleApprovalAction('rejected')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 rounded font-bold flex justify-center items-center gap-1"><ThumbsDown size={12}/> Rejeitar</button>
                      </div>
                  ) : (
                      <select 
                          value={task.approverId || ''}
                          onChange={(e) => handleApproverChange(e.target.value)}
                          className="w-full mt-1 text-xs border-b border-gray-300 dark:border-gray-600 bg-transparent py-1 outline-none focus:border-indigo-500 text-gray-600 dark:text-gray-300"
                      >
                          <option value="">+ Adicionar Aprovador</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                  )}
              </div>

              {/* Delete */}
              <div className="pt-6 mt-auto">
                  <button onClick={() => onDelete(task.id)} className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded transition-colors flex items-center justify-center gap-2">
                      <Trash2 size={14} /> Excluir Tarefa
                  </button>
              </div>
          </div>
      </div>

      {/* Status Reason Modal */}
      <Modal isOpen={showStatusReasonModal} onClose={() => { setShowStatusReasonModal(false); setPendingStatus(null); }} title={pendingStatus === 'Cancelado' ? 'Cancelar Tarefa' : 'Pausar Tarefa'} maxWidth="max-w-md">
           <div className="space-y-4">
               <p className="text-sm text-gray-600 dark:text-gray-300">
                   Por favor, informe o motivo para {pendingStatus === 'Cancelado' ? 'cancelar' : 'pausar'} esta tarefa.
               </p>
               <textarea 
                  autoFocus
                  className="w-full p-3 border rounded-lg dark:bg-[#0f172a] dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ex: Aguardando aprovação do cliente..."
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
               />
               <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => { setShowStatusReasonModal(false); setPendingStatus(null); }} className="px-4 py-2 text-gray-500 text-xs font-bold">Cancelar</button>
                   <button 
                    onClick={confirmStatusChange} 
                    disabled={!statusReason.trim()}
                    className={`px-4 py-2 text-white text-xs font-bold rounded-lg ${pendingStatus === 'Cancelado' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}
                   >
                       Confirmar
                   </button>
               </div>
           </div>
      </Modal>
    </div>
  );
};
