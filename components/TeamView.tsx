
import React, { useState, useRef } from 'react';
import { User, Team, TeamRole } from '../types';
import { Avatar } from './Avatar';
import { Mail, Copy, RefreshCw, UserPlus, Check, Hash, Link as LinkIcon, Shield, Trash2, MoreVertical, Plus, Send, Edit2, Camera, Code, UserCog, Loader2, ShieldCheck, Settings } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/dataService';

interface TeamViewProps {
    users: User[];
    currentTeam: Team;
    onDeleteTeam: (teamId: string) => void;
    roles?: TeamRole[]; // Opcional, vindo do App.tsx
    onRolesUpdate?: () => void; // Callback para atualizar dados no App
}

export const TeamView: React.FC<TeamViewProps> = ({ users, currentTeam, onDeleteTeam, roles = [], onRolesUpdate }) => {
    const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
    
    // Modal States
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isMemberEditModalOpen, setIsMemberEditModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    // Member Editing
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    
    // Role Creation
    const [newCustomRole, setNewCustomRole] = useState({ name: '', level: 1, color: '#6b7280' });

    // Invite Logic
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteTab, setInviteTab] = useState<'email' | 'code'>('email');
    const [inviteCode, setInviteCode] = useState(currentTeam.inviteCode || 'JP-TEAM-000');
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Team Edit
    const [isEditing, setIsEditing] = useState(false);
    const [teamName, setTeamName] = useState(currentTeam.name);
    const [teamAvatar, setTeamAvatar] = useState(currentTeam.avatar);
    const teamLogoRef = useRef<HTMLInputElement>(null);

    const teamMembers = users.filter(u => currentTeam.members.includes(u.id));

    // --- Handlers ---

    const handleCopyCode = () => {
        navigator.clipboard.writeText(currentTeam.inviteCode || inviteCode);
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
        currentTeam.name = teamName;
        currentTeam.avatar = teamAvatar;
    };

    const handleEditMember = (member: User) => {
        setSelectedMember(member);
        setNewRoleName(member.role);
        setIsMemberEditModalOpen(true);
    };

    const handleSaveMemberRole = async () => {
        if (!selectedMember) return;
        setIsUpdatingRole(true);
        const success = await api.updateMemberRole(currentTeam.id, selectedMember.id, newRoleName);
        if (success) {
            selectedMember.role = newRoleName;
            setIsMemberEditModalOpen(false);
            if(onRolesUpdate) onRolesUpdate();
        } else {
            alert('Erro ao atualizar cargo.');
        }
        setIsUpdatingRole(false);
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const created = await api.createTeamRole(currentTeam.id, newCustomRole.name, newCustomRole.level, newCustomRole.color);
        if(created) {
            if(onRolesUpdate) onRolesUpdate();
            setIsRoleModalOpen(false);
            setNewCustomRole({ name: '', level: 1, color: '#6b7280' });
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if(!confirm('Tem certeza? Usuários com este cargo podem ficar sem permissão.')) return;
        const success = await api.deleteTeamRole(roleId);
        if(success && onRolesUpdate) onRolesUpdate();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1b263b] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center gap-4">
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
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{currentTeam.description}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 text-sm"
                    >
                        <UserPlus size={18} /> Convidar
                    </button>
                    
                    <button 
                        onClick={() => onDeleteTeam(currentTeam.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir Time"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => setActiveTab('members')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'members' ? 'border-[#00b4d8] text-[#00b4d8]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                >
                    Membros ({teamMembers.length})
                </button>
                <button 
                    onClick={() => setActiveTab('roles')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'roles' ? 'border-[#00b4d8] text-[#00b4d8]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                >
                    <ShieldCheck size={16} /> Cargos e Permissões
                </button>
            </div>

            {/* Content */}
            {activeTab === 'members' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamMembers.map(member => (
                        <div key={member.id} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center relative group hover:shadow-xl transition-all h-full">
                            <button 
                                onClick={() => handleEditMember(member)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-indigo-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <UserCog size={18} />
                            </button>
                            
                            <div className="mb-4 relative">
                                <Avatar src={member.avatar} alt={member.name} size="xl" className="shadow-md border-4 border-white dark:border-[#1e293b]" />
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">{member.name}</h3>
                            <div className="mb-6">
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {member.role}
                                </span>
                            </div>
                            
                            <div className="w-full pt-5 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                 <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                                     <Mail size={14} className="shrink-0 text-[#00b4d8]" /> 
                                     <span className="text-[12px] font-medium break-all select-all">{member.email}</span>
                                 </div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-[#00b4d8] hover:border-[#00b4d8] hover:bg-gray-50 dark:hover:bg-[#1b263b] transition-all min-h-[300px] group"
                    >
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold">Adicionar Novo</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">Defina a hierarquia e funções do seu time.</p>
                        <button 
                            onClick={() => setIsRoleModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Novo Cargo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {roles.map(role => (
                            <div key={role.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: role.color}}>
                                        {role.level}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-white text-lg">{role.name}</h4>
                                        <p className="text-xs text-gray-500">
                                            {role.level === 3 ? 'Acesso Total (Admin)' : role.level === 2 ? 'Editor (Cria/Edita Tarefas)' : 'Visualizador (Somente Leitura)'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Prevent deleting default Admin role if needed, or handle in backend */}
                                    <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Member Edit Modal */}
            <Modal isOpen={isMemberEditModalOpen} onClose={() => setIsMemberEditModalOpen(false)} title="Gerenciar Membro" maxWidth="max-w-md">
                {selectedMember && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#0f172a] rounded-2xl border border-gray-200 dark:border-gray-700">
                            <Avatar src={selectedMember.avatar} alt={selectedMember.name} size="lg" />
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">{selectedMember.name}</h4>
                                <p className="text-xs text-gray-500">{selectedMember.email}</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Cargo no Time</label>
                            <select 
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                className="w-full p-3.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#0d1b2a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                            >
                                {roles.map(r => (
                                    <option key={r.id} value={r.name}>{r.name} (Nível {r.level})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-6">
                            <button onClick={() => setIsMemberEditModalOpen(false)} className="px-5 py-2.5 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-white transition-colors">Cancelar</button>
                            <button 
                                onClick={handleSaveMemberRole} 
                                disabled={isUpdatingRole}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                            >
                                {isUpdatingRole ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18}/> Salvar Cargo</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Create Role Modal */}
            <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Criar Novo Cargo" maxWidth="max-w-md">
                 <form onSubmit={handleCreateRole} className="space-y-4">
                     <div>
                         <label className="block text-sm font-bold mb-1">Nome do Cargo</label>
                         <input 
                            required 
                            placeholder="Ex: Tech Lead" 
                            className="w-full p-2 border rounded" 
                            value={newCustomRole.name} 
                            onChange={(e) => setNewCustomRole({...newCustomRole, name: e.target.value})}
                        />
                     </div>
                     <div>
                         <label className="block text-sm font-bold mb-1">Nível de Permissão</label>
                         <select 
                            className="w-full p-2 border rounded"
                            value={newCustomRole.level}
                            onChange={(e) => setNewCustomRole({...newCustomRole, level: Number(e.target.value)})}
                         >
                             <option value={1}>Nível 1 - Visualizador (Somente Leitura)</option>
                             <option value={2}>Nível 2 - Editor (Membro Padrão)</option>
                             <option value={3}>Nível 3 - Admin (Gerenciamento Total)</option>
                         </select>
                     </div>
                     <div>
                         <label className="block text-sm font-bold mb-1">Cor da Identificação</label>
                         <input 
                            type="color" 
                            className="w-full h-10 p-1 rounded cursor-pointer"
                            value={newCustomRole.color}
                            onChange={(e) => setNewCustomRole({...newCustomRole, color: e.target.value})}
                         />
                     </div>
                     <div className="flex justify-end gap-2 pt-4">
                         <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
                         <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Criar Cargo</button>
                     </div>
                 </form>
            </Modal>

            {/* Invite Modal (Existing) */}
            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Convite de Equipe" maxWidth="max-w-lg">
                <div className="space-y-6">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setInviteTab('email')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                                inviteTab === 'email' 
                                ? 'bg-white dark:bg-[#1e293b] text-indigo-600 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Mail size={18} /> Por E-mail
                        </button>
                        <button 
                            onClick={() => setInviteTab('code')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                                inviteTab === 'code' 
                                ? 'bg-white dark:bg-[#1e293b] text-indigo-600 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Hash size={18} /> Código do Time
                        </button>
                    </div>

                    {inviteTab === 'email' && (
                        <div className="animate-fade-in space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Envie um convite direto para a caixa de entrada do seu colega.
                            </p>
                            <form onSubmit={handleSendInvite}>
                                <div className="relative mb-5">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={20} className="text-gray-400" />
                                    </div>
                                    <input 
                                        type="email" 
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                        placeholder="colega@empresa.com"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSending || !inviteEmail}
                                        className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        {isSending ? 'Enviando...' : <><Send size={18} /> Enviar Convite</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {inviteTab === 'code' && (
                        <div className="animate-fade-in space-y-8 text-center py-4">
                             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 shadow-inner">
                                 <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">Código de Acesso Único</p>
                                 <div className="text-5xl font-mono font-bold text-gray-800 dark:text-white tracking-[0.2em] mb-3 select-all">
                                     {inviteCode}
                                 </div>
                                 <p className="text-xs text-gray-400 font-medium italic">Compartilhe este código para entrada instantânea.</p>
                             </div>

                             <div className="flex justify-center gap-4">
                                 <button 
                                    onClick={handleCopyCode}
                                    className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all shadow-xl ${
                                        copied 
                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                                    }`}
                                 >
                                     {copied ? <Check size={20} /> : <Copy size={20} />}
                                     {copied ? 'Copiado!' : 'Copiar Código'}
                                 </button>
                                 
                                 <button 
                                    onClick={handleRegenerateCode}
                                    className="p-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                                    title="Gerar novo código"
                                 >
                                     <RefreshCw size={22} />
                                 </button>
                             </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
