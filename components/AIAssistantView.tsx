import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Image as ImageIcon, Code as CodeIcon, Loader2, Paperclip, FileAudio, History, MessageSquare, Plus, Zap, Trash2, Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { sendGeneralAiMessage } from '../services/geminiService';
import { ChatMessage, ChatHistoryItem, AutomationRule } from '../types';
import { Modal } from './Modal';

export const AIAssistantView: React.FC = () => {
    // --- Persistence Logic: Lazy Initialize State ---
    const [history, setHistory] = useState<ChatHistoryItem[]>(() => {
        const saved = localStorage.getItem('jp_chat_history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.map((h: any) => ({
                    ...h,
                    date: new Date(h.date),
                    messages: h.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
                }));
            } catch (e) { console.error("History parse error", e); return []; }
        }
        return [];
    });

    const [automations, setAutomations] = useState<AutomationRule[]>(() => {
        const saved = localStorage.getItem('jp_automations');
        try {
            return saved ? JSON.parse(saved) : [];
        } catch(e) { return []; }
    });

    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    // State for Input
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<{name: string, content: string, mimeType?: string}[]>([]);
    
    // State for UI Layout
    const [showSidebar, setShowSidebar] = useState(true);
    const [showCanvas, setShowCanvas] = useState(false);
    const [isCanvasMaximized, setIsCanvasMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'automations'>('chat');
    
    // State for Canvas/Execution
    const [canvasContent, setCanvasContent] = useState<string>('');

    // Automation Modal
    const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Initial Setup (if empty)
    useEffect(() => {
        if (history.length === 0) {
            createNewChat();
        } else if (!currentChatId) {
            // Load most recent chat
            const recent = history[0];
            setCurrentChatId(recent.id);
            setMessages(recent.messages);
        }
    }, []);

    // Save History on Change
    useEffect(() => {
        if (history.length > 0) {
            localStorage.setItem('jp_chat_history', JSON.stringify(history));
        }
    }, [history]);

    // Save Automations on Change
    useEffect(() => {
        localStorage.setItem('jp_automations', JSON.stringify(automations));
    }, [automations]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Load Chat
    const loadChat = (chatId: string) => {
        const chat = history.find(h => h.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setMessages(chat.messages);
            setShowCanvas(false);
            if (window.innerWidth < 768) setShowSidebar(false); 
        }
    };

    const createNewChat = () => {
        const newId = crypto.randomUUID();
        const initialMsg: ChatMessage = { 
            id: crypto.randomUUID(), 
            role: 'model', 
            type: 'text', 
            content: 'Olá! Sou seu assistente Full-Stack. Posso gerar imagens, analisar arquivos, escrever código e criar automações.', 
            timestamp: new Date() 
        };
        
        const newChat: ChatHistoryItem = {
            id: newId,
            title: 'Nova Conversa',
            date: new Date(),
            messages: [initialMsg]
        };
        
        setHistory(prev => [newChat, ...prev]);
        setCurrentChatId(newId);
        setMessages([initialMsg]);
        setShowCanvas(false);
    };

    const deleteChat = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if(confirm('Excluir esta conversa?')) {
            const newHist = history.filter(h => h.id !== chatId);
            setHistory(newHist);
            // localStorage saves via useEffect
            if (currentChatId === chatId) {
                if (newHist.length > 0) loadChat(newHist[0].id);
                else createNewChat();
            }
        }
    };

    // File Handling
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/');
            
            if (isMedia) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) {
                        setAttachments(prev => [...prev, { 
                            name: file.name, 
                            content: ev.target!.result as string, // Base64 Data URL
                            mimeType: file.type 
                        }]);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                const text = await file.text();
                setAttachments(prev => [...prev, { name: file.name, content: text }]);
            }
        }
        e.target.value = '';
    };

    const handleSend = async () => {
        if (!inputValue.trim() && attachments.length === 0) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            type: 'text',
            content: inputValue,
            timestamp: new Date(),
            attachments: attachments
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputValue('');
        setAttachments([]);
        setIsLoading(true);

        // Improved Regex for Image Intent
        const lowerInput = userMsg.content.toLowerCase();
        const isImageGenerationRequest = attachments.length === 0 && (
            /(gerar|criar|fazer|desenhar) (uma )?(imagem|foto|desenho|ilustração|logo|banner)/i.test(lowerInput) ||
            /(desenhe|imagine|pinte) /i.test(lowerInput)
        );
        
        const contextHistory = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

        const response = await sendGeneralAiMessage(userMsg.content, contextHistory, isImageGenerationRequest, userMsg.attachments);

        const aiMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            type: response.imageUrl ? 'image' : response.code ? 'code' : 'text',
            content: response.text,
            imageUrl: response.imageUrl,
            codeLanguage: response.code?.lang,
            codeContent: response.code?.content,
            timestamp: new Date()
        };

        const updatedMessages = [...newMessages, aiMsg];
        setMessages(updatedMessages);
        setIsLoading(false);

        if (response.code) {
            setShowCanvas(true);
            setCanvasContent(response.code.content);
        }

        // Robust History Update
        setHistory(prev => {
            const updated = prev.map(h => {
                if (h.id === currentChatId) {
                    const newTitle = h.messages.length <= 1 ? userMsg.content.substring(0, 30) + '...' : h.title;
                    return { ...h, title: newTitle, messages: updatedMessages };
                }
                return h;
            });
            // If the current chat wasn't found (rare race condition), ensure we return at least the updated version if logic permits
            return updated;
        });
    };

    // --- Automation CRUD ---
    const handleAddAutomation = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 
        const formData = new FormData(e.currentTarget);
        
        const name = formData.get('name') as string;
        const trigger = formData.get('trigger') as string;
        const prompt = formData.get('prompt') as string;

        if (!name || !trigger || !prompt) return;

        const newAuto: AutomationRule = {
            id: crypto.randomUUID(),
            name,
            trigger,
            prompt,
            active: true
        };
        
        setAutomations(prev => [...prev, newAuto]);
        setIsAutoModalOpen(false);
    };

    const handleDeleteAutomation = (id: string) => {
        if(confirm('Tem certeza que deseja remover esta automação?')) {
            setAutomations(prev => prev.filter(a => a.id !== id));
        }
    };

    const toggleAutomation = (id: string) => {
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
    };

    // --- Renderers ---

    const renderAutomations = () => (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Zap size={20} className="text-yellow-500" /> Automações de IA
                </h3>
                <button 
                    onClick={() => setIsAutoModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                    <Plus size={16} /> Nova Regra
                </button>
            </div>
            
            {automations.length === 0 && (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <Zap size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhuma automação criada.</p>
                </div>
            )}

            <div className="grid gap-4">
                {automations.map(auto => (
                    <div key={auto.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">{auto.name}</h4>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono text-indigo-500">Gatilho: {auto.trigger}</span>
                                <span className="truncate max-w-xs">Ação: "{auto.prompt}"</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={auto.active} 
                                    onChange={() => toggleAutomation(auto.id)} 
                                    className="sr-only peer" 
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                            <button onClick={() => handleDeleteAutomation(auto.id)} className="text-gray-400 hover:text-red-500 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            
            <Modal isOpen={isAutoModalOpen} onClose={() => setIsAutoModalOpen(false)} title="Nova Automação" maxWidth="max-w-md">
                <form onSubmit={handleAddAutomation} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nome</label>
                        <input name="name" required placeholder="Ex: Relatório Diário" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-[#0f172a] dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Gatilho (Quando?)</label>
                        <input name="trigger" required placeholder="Ex: Todo dia às 09:00" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-[#0f172a] dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Prompt da IA (O que fazer?)</label>
                        <textarea name="prompt" required placeholder="Ex: Resuma as tarefas atrasadas e envie no chat." rows={3} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-[#0f172a] dark:border-gray-700 dark:text-white resize-none" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsAutoModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar Automação</button>
                    </div>
                </form>
            </Modal>
        </div>
    );

    return (
        <div className="flex h-full bg-gray-50 dark:bg-[#0f172a] overflow-hidden relative">
            {/* 1. Left Sidebar (History) */}
            <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col overflow-hidden`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><History size={16}/> Histórico</span>
                    <button onClick={createNewChat} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400" title="Nova Conversa"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map(h => (
                        <div key={h.id} className="relative group">
                            <button 
                                onClick={() => loadChat(h.id)}
                                className={`w-full text-left p-3 pr-8 rounded-lg text-sm truncate flex items-center gap-2 transition-colors ${currentChatId === h.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <MessageSquare size={14} className="flex-shrink-0" />
                                {h.title}
                            </button>
                            <button 
                                onClick={(e) => deleteChat(e, h.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                {/* Tabs for Sidebar Bottom */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-2 rounded text-xs font-bold flex justify-center items-center gap-1 transition-colors ${activeTab === 'chat' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        <MessageSquare size={14} /> Chat
                    </button>
                    <button 
                        onClick={() => setActiveTab('automations')}
                        className={`flex-1 py-2 rounded text-xs font-bold flex justify-center items-center gap-1 transition-colors ${activeTab === 'automations' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        <Zap size={14} /> Auto
                    </button>
                </div>
            </div>

            {/* 2. Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f172a] relative transition-colors">
                {/* Header Toggle */}
                <button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="absolute left-4 top-4 z-10 p-2 bg-white dark:bg-[#1e293b] rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors"
                >
                    {showSidebar ? <PanelRightClose size={16} className="rotate-180" /> : <PanelRightOpen size={16} className="rotate-180" />}
                </button>
                
                {activeTab === 'automations' ? renderAutomations() : (
                    <>
                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
                            {messages.map((msg) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} max-w-4xl mx-auto w-full group`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isUser ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300'}`}>
                                            {isUser ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        
                                        <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 rounded-2xl shadow-sm whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                                {/* Attachments Preview */}
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <div className="flex gap-2 mb-2 flex-wrap">
                                                        {msg.attachments.map((att, i) => (
                                                            <div key={i} className="bg-white/20 px-2 py-1 rounded text-xs flex items-center gap-1 border border-white/30">
                                                                {att.mimeType?.startsWith('image/') ? <ImageIcon size={10} /> : att.mimeType?.startsWith('audio/') ? <FileAudio size={10} /> : <Paperclip size={10} />}
                                                                {att.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Images */}
                                                {msg.imageUrl && (
                                                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-black/5">
                                                        <img src={msg.imageUrl} alt="Generated by AI" className="max-w-full h-auto" />
                                                        <a href={msg.imageUrl} download="generated-image.png" className="text-xs text-indigo-400 hover:underline mt-1 block">Baixar Imagem</a>
                                                    </div>
                                                )}

                                                {/* Text Content */}
                                                <div className="text-sm leading-relaxed font-sans">{msg.content}</div>

                                                {/* Code Actions */}
                                                {msg.type === 'code' && (
                                                    <div className="mt-3 flex gap-2">
                                                        <button 
                                                            onClick={() => { setShowCanvas(true); setCanvasContent(msg.codeContent || ''); }}
                                                            className="flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors font-medium"
                                                        >
                                                            <CodeIcon size={12} /> Executar no Canvas
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                             {isLoading && (
                                <div className="flex gap-4 max-w-4xl mx-auto w-full">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-gray-100 dark:bg-[#1e293b] p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-gray-400" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Gerando resposta...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1e293b] border-t border-gray-200 dark:border-gray-700 z-10 transition-colors">
                            <div className="max-w-4xl mx-auto relative">
                                {/* Attachments List */}
                                {attachments.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-2 flex gap-2">
                                        {attachments.map((att, i) => (
                                            <div key={i} className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded-lg text-xs flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                                                {att.mimeType?.startsWith('image/') ? <ImageIcon size={12} /> : att.mimeType?.startsWith('audio/') ? <FileAudio size={12} /> : <Paperclip size={12} />}
                                                {att.name} 
                                                <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}><Trash2 size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleFileUpload}
                                        accept=".txt,.js,.html,.css,.json,.md,.ts,.tsx"
                                    />
                                    <input 
                                        type="file" 
                                        ref={mediaInputRef} 
                                        className="hidden" 
                                        onChange={handleFileUpload}
                                        accept="image/*,audio/*"
                                    />
                                    
                                    {/* Action Buttons */}
                                    <div className="absolute left-2 top-2 flex gap-1">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            title="Anexar código para revisão ou texto"
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                        <button 
                                            onClick={() => mediaInputRef.current?.click()}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            title="Enviar Imagem ou Áudio"
                                        >
                                            <ImageIcon size={20} />
                                        </button>
                                    </div>
                                    
                                    <textarea 
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Gere imagens, peça código ou anexe arquivos para revisão..."
                                        className="w-full pl-24 pr-12 py-3 bg-gray-100 dark:bg-[#0f172a] border border-transparent focus:bg-white dark:focus:bg-[#0f172a] focus:ring-2 focus:ring-indigo-500 rounded-xl resize-none outline-none text-gray-900 dark:text-gray-100 transition-all text-sm shadow-inner"
                                        rows={1}
                                        style={{minHeight: '48px', maxHeight: '150px'}}
                                    />
                                    
                                    <button 
                                        onClick={handleSend}
                                        disabled={!inputValue.trim() && attachments.length === 0 || isLoading}
                                        className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 3. Right Sidebar (Canvas) */}
            {showCanvas && (
                <div 
                    className={`
                        ${isCanvasMaximized ? 'fixed inset-4 z-50 rounded-2xl border-2' : 'w-[500px] border-l'} 
                        border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] flex flex-col shadow-2xl transition-all duration-300 ease-in-out
                    `}
                >
                    <div className="h-12 bg-gray-50 dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 rounded-t-2xl">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <CodeIcon size={16} /> Canvas Preview
                        </span>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setIsCanvasMaximized(!isCanvasMaximized)} 
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                                title={isCanvasMaximized ? "Restore" : "Maximize"}
                             >
                                 {isCanvasMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                             </button>
                             <button 
                                onClick={() => setShowCanvas(false)} 
                                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                title="Close"
                             >
                                 <PanelRightClose size={14} />
                             </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-white relative">
                         {/* Simple execution sandbox */}
                        <iframe 
                            srcDoc={`<html><body>${canvasContent}</body></html>`} 
                            className="w-full h-full border-none rounded-b-2xl"
                            title="Canvas"
                            sandbox="allow-scripts"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};