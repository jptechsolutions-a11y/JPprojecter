
import React, { useState, useEffect } from 'react';
import { User, Meeting } from '../types';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, 
    MessageSquare, Users, Sparkles, MoreVertical, 
    Calendar, Clock, Plus, Send, X, Smile, Paperclip, 
    ExternalLink, CalendarDays, CheckCircle2, AlertCircle, Trash2, Loader2
} from 'lucide-react';
import { api } from '../services/dataService';

interface MeetingRoomViewProps {
    users: User[];
    currentUser: User;
    meetings: Meeting[];
    onUpdateMeetings: () => void;
}

export const MeetingRoomView: React.FC<MeetingRoomViewProps> = ({ users, currentUser, meetings, onUpdateMeetings }) => {
    const [isInMeeting, setIsInMeeting] = useState(false);
    const [isAiActive, setIsAiActive] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Agendamento State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Chat State
    const [messages, setMessages] = useState([
        { id: 1, user: users[0] || currentUser, text: 'Bem-vindo à sala de reunião JP Projects!', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
    ]);
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if(!inputText.trim()) return;
        setMessages([...messages, {
            id: Date.now(),
            user: currentUser,
            text: inputText,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }]);
        setInputText('');
    };

    const handleScheduleMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        // Obter o teamId do usuário logado (armazenado no App.tsx ou injetado)
        const teamId = (currentUser as any).teamId;

        if (!teamId) {
            alert("Erro: Time não identificado. Tente atualizar a página.");
            setIsSubmitting(false);
            return;
        }

        const newMeeting: Partial<Meeting> = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            date: formData.get('date') as string,
            startTime: formData.get('startTime') as string,
            endTime: formData.get('endTime') as string,
            meetUrl: formData.get('meetUrl') as string || 'https://meet.google.com/new',
            attendees: [currentUser.id],
            teamId: teamId,
            isGoogleMeet: true
        };

        const created = await api.createMeeting(newMeeting);
        
        if (created) {
            onUpdateMeetings();
            setIsScheduleModalOpen(false);
        } else {
            alert("Erro ao salvar reunião no banco de dados.");
        }
        setIsSubmitting(false);
    };

    const handleDeleteMeeting = async (id: string) => {
        if(!confirm("Excluir agendamento?")) return;
        const success = await api.deleteMeeting(id);
        if (success) onUpdateMeetings();
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysMeetings = meetings
        .filter(m => m.date === todayStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // --- LOBBY VIEW ---
    if (!isInMeeting) {
        return (
            <div className="h-full flex flex-col p-8 max-w-6xl mx-auto animate-fade-in overflow-y-auto">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Agenda de Reuniões</h1>
                        <p className="text-gray-500 dark:text-gray-400">Integração Google Meet & Gestão de Time.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-4xl font-bold text-[#00b4d8]">{currentTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">{currentTime.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Quick Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div 
                            onClick={() => setIsInMeeting(true)}
                            className="bg-gradient-to-br from-[#00b4d8] to-blue-700 rounded-3xl p-8 text-white shadow-xl cursor-pointer hover:scale-[1.02] transition-all group overflow-hidden relative"
                        >
                            <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform">
                                <Video size={120} />
                            </div>
                            <Plus size={32} className="mb-4 bg-white/20 p-1.5 rounded-lg" />
                            <h2 className="text-xl font-bold mb-1">Sala Interna Instantânea</h2>
                            <p className="text-indigo-100 text-sm mb-6">Inicie agora uma chamada de áudio/vídeo interna.</p>
                            <span className="bg-white text-[#00b4d8] px-4 py-2 rounded-xl text-xs font-bold shadow-lg">Iniciar Agora</span>
                        </div>

                        <button 
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="w-full bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-[#00b4d8] transition-colors flex items-center gap-4 group"
                        >
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                                <CalendarDays size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-800 dark:text-white">Agendar Reunião</h3>
                                <p className="text-xs text-gray-500">Sincronizar no Google Meet</p>
                            </div>
                        </button>
                    </div>

                    {/* Right: Agenda Today */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-gray-200 dark:border-gray-700 h-full flex flex-col shadow-sm">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Clock size={20} className="text-[#00b4d8]" /> Compromissos de Hoje
                            </h3>
                            
                            <div className="space-y-4 flex-1">
                                {todaysMeetings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 italic">
                                        <CheckCircle2 size={40} className="opacity-10 mb-2" />
                                        <p className="text-sm">Nenhuma reunião agendada para hoje.</p>
                                    </div>
                                ) : (
                                    todaysMeetings.map((m) => (
                                        <div key={m.id} className="group relative flex items-start gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-all">
                                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl shrink-0 font-bold border dark:border-gray-700">
                                                <span className="text-[#00b4d8] text-sm">{m.startTime}</span>
                                                <span className="text-[9px] text-gray-400 dark:text-gray-500">ATÉ {m.endTime}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">{m.title}</h4>
                                                <p className="text-xs text-gray-500 truncate mb-2">{m.description || 'Sem descrição.'}</p>
                                                <div className="flex items-center gap-2">
                                                    <Avatar src={currentUser.avatar} alt={currentUser.name} size="sm" />
                                                    <span className="text-[10px] text-gray-400">Organizador</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <a 
                                                    href={m.meetUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-[#00b4d8] p-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2 text-xs font-bold"
                                                >
                                                    <ExternalLink size={14} /> Entrar Google Meet
                                                </a>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setIsInMeeting(true)} className="flex-1 bg-gray-800 dark:bg-[#00b4d8] text-white px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-black transition-colors">
                                                        Entrar JP Room
                                                    </button>
                                                    <button onClick={() => handleDeleteMeeting(m.id)} className="p-2 text-gray-400 hover:text-red-500">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scheduling Modal */}
                <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Agendar Reunião">
                    <form onSubmit={handleScheduleMeeting} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Título da Reunião</label>
                            <input name="title" required placeholder="Ex: Daily de Alinhamento" className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-[#00b4d8]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Data</label>
                                <input name="date" type="date" required defaultValue={todayStr} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl dark:text-white outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Início</label>
                                    <input name="startTime" type="time" required className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl dark:text-white outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                                    <input name="endTime" type="time" required className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl dark:text-white outline-none" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Link do Google Meet (Opcional)</label>
                            <div className="relative">
                                <ExternalLink size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input name="meetUrl" placeholder="https://meet.google.com/..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl dark:text-white outline-none" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> Deixe vazio para usar o padrão 'meet.google.com/new'.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pauta / Descrição</label>
                            <textarea name="description" rows={2} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl resize-none dark:text-white outline-none"></textarea>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="bg-[#00b4d8] text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2">
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Criar Agendamento"}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    // --- ACTIVE MEETING VIEW (INTERNAL) ---
    return (
        <div className="h-full bg-[#121212] flex overflow-hidden relative">
            <div className={`flex-1 flex flex-col transition-all duration-300 ${showChat ? 'mr-80' : ''}`}>
                <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            Sala JP Projects (Privada)
                            {isAiActive && (
                                <span className="bg-[#00b4d8]/80 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-cyan-400">
                                    <Sparkles size={10} /> Gravando
                                </span>
                            )}
                        </h2>
                        <span className="text-gray-300 text-xs">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>

                <div className="flex-1 p-4 flex gap-4 overflow-hidden items-center justify-center">
                    <div className="w-full max-w-4xl aspect-video bg-[#1e1e1e] rounded-3xl relative overflow-hidden flex items-center justify-center border border-gray-800 shadow-2xl">
                        <div className="text-center">
                            <Avatar src={currentUser.avatar} alt={currentUser.name} className="w-40 h-40 mx-auto mb-4 border-4 border-[#00b4d8]/20" />
                            <div className="bg-black/40 backdrop-blur px-4 py-1.5 rounded-full text-white font-medium flex items-center gap-2 border border-white/10">
                                {currentUser.name} <Mic size={14} className="text-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-24 flex items-center justify-center gap-4 pb-6">
                     <div className="bg-[#1e1e1e] border border-gray-700 px-8 py-3 rounded-full flex items-center gap-4 shadow-2xl">
                         <button onClick={() => setMicOn(!micOn)} className={`p-3.5 rounded-full transition-all ${micOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}>
                             {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                         </button>
                         <button onClick={() => setVideoOn(!videoOn)} className={`p-3.5 rounded-full transition-all ${videoOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}>
                             {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                         </button>
                         <div className="w-px h-8 bg-gray-700 mx-2"></div>
                         <button onClick={() => setIsAiActive(!isAiActive)} className={`p-3.5 rounded-full transition-all ${isAiActive ? 'bg-[#00b4d8] text-white' : 'bg-gray-700 text-gray-300'}`}>
                             <Sparkles size={20} />
                         </button>
                         <button onClick={() => setShowChat(!showChat)} className={`p-3.5 rounded-full transition-all ${showChat ? 'bg-[#00b4d8] text-white' : 'bg-gray-700 text-white'}`}>
                             <MessageSquare size={20} />
                         </button>
                         <div className="w-px h-8 bg-gray-700 mx-2"></div>
                         <button onClick={() => setIsInMeeting(false)} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20">
                             <PhoneOff size={20} /> Encerrar
                         </button>
                     </div>
                </div>
            </div>

            {/* Chat Panel */}
            <div className={`absolute right-0 top-0 bottom-0 w-80 bg-[#1e1e1e] border-l border-gray-800 transition-transform duration-300 flex flex-col z-20 ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e1e1e]">
                    <h3 className="text-white font-bold flex items-center gap-2"><MessageSquare size={18} /> Chat da Sala</h3>
                    <button onClick={() => setShowChat(false)} className="text-gray-400"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.user.id === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-gray-500 mb-1">{msg.user.name} • {msg.time}</span>
                            <div className={`p-3 rounded-2xl max-w-[90%] text-sm ${msg.user.id === currentUser.id ? 'bg-[#00b4d8] text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-800">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Mensagem..." className="w-full bg-gray-800 text-white pl-4 pr-10 py-3 rounded-2xl text-sm border border-gray-700 focus:ring-2 focus:ring-[#00b4d8] outline-none" />
                        <button type="submit" className="absolute right-2 top-2 p-1.5 bg-[#00b4d8] text-white rounded-full"><Send size={14}/></button>
                    </form>
                </div>
            </div>
        </div>
    );
};
