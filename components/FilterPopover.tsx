
import React from 'react';
import { User, Priority, Status } from '../types';
import { X, Calendar, User as UserIcon, Tag, Filter, Check } from 'lucide-react';
import { Avatar } from './Avatar';

export interface FilterState {
  status: Status[];
  priority: Priority[];
  assigneeIds: string[];
  tags: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface FilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  users: User[];
  availableTags: string[];
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({ 
  isOpen, onClose, filters, setFilters, users, availableTags 
}) => {
  if (!isOpen) return null;

  const toggleFilter = <K extends keyof FilterState>(key: K, value: any) => {
    setFilters(prev => {
      const current = prev[key] as any[];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter(item => item !== value) : [...current, value]
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      assigneeIds: [],
      tags: [],
      dateRange: { start: '', end: '' }
    });
  };

  const activeCount = filters.status.length + filters.priority.length + filters.assigneeIds.length + filters.tags.length + (filters.dateRange.start ? 1 : 0);

  const statuses = ['A Fazer', 'Em Progresso', 'Em Revisão', 'Em Pausa', 'Concluído', 'Cancelado'];
  const priorities = ['Baixa', 'Média', 'Alta'];

  return (
    <div className="absolute top-16 right-6 z-50 w-80 bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-up flex flex-col max-h-[80vh]">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-[#1b263b] rounded-t-xl">
        <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#00b4d8]" />
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Filtros Ativos ({activeCount})</h3>
        </div>
        <div className="flex gap-2">
            {activeCount > 0 && (
                <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline font-bold">
                    Limpar
                </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={16} />
            </button>
        </div>
      </div>

      <div className="overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Status */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
                {statuses.map(s => (
                    <button
                        key={s}
                        onClick={() => toggleFilter('status', s)}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${
                            filters.status.includes(s)
                            ? 'bg-[#00b4d8] text-white border-[#00b4d8]'
                            : 'bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-[#00b4d8]'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>

        {/* Prioridade */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Prioridade</label>
            <div className="flex gap-2">
                {priorities.map(p => (
                    <button
                        key={p}
                        onClick={() => toggleFilter('priority', p)}
                        className={`flex-1 px-2 py-1 text-xs rounded-lg border transition-all ${
                            filters.priority.includes(p as any)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>

        {/* Membros */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><UserIcon size={12}/> Responsáveis</label>
            <div className="flex flex-wrap gap-2">
                {users.map(u => {
                    const isSelected = filters.assigneeIds.includes(u.id);
                    return (
                        <button
                            key={u.id}
                            onClick={() => toggleFilter('assigneeIds', u.id)}
                            className={`flex items-center gap-2 p-1 pr-3 rounded-full border transition-all ${
                                isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500'
                                : 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-gray-600 opacity-70 hover:opacity-100'
                            }`}
                        >
                            <Avatar src={u.avatar} alt={u.name} size="sm" className="w-5 h-5" />
                            <span className={`text-[10px] ${isSelected ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                {u.name.split(' ')[0]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Data de Entrega */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Calendar size={12}/> Período de Entrega</label>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <span className="text-[10px] text-gray-400 block mb-1">De</span>
                    <input 
                        type="date" 
                        value={filters.dateRange.start}
                        onChange={(e) => setFilters(prev => ({...prev, dateRange: {...prev.dateRange, start: e.target.value}}))}
                        className="w-full text-xs p-2 rounded bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 dark:text-white outline-none focus:border-[#00b4d8]"
                    />
                </div>
                <div>
                    <span className="text-[10px] text-gray-400 block mb-1">Até</span>
                    <input 
                        type="date" 
                        value={filters.dateRange.end}
                        onChange={(e) => setFilters(prev => ({...prev, dateRange: {...prev.dateRange, end: e.target.value}}))}
                        className="w-full text-xs p-2 rounded bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 dark:text-white outline-none focus:border-[#00b4d8]"
                    />
                </div>
            </div>
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Tag size={12}/> Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleFilter('tags', tag)}
                            className={`px-2 py-1 text-[10px] rounded border transition-all ${
                                filters.tags.includes(tag)
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300'
                                : 'bg-white dark:bg-[#0f172a] text-gray-500 border-gray-200 dark:border-gray-600'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
