import React from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { Mail, Briefcase, MapPin, Shield, Star, Code, Edit2 } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser }) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-6">
      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl relative">
        <button className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-lg backdrop-blur-sm transition-colors">
            <Edit2 size={16} />
        </button>
      </div>

      <div className="bg-white dark:bg-[#1e293b] rounded-b-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-8 pb-8 -mt-16 relative mb-8">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                    <Avatar src={currentUser.avatar} alt={currentUser.name} size="xl" className="w-32 h-32 border-4 border-white dark:border-[#1e293b] shadow-lg" />
                    <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-4 border-white dark:border-[#1e293b]"></div>
                </div>
                <div className="text-center md:text-left mt-2 md:mt-16">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{currentUser.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">{currentUser.role} @ {currentUser.team || 'JP Projects'}</p>
                </div>
            </div>
            <div className="mt-4 md:mt-16 flex gap-3">
                 <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors">
                     Editar Perfil
                 </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {/* Left Column: Info */}
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-[#0f172a] p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Sobre</h3>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                            <Mail size={16} className="text-indigo-500" />
                            <span>{currentUser.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Briefcase size={16} className="text-indigo-500" />
                            <span>{currentUser.role}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-indigo-500" />
                            <span>São Paulo, Brasil</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield size={16} className="text-indigo-500" />
                            <span>Nível: Admin</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#0f172a] p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                     <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                         <Code size={16} /> Skills
                     </h3>
                     <div className="flex flex-wrap gap-2">
                         {['React', 'TypeScript', 'Node.js', 'UI/UX', 'Scrum'].map(skill => (
                             <span key={skill} className="px-3 py-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                                 {skill}
                             </span>
                         ))}
                     </div>
                </div>
            </div>

            {/* Right Column: Activity / Bio */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">Bio</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                        {currentUser.bio || "Desenvolvedor Full Stack apaixonado por criar experiências digitais incríveis. Focado em produtividade e qualidade de código. Atualmente liderando a equipe de desenvolvimento na JP Projects."}
                    </p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Star size={16} className="text-yellow-500" /> Conquistas Recentes
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-[#0f172a] rounded-lg">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center font-bold">🚀</div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm">Entregou o Projeto Alpha</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Finalizou todas as tarefas críticas antes do prazo.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-[#0f172a] rounded-lg">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center font-bold">🔥</div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm">10 Dias de Ofensiva</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Completou tarefas consecutivamente por 10 dias.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};