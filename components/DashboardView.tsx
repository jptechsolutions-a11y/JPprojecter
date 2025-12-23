import React, { useState } from 'react';
import { Task, User } from '../types';
import { PieChart, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  users: User[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ tasks, users }) => {
  const [retroText, setRetroText] = useState('');

  // KPIs
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Concluído').length;
  const inProgressTasks = tasks.filter(t => t.status === 'Em Progresso').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // High Priority Open
  const criticalTasks = tasks.filter(t => t.priority === 'Alta' && t.status !== 'Concluído').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 font-medium text-sm">Taxa de Conclusão</span>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800">{completionRate}%</span>
             <span className="text-xs text-gray-400 ml-2">do total de tarefas</span>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 font-medium text-sm">Em Progresso</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Clock size={20} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800">{inProgressTasks}</span>
             <span className="text-xs text-gray-400 ml-2">tarefas ativas</span>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 font-medium text-sm">Críticas em Aberto</span>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle size={20} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800">{criticalTasks}</span>
             <span className="text-xs text-gray-400 ml-2">prioridade alta</span>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <span className="text-gray-500 font-medium text-sm">Concluídas</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CheckCircle size={20} />
              </div>
           </div>
           <div>
             <span className="text-3xl font-bold text-gray-800">{completedTasks}</span>
             <span className="text-xs text-gray-400 ml-2">tarefas entregues</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Simple Visualizations */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
             <PieChart size={20} className="text-gray-400" /> Distribuição por Status
          </h3>
          <div className="space-y-4">
            {['A Fazer', 'Em Progresso', 'Revisão', 'Concluído'].map(status => {
                const count = tasks.filter(t => t.status === status).length;
                const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                const color = status === 'Concluído' ? 'bg-[#00c875]' : status === 'Em Progresso' ? 'bg-[#fdab3d]' : status === 'Revisão' ? 'bg-[#a25ddc]' : 'bg-[#c4c4c4]';
                
                return (
                  <div key={status} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-gray-600 font-medium">{status}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                       <div className={`h-full ${color}`} style={{width: `${percentage}%`}}></div>
                    </div>
                    <span className="w-10 text-right text-sm text-gray-500">{count}</span>
                  </div>
                )
            })}
          </div>
        </div>

        {/* Retrospective */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
           <h3 className="font-bold text-gray-800 mb-2">Retrospectiva do Mês</h3>
           <p className="text-sm text-gray-500 mb-4">O que funcionou bem? O que podemos melhorar? Registre aqui os aprendizados.</p>
           
           <textarea 
             className="flex-1 w-full p-4 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
             placeholder="Digite suas anotações da retrospectiva..."
             value={retroText}
             onChange={(e) => setRetroText(e.target.value)}
           />
           <div className="mt-4 flex justify-end">
             <button className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-semibold">
               Salvar Retro
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};