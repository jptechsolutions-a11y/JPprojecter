import React, { useState, useRef } from 'react';
import { User, Team } from '../types';
import { Avatar } from './Avatar';
import { Mail, Copy, RefreshCw, UserPlus, Check, Hash, Link as LinkIcon, Shield, Trash2, MoreVertical, Plus, Send, Edit2, Camera, Code } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/dataService';

interface TeamViewProps {
    users: User[];
    currentTeam: Team;
}

export const TeamView: React.FC<TeamViewProps> = ({ users, currentTeam }) => {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [activeTab, setActiveTab] = useState<'email' | 'code'>('email');
    const [inviteCode, setInviteCode] = useState(currentTeam.inviteCode || 'JP-TEAM-000');
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Edit Team State
    const [isEditing, setIsEditing] = useState(false);
    const [teamName, setTeamName] = useState(currentTeam.name);
    const [teamAvatar, setTeamAvatar] = useState(currentTeam.avatar);
    
    const teamLogoRef = useRef<HTMLInputElement>(null);

    // Filter users belonging to this team
    const teamMembers = users.filter(u => currentTeam.members.includes(u.id));

    const handleCopyCode = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerateCode = () => {
        const randomCode = `JP-${currentTeam.name.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        setInviteCode(randomCode);
    };

    const handleSendInvite = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        // Simulate API call
        setTimeout(() => {
            setIsSending(false);
            setIsInviteModalOpen(false);
            alert(`Convite enviado para ${inviteEmail}!`);
            setInviteEmail('');
        }, 1500);
    };

    const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTeamAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateTeam = async () => {
        if (!teamName.trim()) return;
        await api.updateTeam(currentTeam.id, { name: teamName, avatar: teamAvatar });
        setIsEditing(false);
        // Simple local update for immediate feedback
        currentTeam.name = teamName;
        currentTeam.avatar = teamAvatar;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1b263b] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                    {/* Team Logo */}
                    <div className="relative group w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {teamAvatar ? (
                            <img src={teamAvatar} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-xl font-bold text-gray-400">{currentTeam.name.substring(0,2).toUpperCase()}</div>
                        )}
                        
                        {isEditing && (
                            <div 
                                className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => teamLogoRef.current?.click()}
                            >
                                <Camera size={20} className="text-white" />
                                <input ref={teamLogoRef} type="file" className="hidden" accept="image/*" onChange={handleTeamLogoUpload} />
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-3">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="text-2xl font-bold bg-white dark:bg-[#0d1b2a] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-800 dark:text-white"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateTeam} className="bg-green-500 text-white p-1 rounded hover:bg-green-600"><Check size={16} /></button>
                                    <button onClick={() => { setIsEditing(false); setTeamName(currentTeam.name); setTeamAvatar(currentTeam.avatar); }} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><Trash2 size={16} /></button>
                                </div>
                            ) : (
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                                    {currentTeam.name}
                                    <Edit2 size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h2>
                            )}
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-700">
                                {teamMembers.length} membros
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{currentTeam.description}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20"
                >
                    <UserPlus size={18} /> Convidar Membro
                </button>
            </div>

            {/* Member Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map(member => (
                    <div key={member.id} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center relative group hover:shadow-lg transition-all">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical size={16} />
                        </button>
                        
                        <div className="mb-4 relative">
                            <Avatar src={member.avatar} alt={member.name} size="xl" className="shadow-md border-4 border-white dark:border-[#1e293b]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#1e293b] rounded-full"></div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">{member.name}</h3>
                        <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-4">{member.role}</p>
                        
                        {/* Skills Display */}
                        <div className="w-full mb-6">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                <Code size={12} /> Habilidades
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-center min-h-[50px]">
                                {member.skills && member.skills.length > 0 ? member.skills.slice(0, 5).map((skill, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-[10px] border border-gray-100 dark:border-gray-700 whitespace-nowrap">
                                        {skill}
                                    </span>
                                )) : (
                                    <span className="text-[10px] text-gray-400 italic">Sem habilidades listadas</span>
                                )}
                                {member.skills && member.skills.length > 5 && (
                                    <span className="text-[10px] text-gray-400">+{member.skills.length - 5}</span>
                                )}
                            </div>
                        </div>

                        <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto flex justify-between items-center text-[11px] text-gray-500">
                             <div className="flex items-center gap-1 overflow-hidden max-w-[150px]">
                                 <Mail size={12} className="shrink-0" /> 
                                 <span className="truncate" title={member.email}>{member.email}</span>
                             </div>
                             {member.id === '1' && (
                                 <span className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-800">
                                     <Shield size={10} /> Admin
                                 </span>
                             )}
                        </div>
                    </div>
                ))}
                
                {/* Add Placeholder Card */}
                <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-[#00b4d8] hover:border-[#00b4d8] hover:bg-gray-50 dark:hover:bg-[#1b263b] transition-all min-h-[300px] group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={32} />
                    </div>
                    <span className="font-bold">Adicionar Novo</span>
                    <span className="text-xs mt-1">Convidar para o time</span>
                </button>
            </div>

            {/* Invite Modal */}
            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Adicionar Membros" maxWidth="max-w-lg">
                <div className="space-y-6">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('email')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'email' 
                                ? 'bg-white dark:bg-[#1e293b] text-indigo-600 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Mail size={16} /> Por E-mail
                        </button>
                        <button 
                            onClick={() => setActiveTab('code')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'code' 
                                ? 'bg-white dark:bg-[#1e293b] text-indigo-600 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Hash size={16} /> Código do Time
                        </button>
                    </div>

                    {/* Email Tab Content */}
                    {activeTab === 'email' && (
                        <div className="animate-fade-in space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Envie um convite direto para a caixa de entrada do seu colega. Eles receberão um link mágico para entrar.
                            </p>
                            <form onSubmit={handleSendInvite}>
                                <div className="relative mb-4">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-gray-400" />
                                    </div>
                                    <input 
                                        type="email" 
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="colega@empresa.com"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSending || !inviteEmail}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSending ? 'Enviando...' : <><Send size={16} /> Enviar Convite</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Code Tab Content */}
                    {activeTab === 'code' && (
                        <div className="animate-fade-in space-y-6 text-center py-4">
                             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                                 <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Código de Acesso</p>
                                 <div className="text-4xl font-mono font-bold text-gray-800 dark:text-white tracking-wider mb-2 select-all">
                                     {inviteCode}
                                 </div>
                                 <p className="text-xs text-gray-400">Este código expira em 7 dias</p>
                             </div>

                             <div className="flex justify-center gap-3">
                                 <button 
                                    onClick={handleCopyCode}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                                        copied 
                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                                    }`}
                                 >
                                     {copied ? <Check size={18} /> : <Copy size={18} />}
                                     {copied ? 'Copiado!' : 'Copiar Código'}
                                 </button>
                                 
                                 <button 
                                    onClick={handleRegenerateCode}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    title="Gerar novo código"
                                 >
                                     <RefreshCw size={18} />
                                 </button>
                             </div>

                             <div className="text-left bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg flex gap-3 items-start border border-yellow-100 dark:border-yellow-900/30">
                                 <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded">
                                     <LinkIcon size={14} />
                                 </div>
                                 <div>
                                     <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-500">Link Direto</h4>
                                     <p className="text-xs text-yellow-700 dark:text-yellow-600 mt-1">
                                         Qualquer pessoa com este código poderá entrar no time <strong>{currentTeam.name}</strong> automaticamente.
                                     </p>
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};