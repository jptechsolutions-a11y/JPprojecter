import React, { useState, useEffect } from 'react';
import { RoutineTask, User } from '../types';
import { CheckCircle2, Circle, Clock, Calendar, Filter, Plus } from 'lucide-react';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

interface RoutineTasksViewProps {
    routines: RoutineTask[];
    users: User[];
    onToggleRoutine: (routineId: string) => void;
    onAddRoutine: (routine: RoutineTask) => void;
}

export const RoutineTasksView: React.FC<RoutineTasksViewProps> = ({ routines, users, onToggleRoutine, onAddRoutine }) => {
    const [filterDay, setFilterDay] = useState<number>(new Date().getDay()); // Default to today
    const [isModalOpen, setIsModalOpen] = useState(false);

    const days = [
        { val: 1, label: 'Segunda' },
        { val: 2, label: 'Terça' },
        { val: 3, label: 'Quarta' },
        { val: 4, label: 'Quinta' },
        { val: 5, label: 'Sexta' },
        { val: 6, label: 'Sábado' },
        { val: 0, label: 'Domingo' },
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    const filteredRoutines = routines.filter(r => {
        // Frequency check
        if (r.frequency === 'daily') return true;
        if (r.frequency === 'weekly' && r.daysOfWeek?.includes(filterDay)) return true;
        return false;
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    // Split into Pending and Done (for today)
    const completedToday = filteredRoutines.filter(r => r.lastCompletedDate === todayStr);
    const pendingToday = filteredRoutines.filter(r => r.lastCompletedDate !== todayStr);

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const selectedDays: number[] = [];
        days.forEach(d => {
            if((formData.get(`day-${d.val}`) as string) === 'on') selectedDays.push(d.val);
        });

        const newRoutine: RoutineTask = {
            id: crypto.randomUUID(),
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            teamId: 't1', // Mock
            assigneeId: formData.get('assigneeId') as string,
            frequency: selectedDays.length === 5 ? 'daily' : 'weekly', // Simplified logic
            daysOfWeek: selectedDays,
            time: formData.get('time') as string,
        };
        onAddRoutine(newRoutine);
        setIsModalOpen(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1b263b] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Rotinas & Recorrências</h2>
                    <p className="text-gray-500 text-sm">Gerencie atividades que se repetem e não podem ser esquecidas.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={18} /> Nova Rotina
                </button>
            </div>

            {/* Day Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {days.map(d => (
                    <button
                        key={d.val}
                        onClick={() => setFilterDay(d.val)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            filterDay === d.val 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white dark:bg-[#0d1b2a] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Pending List */}
                <div className="bg-white dark:bg-[#0d1b2a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-[#1b263b] px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Circle size={18} className="text-orange-500" /> Pendentes Hoje
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {pendingToday.length === 0 && (
                            <div className="p-8 text-center text-gray-400">
                                <CheckCircle2 size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Tudo feito por hoje!</p>
                            </div>
                        )}
                        {pendingToday.map(routine => {
                            const assignee = users.find(u => u.id === routine.assigneeId);
                            return (
                                <div key={routine.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1b263b] transition-colors group">
                                    <button 
                                        onClick={() => onToggleRoutine(routine.id)}
                                        className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500 hover:border-green-500 flex items-center justify-center transition-colors"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-green-500 opacity-0 hover:opacity-100 transition-opacity" />
                                    </button>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{routine.title}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{routine.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                            <Clock size={14} /> {routine.time}
                                        </div>
                                        {assignee && <Avatar src={assignee.avatar} alt={assignee.name} size="sm" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Completed List */}
                {completedToday.length > 0 && (
                    <div className="opacity-75">
                         <div className="px-6 py-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 size={16} /> Concluídos Hoje
                            </h3>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#1b263b]/50 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                            {completedToday.map(routine => (
                                <div key={routine.id} className="p-4 flex items-center gap-4">
                                     <button 
                                        onClick={() => onToggleRoutine(routine.id)} // Toggle back
                                        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-500 line-through">{routine.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Rotina">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Título</label>
                        <input name="title" required className="w-full p-2 border rounded" placeholder="Ex: Daily Standup" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <input name="description" className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Horário Limite</label>
                            <input name="time" type="time" required className="w-full p-2 border rounded" />
                        </div>
                        <div className="flex-1">
                             <label className="block text-sm font-medium mb-1">Responsável</label>
                             <select name="assigneeId" className="w-full p-2 border rounded">
                                 <option value="">Selecione...</option>
                                 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Dias da Semana</label>
                        <div className="flex flex-wrap gap-2">
                            {days.map(d => (
                                <label key={d.val} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1 rounded border">
                                    <input type="checkbox" name={`day-${d.val}`} className="accent-indigo-600" />
                                    <span className="text-sm">{d.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Criar Rotina</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};