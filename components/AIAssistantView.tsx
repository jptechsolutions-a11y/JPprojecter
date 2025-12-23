import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Image as ImageIcon, Code as CodeIcon, Sparkles, Loader2, Copy, Paperclip, Download, RefreshCw, PanelRightClose, PanelRightOpen, History, MessageSquare, Plus, Zap, Trash2, Maximize2, Mic, FileAudio, Minimize2 } from 'lucide-react';
import { sendGeneralAiMessage } from '../services/geminiService';
import { ChatMessage, ChatHistoryItem, AutomationRule } from '../types';

export const AIAssistantView: React.FC = () => {
    // State for Chat
    const [history, setHistory] = useState<ChatHistoryItem[]>([
        { id: 'h1', title: 'Landing Page Cafeteria', date: new Date(), messages: [] }
    ]);
    const [currentChatId, setCurrentChatId] = useState<string | null>('h1');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: '1', 
            role: 'model', 
            type: 'text', 
            content: 'Olá! Sou seu assistente Full-Stack. Posso analisar imagens, ouvir áudios, gerar código e criar automações. Como posso ajudar?', 
            timestamp: new Date() 
        }
    ]);
    
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
    const [automations, setAutomations] = useState<AutomationRule[]>([
        { id: 'a1', name: 'Relatório Semanal', trigger: 'Sexta-feira 17:00', prompt: 'Gerar resumo das tarefas concluídas', active: true }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load Chat
    const loadChat = (chatId: string) => {
        const chat = history.find(h => h.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setMessages(chat.messages.length > 0 ? chat.messages : [messages[0]]);
        }
    };

    const createNewChat = () => {
        const newId = crypto.randomUUID();
        const newChat: ChatHistoryItem = {
            id: newId,
            title: 'Nova Conversa',
            date: new Date(),
            messages: []
        };
        setHistory([newChat, ...history]);
        setCurrentChatId(newId);
        setMessages([messages[0]]);
        setShowCanvas(false);
    };

    // File Handling
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/');
            
            if (isMedia) {
                // Read as DataURL for Media
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
                // Read as Text for Code/Docs
                const text = await file.text();
                setAttachments(prev => [...prev, { name: file.name, content: text }]);
            }
        }
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
        setAttachments([]); // Clear attachments after sending
        setIsLoading(true);

        // Detect if user wants image GENERATION (not analysis)
        // Simple heuristic: if no attachments and asks for "generate image"
        const isImageGenerationRequest = attachments.length === 0 && (inputValue.toLowerCase().includes('gerar imagem') || inputValue.toLowerCase().includes('criar imagem'));
        
        // AI Call
        const response = await sendGeneralAiMessage(userMsg.content, newMessages, isImageGenerationRequest, userMsg.attachments);

        // Handle Response
        const aiMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            type: isImageGenerationRequest ? 'image' : response.code ? 'code' : 'text',
            content: response.text,
            imageUrl: response.imageUrl,
            codeLanguage: response.code?.lang,
            codeContent: response.code?.content,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false);

        // If code was generated, auto-open canvas and run
        if (response.code) {
            setShowCanvas(true);
            setCanvasContent(response.code.content);
        }

        // Update History Title if it's the first user message
        if (messages.length === 1 && currentChatId) {
            const updatedHistory = history.map(h => 
                h.id === currentChatId ? { ...h, title: userMsg.content.substring(0, 30) + '...', messages: [...newMessages, aiMsg] } : h
            );
            setHistory(updatedHistory);
        } else if (currentChatId) {
            // Just update messages
             const updatedHistory = history.map(h => 
                h.id === currentChatId ? { ...h, messages: [...newMessages, aiMsg] } : h
            );
            setHistory(updatedHistory);
        }
    };

    // --- Renderers ---

    const renderAutomations = () => (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Zap size={20} className="text-yellow-500" /> Automações de IA
                </h3>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                    <Plus size={16} /> Nova Regra
                </button>
            </div>
            <div className="grid gap-4">
                {automations.map(auto => (
                    <div key={auto.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">{auto.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Quando: {auto.trigger}</span>
                                <span>Faça: "{auto.prompt.substring(0, 30)}..."</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={auto.active} readOnly className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                            <button className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                <p>💡 <strong>Dica:</strong> Você pode pedir para a IA criar automações no chat. Ex: "Crie uma automação para resumir minhas tarefas toda sexta-feira".</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-gray-50 dark:bg-[#0f172a] overflow-hidden relative">
            {/* 1. Left Sidebar (History) */}
            <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col overflow-hidden`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><History size={16}/> Histórico</span>
                    <button onClick={createNewChat} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map(h => (
                        <button 
                            key={h.id} 
                            onClick={() => loadChat(h.id)}
                            className={`w-full text-left p-3 rounded-lg text-sm truncate flex items-center gap-2 transition-colors ${currentChatId === h.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <MessageSquare size={14} className="flex-shrink-0" />
                            {h.title}
                        </button>
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
                                    <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} max-w-4xl mx-auto w-full`}>
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
                                                        <button className="flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                                                            <Download size={12} /> Baixar
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
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Processando...</span>
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
                                            title="Anexar código/texto"
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
                                        placeholder="Digite uma mensagem..."
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