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
  inviteCode?: string; // New field for team code
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
  assigneeId?: string; // New
  dueDate?: string;    // New
  startDate?: string;  // New
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

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
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
  teamId: string;
  approvalStatus: ApprovalStatus;
  approverId?: string; // Quem deve aprovar a tarefa
}

export interface Column {
  id: string;
  title: string;
  color: string;
}

// Routine Task (Recorrente)
export interface RoutineTask {
    id: string;
    title: string;
    description?: string;
    teamId: string;
    assigneeId?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[]; // 0 = Dom, 1 = Seg, etc.
    time?: string; // "14:00"
    lastCompletedDate?: string; // ISO Date
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
  sources?: { title: string, uri: string }[]; // New field for Search Grounding
}

export interface AutomationRule {
    id: string;
    name: string;
    trigger: string; // "every_friday", "daily_9am"
    prompt: string;
    active: boolean;
}

// Dev Environment Types
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
    userId: string; // Para quem é a notificação
    type: 'info' | 'approval' | 'alert' | 'success';
    title: string;
    message: string;
    read: boolean;
    timestamp: string;
    taskId?: string; // Link opcional
}