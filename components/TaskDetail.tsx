
import React, { useState, useRef } from 'react';
import { Task, User, Priority, Status, Subtask, Attachment, Comment, Column, ApprovalStatus } from '../types';
import { Calendar, Tag, User as UserIcon, CheckSquare, Wand2, Trash2, Plus, X, Paperclip, FileText, Send, MessageSquare, Clock, Users as UsersIcon, Shield, ShieldCheck, ShieldAlert, Check, Ban, ChevronDown, Loader2 } from 'lucide-react';
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
  const [showMentions, setShowMentions] = useState(false);
  const [showSupportSelector, setShowSupportSelector] = useState(false);
  const [isSelectingApprover, setIsSelectingApprover] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const priorities: Priority[] = ['Baixa', 'Média', 'Alta'];

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
                completed: false
            });
        }
    }
    
    if (createdSubtasks.length > 0) {
        onUpdate({ ...task, subtasks: [...task.subtasks, ...createdSubtasks] });
    }
    setIsGeneratingSubs(false);
  };

  const toggleSubtask = async (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
        const newCompleted = !subtask.completed;
        // Optimistic update
        const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, completed: newCompleted } : st
        );
        onUpdate({ ...task, subtasks: updatedSubtasks });
        
        // API call
        await api.updateSubtask(subtaskId, { completed: newCompleted });
    }
  };

  const handleSubtaskTitleChange = (subtaskId: string, newTitle: string) => {
      const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, title: newTitle } : st
      );
      onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  const saveSubtaskTitle = async (subtaskId: string, newTitle: string) => {
      await api.updateSubtask(subtaskId, { title: newTitle });
  };

  const addSubtask = async () => {
    // 1. Create on server to get real ID
    const res = await api.createSubtask(task.id, "Nova sub-tarefa");
    
    if (res.success && res.data) {
        const newSubtask: Subtask = { 
            id: res.data.id, 
            title: res.data.title, 
            completed: false 
        };
        onUpdate({ ...task, subtasks: [...task.subtasks, newSubtask] });
    } else {
        // Fallback optimistic if offline (though API is online only)
        const tempId = crypto.randomUUID();
        const newSubtask: Subtask = { id: tempId, title: "Nova sub-tarefa", completed: false };
        onUpdate({ ...task, subtasks: [...task.subtasks, newSubtask] });
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
      // Optimistic
      const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);
      onUpdate({ ...task, subtasks: updatedSubtasks });
      // API
      await api.deleteSubtask(subtaskId);
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

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      text: commentText,
      createdAt: new Date().toISOString()
    };
    onUpdate({ ...task, comments: [...task.comments, newComment] });
    setCommentText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-4 flex-wrap flex-1">
          <select
            value={task.status}
            onChange={(e) => onUpdate({ ...task, status: e.target.value })}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-[#0f172a] text-sm font-medium"
          >
            {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          
          <select
            value={task.priority}
            onChange={(e) => onUpdate({ ...task, priority: e.target.value as Priority })}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium
              ${task.priority === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : 
                task.priority === 'Média' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                'bg-green-50 text-green-700 border-green-200'}`}
          >
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
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

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título</label>
        <input
          type="text" value={task.title}
          onChange={(e) => onUpdate({ ...task, title: e.target.value })}
          className="w-full text-2xl font-bold text-gray-900 dark:text-white border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Descrição</label>
              <button onClick={handleAiDescription} disabled={isGeneratingDesc} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors">
                <Wand2 size={12} /> {isGeneratingDesc ? 'Gerando...' : 'Melhorar com IA'}
              </button>
            </div>
            <textarea
              value={task.description}
              onChange={(e) => onUpdate({ ...task, description: e.target.value })}
              rows={6}
              className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#0f172a] text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Adicione uma descrição..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <Paperclip size={16} /> Anexos
                </label>
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-xs flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-indigo-600 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors border border-gray-200 dark:border-gray-700">
                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Adicionar Arquivo
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
            <div className="space-y-2">
                {task.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded">
                                <FileText size={16} />
                            </div>
                            <div className="flex flex-col">
                                <a href={att.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 truncate max-w-[180px]">{att.name}</a>
                                <span className="text-[10px] text-gray-400">{new Date(att.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button onClick={() => deleteAttachment(att.id)} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Responsável</label>
                <div className="flex flex-wrap gap-2">
                {users.map(u => (
                    <button key={u.id} onClick={() => onUpdate({ ...task, assigneeId: u.id })} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${task.assigneeId === u.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
                        <Avatar src={u.avatar} alt={u.name} size="sm" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                    </button>
                ))}
                </div>
            </div>
            <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Equipe de Apoio</label>
                <div className="flex flex-wrap gap-2">
                    {users.map(u => (
                        <button key={u.id} onClick={() => {
                            const current = task.supportIds || [];
                            const next = current.includes(u.id) ? current.filter(id => id !== u.id) : [...current, u.id];
                            onUpdate({ ...task, supportIds: next });
                        }} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${task.supportIds?.includes(u.id) ? 'bg-indigo-100 border-indigo-300' : 'border-gray-200 dark:border-gray-700'}`}>
                            <Avatar src={u.avatar} alt={u.name} size="sm" className="w-4 h-4" /> {u.name}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
             <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"><CheckSquare size={16} /> Checklist</label>
              <button onClick={handleAiSubtasks} disabled={isGeneratingSubs} className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">IA Sugerir</button>
            </div>
            <div className="space-y-2">
              {task.subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-3 group">
                  <input 
                    type="checkbox" 
                    checked={st.completed} 
                    onChange={() => toggleSubtask(st.id)} 
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-indigo-600" 
                  />
                  <input 
                    type="text"
                    value={st.title}
                    onChange={(e) => handleSubtaskTitleChange(st.id, e.target.value)}
                    onBlur={(e) => saveSubtaskTitle(st.id, e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') { saveSubtaskTitle(st.id, e.currentTarget.value); e.currentTarget.blur(); } }}
                    className={`flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-sm transition-colors ${st.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                  />
                  <button onClick={() => deleteSubtask(st.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addSubtask} className="text-sm text-indigo-600 flex items-center gap-1 mt-2 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"><Plus size={14} /> Novo Item</button>
          </div>
        </div>
      </div>
      
      <div className="pt-6 border-t dark:border-gray-700">
        <button onClick={() => onDelete(task.id)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium">
          <Trash2 size={16} /> Excluir Tarefa
        </button>
      </div>
    </div>
  );
};
