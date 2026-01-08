
import React, { useState, useRef, useEffect } from 'react';
import { Task, User, Priority, Status, Subtask, Attachment, Comment, Column, ApprovalStatus } from '../types';
import { Calendar, Tag, User as UserIcon, CheckSquare, Wand2, Trash2, Plus, X, Paperclip, FileText, Send, MessageSquare, Clock, Users as UsersIcon, Shield, ShieldCheck, ShieldAlert, Check, Ban, ChevronDown, Loader2, AlertTriangle, Layout } from 'lucide-react';
import { Avatar } from './Avatar';
import { generateSubtasks, generateTaskDescription } from '../services/geminiService';
import { api } from '../services/dataService';

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
  const [commentText, setCommentText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priorities: Priority[] = ['Baixa', 'Média', 'Alta'];

  // Helper para verificar prazo
  const getDeadlineAlert = () => {
    if (!task.dueDate || task.status === 'Concluído') return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(task.dueDate);
    due.setHours(0,0,0,0); // Normaliza para comparar apenas datas
    
    // Diferença em milissegundos
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Atrasado ${Math.abs(diffDays)} dias`, color: 'bg-red-100 text-red-700 border-red-200' };
    if (diffDays === 0) return { label: 'Entrega Hoje', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (diffDays <= 2) return { label: 'Prazo Próximo', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return null;
  };

  const deadlineAlert = getDeadlineAlert();

  const handleAiDescription = async () => {
    setIsGeneratingDesc(true);
    const desc = await generateTaskDescription(task.title);
    onUpdate({ ...task, description: desc });
    setIsGeneratingDesc(false);
  };

  const handleAiSubtasks = async () => {
    setIsGeneratingSubs(true);
    const newSubtaskTitles = await generateSubtasks(task.title, task.description);
    
    // Create subtasks one by one to ensure IDs
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
        // Recalculate progress logic here if needed, usually new tasks are 0% so progress drops
        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter(s => s.completed).length;
        const newProgress = total === 0 ? 0 : Math.round((completed / total) * 100);

        onUpdate({ ...task, subtasks: updatedSubtasks, progress: newProgress });
    }
    setIsGeneratingSubs(false);
  };

  const toggleSubtask = async (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
        const newCompleted = !subtask.completed;
        
        // Optimistic update of subtasks list
        const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, completed: newCompleted } : st
        );

        // Auto-Calculate Progress
        const total = updatedSubtasks.length;
        const completedCount = updatedSubtasks.filter(s => s.completed).length;
        const newProgress = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        // Update task with new subtasks AND new progress
        onUpdate({ ...task, subtasks: updatedSubtasks, progress: newProgress });
        
        // API calls (fire and forget / separate async)
        await api.updateSubtask(subtaskId, { completed: newCompleted });
        await api.updateTask({ ...task, progress: newProgress }); // Persist progress to DB
    }
  };

  const handleSubtaskChange = async (subtaskId: string, field: keyof Subtask, value: any) => {
      // Optimistic
      const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, [field]: value } : st
      );
      onUpdate({ ...task, subtasks: updatedSubtasks });
      
      // API
      await api.updateSubtask(subtaskId, { [field]: value });
  };

  const addSubtask = async () => {
    // 1. Create on server to get real ID
    const res = await api.createSubtask(task.id, "Nova sub-tarefa");
    
    if (res.success && res.data) {
        const newSubtask: Subtask = { 
            id: res.data.id, 
            title: res.data.title, 
            completed: false,
            duration: res.data.duration || 1
        };
        const updatedSubtasks = [...task.subtasks, newSubtask];
        // Recalculate progress
        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter(s => s.completed).length;
        const newProgress = total === 0 ? 0 : Math.round((completed / total) * 100);

        onUpdate({ ...task, subtasks: updatedSubtasks, progress: newProgress });
        await api.updateTask({ ...task, progress: newProgress });
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
      // Optimistic
      const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);
      
      // Recalculate progress
      const total = updatedSubtasks.length;
      const completed = updatedSubtasks.filter(s => s.completed).length;
      const newProgress = total === 0 ? 0 : Math.round((completed / total) * 100);

      onUpdate({ ...task, subtasks: updatedSubtasks, progress: newProgress });
      // API
      await api.deleteSubtask(subtaskId);
      await api.updateTask({ ...task, progress: newProgress });
  };

  // --- Real Attachment Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const newAttachment = await api.uploadAttachment(task.id, file);
      if (newAttachment) {
          onUpdate({ ...task, attachments: [...task.attachments, newAttachment] });
      } else {
          alert('Falha ao subir arquivo. Verifique se o bucket "attachments" foi criado no Supabase.');
      }
      setIsUploading(false);
  };

  const deleteAttachment = async (id: string) => {
    const success = await api.deleteAttachment(id);
    if (success) {
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
                  <span className="text-xs font-bold text-gray-500 uppercase">Progresso</span>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg border dark:border-gray-700">
                      <input 
                        type="range" min="0" max="100" 
                        value={task.progress} 
                        onChange={(e) => onUpdate({...task, progress: Number(e.target.value)})}
                        className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 w-8 text-right">{task.progress}%</span>
                  </div>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <input
                  type="text" 
                  value={task.title}
                  onChange={(e) => onUpdate({ ...task, title: e.target.value })}
                  className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white border-b-2 border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent transition-all w-full leading-tight"
                  placeholder="Título da Tarefa"
              />
              
              <div className="flex gap-2 flex-wrap shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => onUpdate({ ...task, status: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-[#0f172a] text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  
                  <select
                    value={task.priority}
                    onChange={(e) => onUpdate({ ...task, priority: e.target.value as Priority })}
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

      {/* 2. People Section (Responsável & Apoio) */}
      <div className="bg-gray-50 dark:bg-[#1b263b]/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-3">
                  <UserIcon size={14}/> Responsável Principal
              </label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                    <button 
                        key={u.id} 
                        onClick={() => onUpdate({ ...task, assigneeId: u.id })} 
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
                            onUpdate({ ...task, supportIds: next });
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
              onChange={(e) => onUpdate({ ...task, description: e.target.value })}
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
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-5">Atividade</div>
                  <div className="col-span-3">Início</div>
                  <div className="col-span-3">Fim</div>
              </div>

              {task.subtasks.map(st => (
                  <div key={st.id} className="grid grid-cols-12 gap-4 items-center group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2d3748] transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                      <div className="col-span-1 flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={st.completed} 
                            onChange={() => toggleSubtask(st.id)} 
                            className="w-5 h-5 rounded border-gray-300 cursor-pointer accent-indigo-600 focus:ring-indigo-500" 
                          />
                      </div>
                      <div className="col-span-5">
                          <input 
                            type="text"
                            value={st.title}
                            onChange={(e) => handleSubtaskChange(st.id, 'title', e.target.value)}
                            className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium transition-colors ${st.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}
                            placeholder="Nome da atividade"
                          />
                      </div>
                      <div className="col-span-3">
                          <input 
                            type="date"
                            value={st.startDate ? st.startDate.split('T')[0] : ''}
                            onChange={(e) => handleSubtaskChange(st.id, 'startDate', e.target.value)}
                            className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-indigo-500"
                          />
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                          <input 
                            type="date"
                            value={st.dueDate ? st.dueDate.split('T')[0] : ''}
                            onChange={(e) => handleSubtaskChange(st.id, 'dueDate', e.target.value)}
                            className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-indigo-500"
                          />
                          <button onClick={() => deleteSubtask(st.id)} className="text-gray-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={14} />
                          </button>
                      </div>
                  </div>
              ))}

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
                    <div key={att.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm group hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg shrink-0">
                                <FileText size={18} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <a href={att.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-indigo-600 truncate block">
                                    {att.name}
                                </a>
                                <span className="text-[10px] text-gray-400">{new Date(att.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button onClick={() => deleteAttachment(att.id)} className="text-gray-300 hover:text-red-500 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ))}
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
    </div>
  );
};
