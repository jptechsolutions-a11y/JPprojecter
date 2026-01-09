
export type Priority = 'Baixa' | 'Média' | 'Alta';
export type Status = string;
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'none';

export interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
  team: string;
  skills?: string[];
  portfolio?: string;
  bio?: string;
  coverImage?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  inviteCode?: string;
  avatar?: string;
}

export interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  level: number; // 1: View, 2: Edit, 3: Admin
  color: string;
}

export interface TaskGroup {
  id: string;
  title: string;
  color: string;
  teamId: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string; // Campo Adicionado
  dueDate?: string;
  startDate?: string;
  duration: number; 
  completedAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file' | 'link';
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface TaskTimelineEntry {
  id: string;
  taskId: string;
  userId?: string;
  userName?: string; 
  userAvatar?: string;
  eventType: 'created' | 'started' | 'completed' | 'paused' | 'cancelled' | 'resumed' | 'subtask_update' | 'info';
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  kanbanColumnId?: string; // Novo campo para posição visual no Kanban
  assigneeId?: string;
  supportIds?: string[];
  startDate?: string;
  dueDate?: string;
  tags: string[];
  subtasks: Subtask[];
  progress: number;
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;   
  completedAt?: string; 
  teamId: string;
  approvalStatus: ApprovalStatus;
  approverId?: string;
  timeline?: TaskTimelineEntry[];
  color?: string; // Cor de fundo do card
}

export interface Column {
  id: string;
  title: string;
  color: string;
  teamId?: string;
}

export interface RoutineTask {
    id: string;
    title: string;
    description?: string;
    teamId: string;
    assigneeId?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    time?: string;
    lastCompletedDate?: string;
}

export interface Meeting {
    id: string;
    teamId: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    meetUrl: string;
    attendees: string[];
    isGoogleMeet: boolean;
}

export interface ChatHistoryItem {
    id: string;
    title: string;
    date: Date;
    messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image' | 'code';
  timestamp: Date;
  imageUrl?: string;
  codeLanguage?: string;
  codeContent?: string;
  attachments?: { name: string, content: string, mimeType?: string }[];
  sources?: { title: string, uri: string }[];
}

export interface AutomationRule {
    id: string;
    name: string;
    trigger: string;
    prompt: string;
    active: boolean;
}

export interface CodeFile {
    id: string;
    projectId: string;
    name: string;
    language: 'html' | 'css' | 'javascript' | 'typescript' | 'json';
    content: string;
}

export interface DevProject {
    id: string;
    name: string;
    description: string;
    createdAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'approval' | 'alert' | 'success';
    title: string;
    message: string;
    read: boolean;
    timestamp: string;
    taskId?: string;
}
