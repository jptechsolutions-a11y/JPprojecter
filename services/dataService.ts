import { supabase } from './supabaseClient';
import { Task, User, Team, TaskGroup, Column, RoutineTask, Notification, Subtask, Attachment, Comment } from '../types';

// --- Mappers (Snake_case DB -> CamelCase Frontend) ---

const mapUser = (u: any): User => ({
  id: u.id,
  name: u.name || u.email?.split('@')[0] || 'Sem Nome',
  role: u.role || 'Membro',
  email: u.email,
  avatar: u.avatar,
  coverImage: u.cover_image,
  team: 't1', // Simplificado
  skills: u.skills || [],
  portfolio: u.portfolio,
  bio: u.bio
});

const mapTask = (t: any): Task => ({
  id: t.id,
  groupId: t.group_id,
  title: t.title,
  description: t.description || '',
  status: t.status,
  priority: t.priority,
  assigneeId: t.assignee_id,
  supportIds: t.support_ids || [],
  startDate: t.start_date,
  dueDate: t.due_date,
  tags: t.tags || [],
  progress: t.progress || 0,
  createdAt: t.created_at,
  teamId: t.team_id,
  approvalStatus: t.approval_status || 'none',
  approverId: t.approver_id,
  // Nested relations from Supabase
  subtasks: (t.subtasks || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    completed: s.completed,
    assigneeId: s.assignee_id,
    dueDate: s.due_date,
    startDate: s.start_date
  })),
  attachments: (t.attachments || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    url: a.url,
    type: a.type,
    createdAt: a.created_at
  })),
  comments: (t.comments || []).map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    text: c.text,
    createdAt: c.created_at
  }))
});

// --- API Methods ---

export const api = {
  // --- LOAD INITIAL DATA ---
  fetchProjectData: async (requestedTeamId: string | null) => {
    try {
      // 1. Fetch Teams FIRST to ensure we have a valid UUID context
      const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*');
      
      if (teamsError) {
          console.error("Error fetching teams:", teamsError);
          return null;
      }

      const teams = teamsData ? teamsData.map((t:any) => ({ 
          id: t.id, 
          name: t.name, 
          description: t.description, 
          members: [], 
          inviteCode: t.invite_code 
      })) : [];

      if (teams.length === 0) {
          // No teams exist, return empty structure to init app safely
          return {
              users: [],
              teams: [],
              groups: [],
              columns: [],
              tasks: [],
              routines: [],
              notifications: []
          };
      }

      // Determine valid Team ID (Handle 't1' mock ID or null)
      let teamId = requestedTeamId;
      const teamExists = teams.find(t => t.id === teamId);
      
      if (!teamId || !teamExists) {
          teamId = teams[0].id;
      }

      // 2. Users
      const { data: usersData } = await supabase.from('profiles').select('*');
      
      // 3. Groups
      const { data: groupsData } = await supabase.from('task_groups').select('*').eq('team_id', teamId);
      
      // 4. Columns
      const { data: columnsData } = await supabase.from('columns').select('*');

      // 5. Tasks (Deep Select)
      const { data: tasksData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          subtasks (*),
          attachments (*),
          comments (*)
        `)
        .eq('team_id', teamId);

      if (taskError) {
          console.error("Error fetching tasks details:", JSON.stringify(taskError, null, 2));
      }

      // 6. Routines
      const { data: routinesData } = await supabase.from('routines').select('*').eq('team_id', teamId);

      // 7. Notifications (Mocked or real)
      const { data: notificationsData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });

      return {
        users: usersData ? usersData.map(mapUser) : [],
        teams: teams,
        groups: groupsData ? groupsData.map((g:any) => ({ id: g.id, title: g.title, color: g.color, teamId: g.team_id })) : [],
        columns: columnsData ? columnsData.map((c:any) => ({ id: c.id, title: c.title, color: c.color })) : [],
        tasks: tasksData ? tasksData.map(mapTask) : [],
        routines: routinesData ? routinesData.map((r:any) => ({ ...r, teamId: r.team_id, assigneeId: r.assignee_id, daysOfWeek: r.days_of_week, lastCompletedDate: r.last_completed_date })) : [],
        notifications: notificationsData ? notificationsData.map((n:any) => ({ ...n, userId: n.user_id, taskId: n.task_id })) : []
      };

    } catch (e) {
      console.error("Critical error fetching data:", e);
      return null;
    }
  },

  // --- TASKS CRUD ---
  createTask: async (task: Task) => {
    // Flatten Task object to DB snake_case structure
    const dbTask = {
      id: task.id,
      team_id: task.teamId,
      group_id: task.groupId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assigneeId,
      start_date: task.startDate,
      due_date: task.dueDate,
      tags: task.tags,
      support_ids: task.supportIds,
      progress: task.progress,
      approval_status: task.approvalStatus,
      approver_id: task.approverId
    };

    const { error } = await supabase.from('tasks').insert(dbTask);
    if (error) console.error("Create task error:", error);
    return !error;
  },

  updateTask: async (task: Task) => {
    const dbTask = {
      group_id: task.groupId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assigneeId,
      start_date: task.startDate,
      due_date: task.dueDate,
      tags: task.tags,
      support_ids: task.supportIds,
      progress: task.progress,
      approval_status: task.approvalStatus,
      approver_id: task.approverId
    };

    const { error } = await supabase.from('tasks').update(dbTask).eq('id', task.id);
    
    // Handle Nested Updates (Subtasks, Attachments, Comments) 
    // Note: For a real production app, handle these via separate API endpoints or specialized logic.
    // For this prototype, we'll assume the frontend state is authoritative for rapid UI, 
    // but specific subtask edits should ideally call specific endpoints.

    // Example: Upsert subtasks
    if (task.subtasks.length > 0) {
        const subtasksDb = task.subtasks.map(s => ({
            id: s.id,
            task_id: task.id,
            title: s.title,
            completed: s.completed,
            assignee_id: s.assigneeId,
            start_date: s.startDate,
            due_date: s.dueDate
        }));
        await supabase.from('subtasks').upsert(subtasksDb);
    }

    if (task.comments.length > 0) {
        // Only insert new ones usually, but here upsert
        const commentsDb = task.comments.map(c => ({
            id: c.id,
            task_id: task.id,
            user_id: c.userId,
            text: c.text,
            created_at: c.createdAt
        }));
        await supabase.from('comments').upsert(commentsDb);
    }
    
    if (error) console.error("Update task error:", error);
    return !error;
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    return !error;
  },

  // --- ROUTINES CRUD ---
  createRoutine: async (routine: RoutineTask) => {
    const dbRoutine = {
        id: routine.id,
        team_id: routine.teamId,
        title: routine.title,
        description: routine.description,
        assignee_id: routine.assigneeId,
        frequency: routine.frequency,
        days_of_week: routine.daysOfWeek,
        time: routine.time
    };
    const { error } = await supabase.from('routines').insert(dbRoutine);
    return !error;
  },

  updateRoutine: async (routineId: string, updates: Partial<RoutineTask>) => {
      const dbUpdates: any = {};
      if(updates.lastCompletedDate) dbUpdates.last_completed_date = updates.lastCompletedDate;
      // ... map other fields if necessary
      
      const { error } = await supabase.from('routines').update(dbUpdates).eq('id', routineId);
      return !error;
  }
};

// Initial Constants as Empty Placeholders to satisfy TS before load
export const INITIAL_USERS: User[] = [];
export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_GROUPS: TaskGroup[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_COLUMNS: Column[] = [];
export const INITIAL_ROUTINES: RoutineTask[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];