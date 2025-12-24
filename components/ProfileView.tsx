import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { Mail, Briefcase, MapPin, Shield, Star, Code, Edit2, Save, X, Camera, Loader2 } from 'lucide-react';
import { api } from '../services/dataService';

interface ProfileViewProps {
  currentUser: User;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Local state for editing
  const [formData, setFormData] = useState({
      name: currentUser.name,
      role: currentUser.role,
      bio: currentUser.bio || '',
      avatar: currentUser.avatar,
      coverImage: currentUser.coverImage
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'coverImage') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, [field]: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = async () => {
      setIsLoading(true);
      const success = await api.updateUser(currentUser.id, formData);
      if (success) {
          // Update local currentUser object reference simply for immediate UI feedback if parent doesn't reload immediately
          Object.assign(currentUser, formData);
          setIsEditing(false);
      } else {
          alert('Erro ao salvar perfil.');
      }
      setIsLoading(false);
  };

  const handleCancel = () => {
      setFormData({
          name: currentUser.name,
          role: currentUser.role,
          bio: currentUser.bio || '',
          avatar: currentUser.avatar,
          coverImage: currentUser.coverImage
      });
      setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-6">
      {/* Cover Image */}
      <div className="h-48 rounded-t-2xl relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 group">
        {formData.coverImage && (
            <img src={formData.coverImage} alt="Capa" className="w-full h-full object-cover" />
        )}
        
        {isEditing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity" onClick={() => coverInputRef.current?.click()}>
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm text-white flex items-center gap-2">
                    <Camera size={24} /> <span className="font-bold text-sm">Alterar Capa</span>
                </div>
                <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImage')} />
            </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1e293b] rounded-b-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-8 pb-8 -mt-16 relative mb-8">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative group">
                    <Avatar src={formData.avatar} alt={formData.name} size="xl" className="w-32 h-32 border-4 border-white dark:border-[#1e293b] shadow-lg" />
                    
                    {isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer transition-opacity" onClick={() => avatarInputRef.current?.click()}>
                             <Camera size={24} className="text-white" />
                             <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                        </div>
                    )}
                    {!isEditing && <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-4 border-white dark:border-[#1e293b]"></div>}
                </div>
                
                <div className="text-center md:text-left mt-2 md:mt-16 w-full md:w-auto">
                    {isEditing ? (
                        <div className="flex flex-col gap-2">
                            <input 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="text-2xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Seu Nome"
                            />
                            <input 
                                value={formData.role}
                                onChange={(e) => setFormData({...formData, role: e.target.value})}
                                className="text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Seu Cargo"
                            />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{formData.name}</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">{formData.role} @ {currentUser.team || 'JP Projects'}</p>
                        </>
                    )}
                </div>
            </div>
            
            <div className="mt-4 md:mt-16 flex gap-3">
                 {isEditing ? (
                     <>
                        <button 
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <X size={16} /> Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Salvar
                        </button>
                     </>
                 ) : (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                    >
                        <Edit2 size={16} /> Editar Perfil
                    </button>
                 )}
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
                            <span>{formData.role}</span>
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
                    {isEditing ? (
                        <textarea 
                            value={formData.bio}
                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                            className="w-full h-32 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Escreva um pouco sobre você..."
                        />
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm whitespace-pre-wrap">
                            {formData.bio || "Sem biografia."}
                        </p>
                    )}
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