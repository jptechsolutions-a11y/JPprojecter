import React, { useState, useRef, useEffect } from 'react';
import { Task, User, Priority, Status, Subtask, Attachment, Comment, Column, ApprovalStatus } from '../types';
import { Calendar, Tag, User as UserIcon, CheckSquare, Wand2, Trash2, Plus, X, Paperclip, FileText, Send, MessageSquare, Clock, Users as UsersIcon, Shield, ShieldCheck, ShieldAlert, Check, Ban, ChevronDown } from 'lucide-react';
import { Avatar } from './Avatar';
import { generateSubtasks, generateTaskDescription } from '../services/geminiService';

interface TaskDetailProps {
  task: Task;
  users: User[];
  columns: Column[]; // New prop for dynamic statuses
  currentUser: User;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onRequestApproval: (taskId: string, approverId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, users, columns, currentUser, onUpdate, onDelete, onRequestApproval }) => {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [showSupportSelector, setShowSupportSelector] = useState(false);
  
  // Approval state
  const [isSelectingApprover, setIsSelectingApprover] = useState(false);
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const priorities: Priority[] = ['Baixa', 'Média', 'Alta'];
  // Statuses come from columns prop now

  const handleAiDescription = async () => {
    setIsGeneratingDesc(true);
    const desc = await generateTaskDescription(task.title);
    onUpdate({ ...task, description: desc });
    setIsGeneratingDesc(false);
  };

  const handleAiSubtasks = async () => {
    setIsGeneratingSubs(true);
    const newSubtaskTitles = await generateSubtasks(task.title, task.description);
    const newSubtasks: Subtask[] = newSubtaskTitles.map(title => ({
      id: crypto.randomUUID(),
      title,
      completed: false
    }));
    onUpdate({ ...task, subtasks: [...task.subtasks, ...newSubtasks] });
    setIsGeneratingSubs(false);
  };

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const newSubtask: Subtask = { id: crypto.randomUUID(), title: "Nova sub-tarefa", completed: false };
    onUpdate({ ...task, subtasks: [...task.subtasks, newSubtask] });
  };

  const updateSubtaskTitle = (id: string, title: string) => {
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === id ? { ...st, title } : st
    );
    onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  // --- Attachments Logic ---
  const addAttachment = () => {
    const mockFileTypes = ['pdf', 'png', 'docx'];
    const randomType = mockFileTypes[Math.floor(Math.random() * mockFileTypes.length)];
    const newAttachment: Attachment = {
      id: crypto.randomUUID(),
      name: `Documento_Projeto_${task.attachments.length + 1}.${randomType}`,
      url: '#',
      type: 'file',
      createdAt: new Date().toISOString()
    };
    onUpdate({ ...task, attachments: [...task.attachments, newAttachment] });
  };

  const deleteAttachment = (id: string) => {
    onUpdate({ ...task, attachments: task.attachments.filter(a => a.id !== id) });
  };

  // --- Comments & Mentions Logic ---
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);
    if (val.endsWith('@')) {
      setShowMentions(true);
    } else if (val.endsWith(' ')) {
      setShowMentions(false);
    }
  };

  const insertMention = (userName: string) => {
    setCommentText(prev => prev + userName + ' ');
    setShowMentions(false);
    commentInputRef.current?.focus();
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
    setShowMentions(false);
  };

  // --- Support Team Logic ---
  const toggleSupportUser = (userId: string) => {
    const currentSupport = task.supportIds || [];
    const newSupport = currentSupport.includes(userId)
        ? currentSupport.filter(id => id !== userId)
        : [...currentSupport, userId];
    onUpdate({ ...task, supportIds: newSupport });
  };

  // --- Approval Logic ---
  const handleApprovalAction = (status: ApprovalStatus) => {
      onUpdate({ ...task, approvalStatus: status });
  };

  const handleApproverSelect = (userId: string) => {
      onRequestApproval(task.id, userId);
      setIsSelectingApprover(false);
  };

  const getApproverName = () => {
      if (!task.approverId) return 'Ninguém';
      const u = users.find(user => user.id === task.approverId);
      return u ? u.name : 'Desconhecido';
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-4 flex-wrap flex-1">
          <select
            value={task.status}
            onChange={(e) => onUpdate({ ...task, status: e.target.value as Status })}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          
          <select
            value={task.priority}
            onChange={(e) => onUpdate({ ...task, priority: e.target.value as Priority })}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-indigo-500
              ${task.priority === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : 
                task.priority === 'Média' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                'bg-green-50 text-green-700 border-green-200'}`}
          >
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Progresso</span>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={task.progress} 
                  onChange={(e) => onUpdate({...task, progress: Number(e.target.value)})}
                  className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-bold text-indigo-700 w-8 text-right">{task.progress}%</span>
            </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título</label>
        <input
          type="text"
          value={task.title}
          onChange={(e) => onUpdate({ ...task, title: e.target.value })}
          className="w-full text-2xl font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent transition-all"
        />
      </div>

      {/* Approval Workflow Section */}
      <div className="bg-white dark:bg-[#1b263b] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-visible">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                      task.approvalStatus === 'approved' ? 'bg-green-100 text-green-600' : 
                      task.approvalStatus === 'rejected' ? 'bg-red-100 text-red-600' : 
                      task.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                      {task.approvalStatus === 'approved' ? <ShieldCheck size={20} /> :
                      task.approvalStatus === 'rejected' ? <ShieldAlert size={20} /> :
                      <Shield size={20} />}
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Fluxo de Aprovação</h4>
                      <p className="text-xs text-gray-500">
                          {task.approvalStatus === 'none' ? 'Nenhum fluxo iniciado.' : 
                          task.approvalStatus === 'pending' ? `Aguardando aprovação de ${getApproverName()}.` :
                          task.approvalStatus === 'approved' ? `Aprovado por ${getApproverName()}.` : `Rejeitado por ${getApproverName()}.`}
                      </p>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 relative">
                  {task.approvalStatus === 'none' ? (
                      <div className="relative">
                          <button 
                              onClick={() => setIsSelectingApprover(!isSelectingApprover)}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-2"
                          >
                              Solicitar Aprovação <ChevronDown size={14} />
                          </button>
                          
                          {isSelectingApprover && (
                              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#0d1b2a] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-up">
                                  <div className="p-2 text-xs font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-700">Quem deve aprovar?</div>
                                  <div className="max-h-48 overflow-y-auto">
                                      {users.map(u => (
                                          <button 
                                              key={u.id}
                                              onClick={() => handleApproverSelect(u.id)}
                                              className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-[#1b263b] text-left transition-colors"
                                          >
                                              <Avatar src={u.avatar} alt={u.name} size="sm" />
                                              <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{u.name}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <>
                        {/* Only allow approval/rejection if current user is the approver */}
                        {currentUser.id === task.approverId && task.approvalStatus === 'pending' && (
                            <>
                                <button 
                                    onClick={() => handleApprovalAction('approved')}
                                    className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1 text-xs font-bold px-3"
                                    title="Aprovar"
                                >
                                    <Check size={14} /> Aprovar
                                </button>
                                <button 
                                    onClick={() => handleApprovalAction('rejected')}
                                    className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1 text-xs font-bold px-3"
                                    title="Rejeitar"
                                >
                                    <Ban size={14} /> Rejeitar
                                </button>
                            </>
                        )}
                        
                        <button 
                            onClick={() => onUpdate({ ...task, approvalStatus: 'none', approverId: undefined })}
                            className="text-xs text-gray-400 hover:text-red-500 hover:underline ml-2"
                            title="Cancelar solicitação"
                        >
                            Cancelar
                        </button>
                      </>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Description Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                Descrição
              </label>
              <button 
                onClick={handleAiDescription}
                disabled={isGeneratingDesc}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors"
              >
                <Wand2 size={12} />
                {isGeneratingDesc ? 'Gerando...' : 'Melhorar com IA'}
              </button>
            </div>
            <textarea
              value={task.description}
              onChange={(e) => onUpdate({ ...task, description: e.target.value })}
              rows={6}
              className="w-full p-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Adicione uma descrição detalhada..."
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Paperclip size={16} /> Anexos
                </label>
                <button 
                    onClick={addAttachment}
                    className="text-xs flex items-center gap-1 text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 px-2 py-1 rounded transition-colors border border-gray-200"
                >
                    <Plus size={12} /> Adicionar
                </button>
            </div>
            <div className="space-y-2">
                {task.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                                <FileText size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">{att.name}</span>
                                <span className="text-[10px] text-gray-400">{new Date(att.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button onClick={() => deleteAttachment(att.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
             {/* Assignee */}
            <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <UserIcon size={16} /> Responsável
                </label>
                <div className="flex flex-wrap gap-2">
                {users.map(u => (
                    <button
                    key={u.id}
                    onClick={() => onUpdate({ ...task, assigneeId: u.id })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${task.assigneeId === u.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                    <Avatar src={u.avatar} alt={u.name} size="sm" />
                    <span className="text-sm text-gray-700">{u.name}</span>
                    </button>
                ))}
                </div>
            </div>

            {/* Support Team */}
            <div className="col-span-2 relative">
                <div className="flex justify-between items-center mb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <UsersIcon size={16} /> Equipe de Apoio
                    </label>
                    <button onClick={() => setShowSupportSelector(!showSupportSelector)} className="text-xs text-indigo-600 font-medium">+ Gerenciar</button>
                </div>
                
                <div className="flex flex-wrap gap-2 min-h-[36px]">
                    {task.supportIds && task.supportIds.length > 0 ? (
                        task.supportIds.map(sid => {
                            const u = users.find(user => user.id === sid);
                            return u ? (
                                <div key={u.id} className="flex items-center gap-1 bg-gray-100 pl-1 pr-2 py-1 rounded-full border border-gray-200">
                                    <Avatar src={u.avatar} alt={u.name} size="sm" className="w-5 h-5 text-[10px]" />
                                    <span className="text-xs text-gray-700">{u.name}</span>
                                </div>
                            ) : null;
                        })
                    ) : <span className="text-sm text-gray-400 italic">Ninguém alocado</span>}
                </div>

                {showSupportSelector && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl rounded-lg p-2 z-20 mt-1 max-h-48 overflow-y-auto">
                        {users.map(u => (
                            <button
                                key={u.id}
                                onClick={() => toggleSupportUser(u.id)}
                                className="flex items-center gap-2 w-full p-2 hover:bg-gray-50 rounded-md"
                            >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${task.supportIds?.includes(u.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                    {task.supportIds?.includes(u.id) && <CheckSquare size={10} className="text-white" />}
                                </div>
                                <Avatar src={u.avatar} alt={u.name} size="sm" />
                                <span className="text-sm text-gray-700">{u.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Dates */}
            <div className="">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Clock size={16} /> Data de Início
                </label>
                <input 
                type="date" 
                value={task.startDate || ''}
                onChange={(e) => onUpdate({ ...task, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                />
            </div>
            <div className="">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} /> Data de Entrega
                </label>
                <input 
                type="date" 
                value={task.dueDate || ''}
                onChange={(e) => onUpdate({ ...task, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                />
            </div>
          </div>

          {/* Subtasks */}
          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
             <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CheckSquare size={16} /> Checklist
              </label>
              <button 
                onClick={handleAiSubtasks}
                disabled={isGeneratingSubs}
                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-1 rounded transition-colors"
              >
                <Wand2 size={12} />
                {isGeneratingSubs ? 'Criando...' : 'Sugerir Etapas'}
              </button>
            </div>
            
            <div className="space-y-2 mb-2">
              {task.subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-3 group">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() => toggleSubtask(st.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <input 
                    type="text"
                    value={st.title}
                    onChange={(e) => updateSubtaskTitle(st.id, e.target.value)}
                    className={`flex-1 text-sm bg-transparent border-none focus:ring-0 p-0 ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                  />
                  <button 
                    onClick={() => onUpdate({...task, subtasks: task.subtasks.filter(s => s.id !== st.id)})}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={addSubtask}
              className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 mt-2"
            >
              <Plus size={14} /> Adicionar item
            </button>
          </div>
        </div>
      </div>
      
      {/* Notes & Comments Section (Same as before) */}
      <div className="border-t border-gray-100 pt-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
            <MessageSquare size={16} /> Anotações & Comentários
        </label>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto space-y-4">
             {task.comments.length === 0 ? (
                 <p className="text-sm text-gray-400 text-center py-4">Nenhuma anotação ainda.</p>
             ) : (
                 task.comments.map(comment => {
                     const user = users.find(u => u.id === comment.userId) || currentUser;
                     return (
                         <div key={comment.id} className="flex gap-3">
                             <Avatar src={user.avatar} alt={user.name} size="sm" className="mt-1 flex-shrink-0" />
                             <div className="flex-1">
                                 <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-800">{user.name}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {comment.text.split(' ').map((word, i) => 
                                            word.startsWith('@') 
                                            ? <span key={i} className="text-indigo-600 font-medium bg-indigo-50 px-1 rounded">{word}</span> 
                                            : <span key={i}>{word} </span>
                                        )}
                                    </p>
                                 </div>
                             </div>
                         </div>
                     );
                 })
             )}
        </div>

        <div className="relative">
            <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={handleCommentChange}
                placeholder="Escreva uma anotação... Use @ para marcar alguém"
                className="w-full p-3 pr-12 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={2}
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addComment();
                    }
                }}
            />
            <button 
                onClick={addComment}
                className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!commentText.trim()}
            >
                <Send size={16} />
            </button>
            
            {showMentions && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-10 animate-fade-in-up">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">Marcar Alguém</div>
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => insertMention(`@${u.name}`)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left transition-colors"
                        >
                            <Avatar src={u.avatar} alt={u.name} size="sm" />
                            <span className="text-sm text-gray-700">{u.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
        >
          <Trash2 size={16} />
          Excluir Tarefa
        </button>
      </div>
    </div>
  );
};