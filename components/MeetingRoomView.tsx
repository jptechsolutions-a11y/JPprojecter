import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, 
    MessageSquare, Users, Sparkles, MoreVertical, 
    Calendar, Clock, Plus, Send, X, Smile, Paperclip 
} from 'lucide-react';

interface MeetingRoomViewProps {
    users: User[];
    currentUser: User;
}

export const MeetingRoomView: React.FC<MeetingRoomViewProps> = ({ users, currentUser }) => {
    const [isInMeeting, setIsInMeeting] = useState(false);
    const [isAiActive, setIsAiActive] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Chat State
    const [messages, setMessages] = useState([
        { id: 1, user: users[1], text: 'Bom dia pessoal! Todos prontos?', time: '09:01' },
        { id: 2, user: users[2], text: 'Sim, só ajustando meu mic.', time: '09:02' },
    ]);
    const [inputText, setInputText] = useState('');

    // Request permissions on mount
    useEffect(() => {
        const requestPermissions = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                // Permissions granted. We stop the tracks immediately as we don't have a real video element 
                // in this UI mock to consume the stream yet, but this triggers the browser prompt.
                stream.getTracks().forEach(track => track.stop());
            } catch (err) {
                console.error("Error requesting media permissions:", err);
                // Optionally handle denial (e.g. setMicOn(false))
                setMicOn(false);
                setVideoOn(false);
            }
        };
        
        requestPermissions();
    }, []);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
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

    const toggleAi = () => {
        setIsAiActive(!isAiActive);
        if(!isAiActive) {
            // Simulate AI activation notification
            setMessages([...messages, {
                id: Date.now(),
                user: { ...currentUser, name: 'JP AI Copilot', id: 'ai' }, // Mock AI user
                text: '🤖 Gravação e Transcrição iniciadas. Gerarei um resumo ao final da chamada.',
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            }]);
        }
    };

    // --- LOBBY VIEW (Before joining) ---
    if (!isInMeeting) {
        return (
            <div className="h-full flex flex-col p-8 max-w-6xl mx-auto animate-fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Sala de Reunião</h1>
                    <p className="text-gray-500 dark:text-gray-400">Conecte-se com sua equipe, planeje sprints e discuta ideias.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left: Actions */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]" onClick={() => setIsInMeeting(true)}>
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Video size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                                    <Plus size={24} />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Nova Reunião</h2>
                                <p className="text-indigo-100 mb-6">Inicie uma sala instantânea e convide o time.</p>
                                <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors">
                                    Iniciar Agora
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 cursor-pointer transition-colors group">
                                <Calendar size={32} className="text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="font-bold text-gray-800 dark:text-white">Agendar</h3>
                                <p className="text-xs text-gray-500 mt-1">Planeje para depois</p>
                            </div>
                            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 cursor-pointer transition-colors group">
                                <MonitorUp size={32} className="text-teal-500 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="font-bold text-gray-800 dark:text-white">Compartilhar</h3>
                                <p className="text-xs text-gray-500 mt-1">Apresentar tela</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Upcoming & Preview */}
                    <div className="flex flex-col gap-6">
                        {/* Preview Box */}
                        <div className="bg-gray-900 rounded-3xl overflow-hidden relative aspect-video shadow-2xl flex items-center justify-center border border-gray-800">
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
                             <div className="text-center z-10">
                                 <Avatar src={currentUser.avatar} alt={currentUser.name} size="xl" className="mx-auto mb-4 border-4 border-white/10" />
                                 <h3 className="text-white font-medium">{currentUser.name}</h3>
                                 <p className="text-gray-400 text-sm">Pronto para entrar?</p>
                             </div>
                             <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                 <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-full ${micOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white'}`}>
                                     {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                                 </button>
                                 <button onClick={() => setVideoOn(!videoOn)} className={`p-3 rounded-full ${videoOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white'}`}>
                                     {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                                 </button>
                             </div>
                        </div>

                        {/* Upcoming List */}
                        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-gray-200 dark:border-gray-700 flex-1">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-indigo-500" /> Hoje
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex flex-col items-center justify-center font-bold text-xs leading-none">
                                        <span>10</span><span>:00</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800 dark:text-white text-sm">Daily Scrum</h4>
                                        <p className="text-xs text-gray-500">Planejamento do dia</p>
                                    </div>
                                    <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Entrar</button>
                                </div>
                                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                    <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex flex-col items-center justify-center font-bold text-xs leading-none">
                                        <span>14</span><span>:30</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800 dark:text-white text-sm">Review de Design</h4>
                                        <p className="text-xs text-gray-500">Aprovação de telas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- ACTIVE MEETING VIEW ---
    return (
        <div className="h-full bg-[#121212] flex overflow-hidden relative">
            
            {/* Main Video Area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${showChat ? 'mr-80' : ''}`}>
                
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            Daily Sincronização 
                            {isAiActive && (
                                <span className="bg-indigo-600/80 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-indigo-400">
                                    <Sparkles size={10} /> IA Gravando
                                </span>
                            )}
                        </h2>
                        <span className="text-gray-300 text-xs">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | JP Projects Meet</span>
                    </div>
                    <div className="flex -space-x-2">
                         {users.map((u, i) => (
                             <div key={i} className="border-2 border-[#121212] rounded-full">
                                 <Avatar src={u.avatar} alt={u.name} size="sm" />
                             </div>
                         ))}
                         <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs border-2 border-[#121212]">+2</div>
                    </div>
                </div>

                {/* Video Grid */}
                <div className="flex-1 p-4 flex gap-4 overflow-hidden">
                    {/* Main Speaker */}
                    <div className="flex-1 bg-[#1e1e1e] rounded-2xl relative overflow-hidden flex items-center justify-center border border-gray-800 shadow-2xl">
                        {/* Mock User Video Feed */}
                        <div className="text-center">
                            <Avatar src={users[1].avatar} alt={users[1].name} className="w-32 h-32 mx-auto mb-4 text-4xl" />
                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                                {users[1].name} <Mic size={14} className="text-green-400" />
                            </div>
                        </div>
                        {/* Visualizer bars for audio */}
                        <div className="absolute right-4 bottom-4 flex gap-1 h-8 items-end">
                             {[1,2,3,4,3,2].map((h, i) => (
                                 <div key={i} className="w-1 bg-green-500 rounded-full animate-pulse" style={{height: `${h * 20}%`}}></div>
                             ))}
                        </div>
                    </div>

                    {/* Sidebar Strip for others (if space allows, or use grid) */}
                    <div className="w-64 flex flex-col gap-4 overflow-y-auto hidden lg:flex">
                        <div className="flex-1 bg-[#1e1e1e] rounded-2xl relative overflow-hidden flex items-center justify-center border border-gray-800">
                            <Avatar src={currentUser.avatar} alt="Você" size="lg" />
                            <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded">Você</div>
                            {!micOn && <div className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full"><MicOff size={12} className="text-white"/></div>}
                        </div>
                         {users.slice(2).map(u => (
                            <div key={u.id} className="flex-1 bg-[#1e1e1e] rounded-2xl relative overflow-hidden flex items-center justify-center border border-gray-800">
                                <Avatar src={u.avatar} alt={u.name} size="lg" />
                                <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded">{u.name}</div>
                            </div>
                         ))}
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="h-20 flex items-center justify-center gap-4 pb-4">
                     <div className="bg-[#1e1e1e] border border-gray-700 px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl">
                         <button 
                            onClick={() => setMicOn(!micOn)}
                            className={`p-3 rounded-full transition-all ${micOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}
                         >
                             {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                         </button>
                         <button 
                            onClick={() => setVideoOn(!videoOn)}
                            className={`p-3 rounded-full transition-all ${videoOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}
                         >
                             {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                         </button>
                         
                         <div className="w-px h-8 bg-gray-700 mx-2"></div>
                         
                         <button 
                             onClick={toggleAi}
                             className={`p-3 rounded-full transition-all flex items-center gap-2 ${isAiActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                             title="IA Copilot: Resumo Automático"
                         >
                             <Sparkles size={20} />
                             {isAiActive && <span className="text-xs font-bold pr-1">Ativado</span>}
                         </button>

                         <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white">
                             <MonitorUp size={20} />
                         </button>
                         
                         <button 
                             onClick={() => setShowChat(!showChat)}
                             className={`p-3 rounded-full transition-all ${showChat ? 'bg-indigo-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                         >
                             <MessageSquare size={20} />
                         </button>

                         <div className="w-px h-8 bg-gray-700 mx-2"></div>

                         <button 
                            onClick={() => setIsInMeeting(false)}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
                         >
                             <PhoneOff size={20} /> Sair
                         </button>
                     </div>
                </div>

            </div>

            {/* Side Chat Panel */}
            <div 
                className={`absolute right-0 top-0 bottom-0 w-80 bg-[#1e1e1e] border-l border-gray-800 transform transition-transform duration-300 flex flex-col z-20 ${showChat ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <MessageSquare size={18} /> Chat da Sala
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => {
                        const isMe = msg.user.id === currentUser.id;
                        const isAi = msg.user.id === 'ai';
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {!isMe && !isAi && <span className="text-xs text-gray-400">{msg.user.name}</span>}
                                    {isAi && <span className="text-xs text-indigo-400 font-bold flex items-center gap-1"><Sparkles size={10} /> Copilot</span>}
                                    <span className="text-[10px] text-gray-600">{msg.time}</span>
                                </div>
                                <div className={`p-3 rounded-xl max-w-[90%] text-sm ${
                                    isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 
                                    isAi ? 'bg-indigo-900/30 border border-indigo-500/30 text-indigo-100 rounded-tl-none' :
                                    'bg-gray-800 text-gray-200 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-800 bg-[#1e1e1e]">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Digite uma mensagem..."
                            className="w-full bg-gray-800 text-white pl-4 pr-10 py-3 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-700 placeholder-gray-500"
                        />
                        <button 
                            type="submit"
                            disabled={!inputText.trim()}
                            className="absolute right-1 top-1 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-transparent transition-all"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};