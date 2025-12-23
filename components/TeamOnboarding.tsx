import React, { useState } from 'react';
import { Users, Hash, ArrowRight, Plus, Loader2, Sparkles, Building2 } from 'lucide-react';
import { api } from '../services/dataService';
import { User } from '../types';

interface TeamOnboardingProps {
  currentUser: User;
  onComplete: () => void;
}

export const TeamOnboarding: React.FC<TeamOnboardingProps> = ({ currentUser, onComplete }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [isLoading, setIsLoading] = useState(false);
  
  // Create State
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  
  // Join State
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const success = await api.createTeam(teamName, teamDesc, currentUser.id);
      if (success) {
        onComplete();
      } else {
        setErrorMsg('Erro ao criar time. Tente novamente.');
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const success = await api.joinTeam(inviteCode, currentUser.id);
      if (success) {
        onComplete();
      } else {
        setErrorMsg('Código inválido ou você já está neste time.');
      }
    } catch (err) {
      setErrorMsg('Erro ao entrar no time.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#021221] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0d1b2a] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-800">
        
        {/* Left Side: Illustration / Info */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-[#00b4d8] to-[#023e8a] p-10 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                  <Sparkles size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Bem-vindo,<br/>{currentUser.name}!</h2>
              <p className="text-indigo-100 leading-relaxed">
                 Para começar a gerenciar seus projetos com Inteligência Artificial, você precisa fazer parte de uma equipe.
              </p>
           </div>
           
           <div className="relative z-10 mt-8 space-y-4">
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10">
                  <Plus size={20} />
                  <span className="text-sm font-medium">Crie seu próprio espaço de trabalho</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10">
                  <Hash size={20} />
                  <span className="text-sm font-medium">Entre usando um código de convite</span>
              </div>
           </div>

           {/* Decor elements */}
           <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
           <div className="absolute top-10 right-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl"></div>
        </div>

        {/* Right Side: Actions */}
        <div className="w-full md:w-7/12 p-10 flex flex-col justify-center bg-white dark:bg-[#0d1b2a]">
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-[#1b263b] rounded-lg mb-8 w-fit">
                <button 
                   onClick={() => setMode('create')}
                   className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'create' ? 'bg-white dark:bg-[#00b4d8] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                   <Building2 size={16} /> Criar Time
                </button>
                <button 
                   onClick={() => setMode('join')}
                   className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'join' ? 'bg-white dark:bg-[#00b4d8] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                   <Users size={16} /> Entrar com Código
                </button>
            </div>

            {errorMsg && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    {errorMsg}
                </div>
            )}

            {mode === 'create' ? (
                <form onSubmit={handleCreateTeam} className="space-y-5 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Equipe / Empresa</label>
                        <input 
                            type="text" 
                            required
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Ex: JP Tech Solutions"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1b263b] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none dark:text-white transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição Curta (Opcional)</label>
                        <input 
                            type="text" 
                            value={teamDesc}
                            onChange={(e) => setTeamDesc(e.target.value)}
                            placeholder="Ex: Desenvolvimento e Marketing"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1b263b] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none dark:text-white transition-all"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-[#00b4d8] hover:bg-[#0096c7] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Criar e Começar <ArrowRight size={18} /></>}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleJoinTeam} className="space-y-5 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Convite</label>
                        <div className="relative">
                            <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                required
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="Ex: JP-TEAM-1234"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#1b263b] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none dark:text-white transition-all font-mono uppercase"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Peça o código ao administrador do time.</p>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-[#00b4d8] hover:bg-[#0096c7] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                    >
                         {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Entrar no Time <ArrowRight size={18} /></>}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};