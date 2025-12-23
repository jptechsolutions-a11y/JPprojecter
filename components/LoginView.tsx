import React, { useState } from 'react';
import { Box, UserPlus, LogIn, KeyRound, ArrowLeft } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

type AuthMode = 'login' | 'register' | 'recover';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For register
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        if (mode === 'login') {
            // TODO: supabase.auth.signInWithPassword({ email, password })
            console.log("Supabase Login:", email);
            setTimeout(() => onLogin(), 1000); // Mock delay
        } else if (mode === 'register') {
            // TODO: supabase.auth.signUp({ email, password, options: { data: { name } } })
            console.log("Supabase Register:", { email, name });
            alert("Conta criada com sucesso! Faça login.");
            setMode('login');
        } else if (mode === 'recover') {
            // TODO: supabase.auth.resetPasswordForEmail(email)
            console.log("Supabase Recover:", email);
            alert("Email de recuperação enviado!");
            setMode('login');
        }
    } catch (error) {
        console.error("Auth error", error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#021221] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-transparent flex flex-col md:flex-row shadow-2xl overflow-hidden rounded-2xl">
        
        {/* Left Side: Form */}
        <div className="w-full md:w-1/2 bg-white p-12 flex flex-col justify-center items-center relative transition-all">
            <div className="mb-8 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-4 text-[#00b4d8]">
                   <Box size={40} strokeWidth={2} />
                   <span className="text-2xl font-bold tracking-tight text-gray-800">JP Projects</span>
                </div>
                <h2 className="text-2xl font-bold text-[#021221] mb-2">
                    {mode === 'login' ? 'Acesso ao Sistema' : mode === 'register' ? 'Criar Nova Conta' : 'Recuperar Senha'}
                </h2>
                <p className="text-sm text-[#00b4d8]">
                    {mode === 'login' ? 'Controle de Projetos & Dev' : mode === 'register' ? 'Junte-se ao time' : 'Digite seu email'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                {mode === 'register' && (
                    <div className="animate-fade-in-up">
                        <input 
                            type="text" 
                            placeholder="Nome Completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-100 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#00b4d8] focus:border-transparent block p-3 outline-none transition-all"
                            required
                        />
                    </div>
                )}

                <div>
                    <input 
                        type="email" 
                        placeholder="Email Corporativo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#00b4d8] focus:border-transparent block p-3 outline-none transition-all"
                        required
                    />
                </div>
                
                {mode !== 'recover' && (
                    <div className="animate-fade-in-up">
                        <input 
                            type="password" 
                            placeholder="Senha Segura"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-100 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#00b4d8] focus:border-transparent block p-3 outline-none transition-all"
                            required
                        />
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full text-white bg-gradient-to-r from-[#00b4d8] to-[#0096c7] hover:from-[#0096c7] hover:to-[#023e8a] focus:ring-4 focus:ring-blue-300 font-bold rounded-lg text-sm px-5 py-3 text-center transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? 'Processando...' : mode === 'login' ? 'ENTRAR' : mode === 'register' ? 'CRIAR CONTA' : 'ENVIAR LINK'}
                </button>

                <div className="flex flex-col gap-3 mt-6 text-center text-sm">
                    {mode === 'login' && (
                        <>
                            <button type="button" onClick={() => setMode('register')} className="text-gray-600 hover:text-[#00b4d8] font-medium transition-colors flex items-center justify-center gap-1">
                                <UserPlus size={14} /> Não tem conta? Cadastre-se
                            </button>
                            <button type="button" onClick={() => setMode('recover')} className="text-gray-400 hover:text-gray-600 text-xs flex items-center justify-center gap-1">
                                <KeyRound size={12} /> Esqueceu a senha?
                            </button>
                        </>
                    )}
                    
                    {(mode === 'register' || mode === 'recover') && (
                        <button type="button" onClick={() => setMode('login')} className="text-[#00b4d8] hover:underline font-medium flex items-center justify-center gap-1">
                            <ArrowLeft size={14} /> Voltar para Login
                        </button>
                    )}
                </div>
            </form>
        </div>

        {/* Right Side: Branding */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-[#2dd4bf] to-[#00b4d8] p-12 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
            <div className="relative z-10 animate-fade-in">
                <h4 className="text-sm font-medium uppercase tracking-widest mb-4 opacity-90">Nossa Missão</h4>
                <h1 className="text-4xl font-extrabold mb-6 leading-tight">
                    CONTROLE TOTAL,<br/>LOGÍSTICA OTIMIZADA.
                </h1>
                <p className="text-sm opacity-90 max-w-md mx-auto leading-relaxed">
                    Reduza o tempo de desenvolvimento, otimize a ocupação da equipe e garanta a pontualidade das suas entregas com nossa IA integrada.
                </p>
            </div>
            {/* Abstract Shapes */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-900 opacity-20 rounded-full blur-3xl"></div>
        </div>
      </div>
      
      <div className="fixed bottom-4 text-gray-500 text-xs">
          © 2025 - JP Tech Solutions | Desenvolvido por @JP
      </div>
    </div>
  );
};