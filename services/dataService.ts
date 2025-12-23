// This file serves as an abstraction layer for data access.
// Currently it returns mock data. To integrate Supabase:
// 1. Install @supabase/supabase-js
// 2. Initialize the client here
// 3. Replace these functions with supabase calls (e.g., supabase.from('tasks').select('*'))

import { Task, User, Team, TaskGroup, Column, RoutineTask, Notification } from '../types';

export const INITIAL_USERS: User[] = [
  { 
    id: '1', 
    name: 'Juliano Patrick', 
    role: 'Gerente de Produto', 
    team: 't1', 
    email: 'juliano@jp.com', 
    avatar: '',
    coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=1000',
    skills: ['Gestão Ágil', 'Product Discovery', 'React', 'UX Design'],
    portfolio: 'https://github.com/julianopatrick',
    bio: 'Apaixonado por criar produtos que resolvem problemas reais. Focado em eficiência e experiência do usuário.'
  },
  { id: '2', name: 'Carlos Souza', role: 'Dev Senior', team: 't1', email: 'carlos@time.com', skills: ['Node.js', 'AWS', 'TypeScript'] },
  { id: '3', name: 'Beatriz Costa', role: 'Designer', team: 't1', email: 'bia@time.com', skills: ['Figma', 'UI/UX', 'Branding'] },
  { id: '4', name: 'Fernanda Lima', role: 'QA', team: 't1', email: 'fernanda@time.com', skills: ['Cypress', 'Jest'] },
];

export const INITIAL_TEAMS: Team[] = [
  { id: 't1', name: 'Time de Produto', description: 'Focado no JP Projects', members: ['1', '2', '3', '4'] },
  { id: 't2', name: 'Time de Marketing', description: 'Campanhas e Lançamento', members: ['1'] }
];

export const INITIAL_GROUPS: TaskGroup[] = [
  { id: 'g1', title: 'Planejamento', color: '#579bfc', teamId: 't1' },
  { id: 'g2', title: 'Execução', color: '#fdab3d', teamId: 't1' },
  { id: 'g3', title: 'Lançamento', color: '#00c875', teamId: 't1' }
];

export const INITIAL_COLUMNS: Column[] = [
  { id: 'A Fazer', title: 'A Fazer', color: 'bg-gray-100' },
  { id: 'Em Progresso', title: 'Em Progresso', color: 'bg-blue-50' },
  { id: 'Revisão', title: 'Revisão', color: 'bg-yellow-50' },
  { id: 'Concluído', title: 'Concluído', color: 'bg-green-50' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    groupId: 'g1',
    title: 'Definir MVP do Projeto',
    description: 'Precisamos alinhar o escopo inicial com os stakeholders.',
    status: 'Concluído',
    priority: 'Alta',
    assigneeId: '1',
    supportIds: ['3'],
    startDate: '2023-10-25',
    dueDate: '2023-11-01',
    tags: ['Planejamento'],
    subtasks: [{ id: 's1', title: 'Reunião com diretoria', completed: true, assigneeId: '1', dueDate: '2023-10-26' }],
    progress: 100,
    attachments: [],
    comments: [],
    createdAt: new Date().toISOString(),
    teamId: 't1',
    approvalStatus: 'approved',
    approverId: '1'
  },
  {
    id: 't2',
    groupId: 'g2',
    title: 'Criar Protótipos de Alta Fidelidade',
    description: 'Desenvolver as telas principais do fluxo.',
    status: 'Em Progresso',
    priority: 'Alta',
    assigneeId: '3',
    supportIds: ['1', '2'],
    startDate: '2023-11-02',
    dueDate: '2023-11-15',
    tags: ['Design', 'UX'],
    subtasks: [
        { id: 's2', title: 'Tela de Login', completed: true, assigneeId: '3', dueDate: '2023-11-05' },
        { id: 's3', title: 'Dashboard', completed: false, assigneeId: '3', dueDate: '2023-11-10' }
    ],
    progress: 50,
    attachments: [],
    comments: [],
    createdAt: new Date().toISOString(),
    teamId: 't1',
    approvalStatus: 'none'
  },
  {
    id: 't3',
    groupId: 'g2',
    title: 'Configurar Ambiente de Dev',
    description: 'Setup inicial do repositório.',
    status: 'A Fazer',
    priority: 'Média',
    assigneeId: '2',
    supportIds: [],
    startDate: '2023-11-05',
    dueDate: '2023-11-10',
    tags: ['DevOps'],
    subtasks: [],
    progress: 0,
    attachments: [],
    comments: [],
    createdAt: new Date().toISOString(),
    teamId: 't1',
    approvalStatus: 'pending',
    approverId: '1'
  }
];

export const INITIAL_ROUTINES: RoutineTask[] = [
    {
        id: 'r1',
        title: 'Daily Standup',
        description: 'Reunião diária de alinhamento com o time.',
        teamId: 't1',
        assigneeId: '1',
        frequency: 'daily',
        time: '09:00',
        daysOfWeek: [1, 2, 3, 4, 5] // Seg-Sex
    },
    {
        id: 'r2',
        title: 'Deploy em Staging',
        description: 'Atualizar ambiente de testes.',
        teamId: 't1',
        assigneeId: '2',
        frequency: 'weekly',
        time: '17:00',
        daysOfWeek: [5] // Sexta
    },
    {
        id: 'r3',
        title: 'Code Review Geral',
        description: 'Limpar PRs pendentes.',
        teamId: 't1',
        assigneeId: '2',
        frequency: 'weekly',
        time: '14:00',
        daysOfWeek: [3, 5] // Quarta e Sexta
    }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
    {
        id: 'n1',
        userId: '1',
        type: 'approval',
        title: 'Aprovação Pendente',
        message: 'Carlos solicitou aprovação para "Configurar Ambiente de Dev"',
        read: false,
        timestamp: new Date().toISOString(),
        taskId: 't3'
    },
    {
        id: 'n2',
        userId: '1',
        type: 'info',
        title: 'Nova Tarefa Atribuída',
        message: 'Você foi alocado em "Definir MVP do Projeto"',
        read: true,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        taskId: 't1'
    }
];