
import React from 'react';
import { Task, User } from '../types';
import { PieChart, TrendingUp, AlertCircle, CheckCircle, Clock, PauseCircle, AlertTriangle, Users, BarChart3, ListChecks } from 'lucide-react';
import { Avatar } from './Avatar';

interface DashboardViewProps {
  tasks: Task[];
  users: User[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ tasks, users }) => {
  // --- Cálculos de KPIs ---
  const totalTasks = tasks.length;
  
  // Status Counts
  const completedTasks = tasks.filter(t => t.status === 'Concluído').length;
  const inProgressTasks = tasks.filter(t => t.status === 'Em Progresso').length;
  const reviewTasks = tasks.filter(t => t.status === 'Em Revisão').length;
  const pausedTasks = tasks.filter(t => t.status === 'Em Pausa').length;
  
  // Computed Metrics
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Overdue Logic
  const today = new Date();
  today.setHours(0,0,0,0);
  const overdueTasks = tasks.filter(t => {
      if (!t.dueDate || t.status === 'Concluído' || t.status === 'Cancelado') return false;
      const due = new Date(t.dueDate);
      due.setHours(0,0,0,0);
      return due < today;
  }).length;

  // Tasks per User
  const tasksByUser = users.map(u => {
      const count = tasks.filter(t => t.assigneeId === u.id && t.status !== 'Concluído' && t.status !== 'Cancelado').length;
      return { user: u, count };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-10">
      
      <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="text-[#00b4d8]" size={28} />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visão Geral do Time</h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* 1. Taxa de Conclusão */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
               <TrendingUp size={60} />
           </div>
           <div className="flex justify-between items-start relative z-10">
              <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Conclusão</span>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                <TrendingUp size={18} />
              </div>
           </div>
           <div className="relative z-10">
             <span className="text-3xl font-bold text-gray-800 dark:text-white">{completionRate}%</span>
             <span className="text-[10px] text-gray-400 block mt-1">do total de {totalTasks} tarefas</span>
           </div>
           <div className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-1000" style={{width: `${completionRate}%`}}></div>
        </div>

        {/* 2. Em Progresso */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Em Execução</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <Clock size={18} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800 dark:text-white">{inProgressTasks}</span>
             <span className="text-[10px] text-gray-400 block mt-1">tarefas ativas agora</span>
           </div>
        </div>

        {/* 3. Em Revisão (Quality Bottleneck) */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Em Revisão</span>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                <ListChecks size={18} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800 dark:text-white">{reviewTasks}</span>
             <span className="text-[10px] text-gray-400 block mt-1">aguardando aprovação</span>
           </div>
        </div>

        {/* 4. Atrasadas (Risk) */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 border-l-4 border-l-red-500">
           <div className="flex justify-between items-start">
              <span className="text-red-500 font-bold text-xs uppercase tracking-wider">Em Atraso</span>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                <AlertTriangle size={18} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800 dark:text-white">{overdueTasks}</span>
             <span className="text-[10px] text-gray-400 block mt-1">tarefas fora do prazo</span>
           </div>
        </div>

        {/* 5. Entregues */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Concluídas</span>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                <CheckCircle size={18} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800 dark:text-white">{completedTasks}</span>
             <span className="text-[10px] text-gray-400 block mt-1">entregas totais</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
             <PieChart size={20} className="text-gray-400" /> Distribuição de Status
          </h3>
          <div className="space-y-4">
            {[
                { label: 'A Fazer', count: tasks.filter(t => t.status === 'A Fazer').length, color: 'bg-gray-200 dark:bg-gray-600', text: 'text-gray-600 dark:text-gray-300' },
                { label: 'Em Progresso', count: inProgressTasks, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                { label: 'Em Revisão', count: reviewTasks, color: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
                { label: 'Em Pausa', count: pausedTasks, color: 'bg-orange-400', text: 'text-orange-600 dark:text-orange-400' },
                { label: 'Concluído', count: completedTasks, color: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
                { label: 'Cancelado', count: tasks.filter(t => t.status === 'Cancelado').length, color: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
            ].map((stat, idx) => {
                const percentage = totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0;
                if (stat.count === 0 && totalTasks > 0) return null; // Hide empty if we have tasks

                return (
                  <div key={idx} className="flex items-center gap-4 group">
                    <span className={`w-28 text-xs font-bold ${stat.text}`}>{stat.label}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${stat.color} transition-all duration-1000 ease-out`} style={{width: `${percentage}%`}}></div>
                    </div>
                    <span className="w-12 text-right text-xs font-bold text-gray-700 dark:text-gray-300">{stat.count} <span className="text-[10px] text-gray-400 font-normal">({Math.round(percentage)}%)</span></span>
                  </div>
                )
            })}
            {totalTasks === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma tarefa encontrada.</p>}
          </div>
        </div>

        {/* Workload per Member */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
           <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
               <Users size={20} className="text-gray-400" /> Carga de Trabalho
           </h3>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar max-h-[300px]">
               {tasksByUser.map(({ user, count }) => (
                   <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0f172a] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                       <div className="flex items-center gap-3">
                           <Avatar src={user.avatar} alt={user.name} size="sm" />
                           <div>
                               <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{user.name.split(' ')[0]}</p>
                               <p className="text-[10px] text-gray-400">{user.role}</p>
                           </div>
                       </div>
                       <div className={`px-3 py-1 rounded-lg text-xs font-bold ${count > 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : count > 2 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                           {count} Tarefas
                       </div>
                   </div>
               ))}
               {tasksByUser.length === 0 && <p className="text-sm text-gray-400 text-center">Nenhum membro ativo.</p>}
           </div>
           
           <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
               <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                   <AlertCircle size={10} /> Conta apenas tarefas não concluídas.
               </p>
           </div>
        </div>
      </div>
    </div>
  );
};
