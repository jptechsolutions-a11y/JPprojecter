
import { supabase } from './supabaseClient';
import { Task, User, Team, TaskGroup, Column, RoutineTask, Notification, Subtask, Attachment, Comment, Meeting, TeamRole, TaskTimelineEntry } from '../types';

// --- Mappers ---

const mapUser = (u: any): User => ({
  id: u.id,
  name: u.name || u.email?.split('@')[0] || 'Sem Nome',
  role: u.role || 'Membro',
  email: u.email,
  avatar: u.avatar,
  coverImage: u.cover_image,
  team: '', 
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
  kanbanColumnId: t.kanban_column_id, // Mapped Visual Column ID
  assigneeId: t.assignee_id,
  supportIds: t.support_ids || [],
  startDate: t.start_date,
  dueDate: t.due_date,
  tags: t.tags || [],
  progress: t.progress || 0,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  startedAt: t.started_at,
  completedAt: t.completed_at,
  teamId: t.team_id,
  approvalStatus: t.approval_status || 'none',
  approverId: t.approver_id,
  subtasks: (t.subtasks || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    completed: s.completed,
    assigneeId: s.assignee_id, // Mapped
    dueDate: s.due_date,       
    startDate: s.start_date,   
    duration: s.duration || 1,
    completedAt: s.completed_at
  })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
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
  })),
  timeline: [],
  color: t.color // Mapeia cor
});

// --- Constants ---
const DEFAULT_COLUMN_COLOR = 'bg-gray-100 dark:bg-gray-800';
const FALLBACK_COLUMNS = [
  { id: '00000000-0000-0000-0000-000000000001', title: 'Tarefas de Entrada', color: DEFAULT_COLUMN_COLOR },
  { id: '00000000-0000-0000-0000-000000000002', title: 'Em Andamento', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: '00000000-0000-0000-0000-000000000003', title: 'Concluído', color: 'bg-green-100 dark:bg-green-900/30' }
];

export const api = {
  fetchProjectData: async (requestedTeamId: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) return null;

      const { data: memberships, error: mErr } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', currentUserId);
      
      if (mErr || !memberships || memberships.length === 0) {
          return { users: [], teams: [], groups: [], columns: [], tasks: [], routines: [], notifications: [], meetings: [], roles: [] };
      }

      const userTeams = memberships
        .map((m: any) => m.teams)
        .filter(t => t !== null)
        .map((t: any) => ({
             id: t.id, 
             name: t.name, 
             description: t.description, 
             members: [], 
             inviteCode: t.invite_code,
             avatar: t.avatar
        }));

      let teamId = requestedTeamId;
      if (!teamId || !userTeams.find(t => t.id === teamId)) {
          teamId = userTeams[0].id;
      }

      // Parallel fetching
      const [
          teamUsersRes,
          groupsRes,
          tasksRes,
          routinesRes,
          notificationsRes,
          rolesRes 
      ] = await Promise.all([
          supabase.from('team_members').select('user_id, role, profiles(*)').eq('team_id', teamId),
          supabase.from('task_groups').select('*').eq('team_id', teamId),
          supabase.from('tasks').select('*, subtasks(*)').eq('team_id', teamId), 
          supabase.from('routines').select('*').eq('team_id', teamId),
          supabase.from('notifications').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(50),
          supabase.from('team_roles').select('*').eq('team_id', teamId)
      ]);

      // Fetch Columns SPECIFICALLY for this team
      let mappedColumns: Column[] = [];
      try {
          // Attempt 1: Try with 'created_at' sort
          let { data: colsData, error: colsErr } = await supabase
              .from('columns')
              .select('*')
              .eq('team_id', teamId)
              .order('created_at', { ascending: true });
          
          // Attempt 2: Retry without sort if created_at missing
          if (colsErr && (colsErr.code === '42703' || colsErr.code === '400')) { 
             const retry = await supabase.from('columns').select('*').eq('team_id', teamId);
             colsData = retry.data;
             colsErr = retry.error;
          }

          if (colsData && colsData.length > 0) {
              mappedColumns = colsData.map((c:any) => ({ 
                  id: c.id, 
                  title: c.title, 
                  color: c.color || DEFAULT_COLUMN_COLOR, // FALLBACK IMPORTANTE PARA CORES NULAS
                  teamId: c.team_id 
              }));
          } else if (!colsErr) {
              // If no columns exist for this team (and no error), create defaults AUTOMATICALLY
              console.log("No columns found for team, creating defaults...");
              const defaultCols = [
                  { title: 'Tarefas de Entrada', color: DEFAULT_COLUMN_COLOR, team_id: teamId },
                  { title: 'Em Andamento', color: 'bg-blue-100 dark:bg-blue-900/30', team_id: teamId },
                  { title: 'Concluído', color: 'bg-green-100 dark:bg-green-900/30', team_id: teamId }
              ];
              
              const { data: newCols } = await supabase.from('columns').insert(defaultCols).select();
              if(newCols) {
                  mappedColumns = newCols.map((c:any) => ({ id: c.id, title: c.title, color: c.color, teamId: c.team_id }));
              } else {
                  mappedColumns = FALLBACK_COLUMNS;
              }
          } else {
              // Error case
              console.warn("Columns fetch error:", colsErr);
              mappedColumns = FALLBACK_COLUMNS;
          }
      } catch (e) {
          console.warn("Columns fetch exception:", e);
          mappedColumns = FALLBACK_COLUMNS;
      }

      const mappedUsers = teamUsersRes.data ? teamUsersRes.data.map((tu: any) => {
          const user = mapUser(tu.profiles);
          user.role = tu.role || user.role; 
          return user;
      }).filter(u => u.id) : [];

      const currentTeamMemberIds = teamUsersRes.data ? teamUsersRes.data.map((tu: any) => tu.user_id) : [];
      
      const updatedTeams = userTeams.map((t: any) => {
          if (t.id === teamId) {
              return { ...t, members: currentTeamMemberIds };
          }
          return t;
      });
      
      const mappedRoles: TeamRole[] = rolesRes.data ? rolesRes.data.map((r: any) => ({
          id: r.id,
          teamId: r.team_id,
          name: r.name,
          level: r.level,
          color: r.color
      })) : [];

      return {
        users: mappedUsers,
        teams: updatedTeams,
        groups: groupsRes.data ? groupsRes.data.map((g:any) => ({ id: g.id, title: g.title, color: g.color, teamId: g.team_id })) : [],
        columns: mappedColumns,
        tasks: tasksRes.data ? tasksRes.data.map(mapTask) : [], 
        routines: routinesRes.data ? routinesRes.data.map((r:any) => ({ ...r, teamId: r.team_id, assigneeId: r.assignee_id, daysOfWeek: r.days_of_week, lastCompletedDate: r.last_completed_date })) : [],
        notifications: notificationsRes.data ? notificationsRes.data.map((n:any) => ({ 
            id: n.id, 
            userId: n.user_id, 
            taskId: n.task_id, 
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            timestamp: n.created_at
        })) : [],
        meetings: [],
        roles: mappedRoles
      };
    } catch (e) { 
        console.error("Fetch Error:", e);
        return null; 
    }
  },

  // --- Notification Management ---
  createNotification: async (userId: string, taskId: string | undefined, type: string, title: string, message: string) => {
      try {
          // FIX: Ensure taskId is null if empty string to prevent UUID error
          const validTaskId = taskId && taskId.length > 0 ? taskId : null;

          const { error } = await supabase.from('notifications').insert({
              user_id: userId,
              task_id: validTaskId,
              type,
              title,
              message,
              read: false
          });
          if (error) {
              console.error("Error creating notification:", error);
              return false;
          }
          return true;
      } catch (e) {
          console.error("Exception creating notification:", e);
          return false;
      }
  },

  markNotificationAsRead: async (notificationId: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      return !error;
  },

  markAllNotificationsAsRead: async (userId: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      return !error;
  },

  // --- Column Management (Team Scoped) ---
  createColumn: async (teamId: string, title: string) => {
      const colors = [
        'bg-gray-100 dark:bg-gray-800',
        'bg-blue-100 dark:bg-blue-900/30',
        'bg-purple-100 dark:bg-purple-900/30',
        'bg-green-100 dark:bg-green-900/30',
        'bg-yellow-100 dark:bg-yellow-900/30',
        'bg-red-100 dark:bg-red-900/30',
        'bg-pink-100 dark:bg-pink-900/30',
        'bg-indigo-100 dark:bg-indigo-900/30',
        'bg-teal-100 dark:bg-teal-900/30',
        'bg-orange-100 dark:bg-orange-900/30',
        'bg-cyan-100 dark:bg-cyan-900/30',
        'bg-lime-100 dark:bg-lime-900/30'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      try {
          const { data, error } = await supabase.from('columns')
            .insert({ title, color: randomColor, team_id: teamId })
            .select().single();
            
          if (data) {
              return { id: data.id, title: data.title, color: data.color, teamId: data.team_id };
          }
      } catch (e) {
          console.error("Erro ao criar coluna:", e);
      }
      return { id: crypto.randomUUID(), title: title, color: randomColor, teamId };
  },

  updateColumn: async (columnId: string, updates: { title?: string, color?: string }) => {
      try {
          const { error } = await supabase.from('columns').update(updates).eq('id', columnId);
          if (error) {
              console.error("Supabase Update Error:", error);
              return false;
          }
          return true;
      } catch (e) { 
          console.error("Exception updating column:", e);
          return false; 
      }
  },

  deleteColumn: async (columnId: string) => {
      try {
          const { error } = await supabase.from('columns').delete().eq('id', columnId);
          return !error;
      } catch (e) { return true; } 
  },

  createTeamRole: async (teamId: string, name: string, level: number, color: string) => {
      const { data, error } = await supabase.from('team_roles').insert({ team_id: teamId, name, level, color }).select().single();
      return data ? { id: data.id, teamId: data.team_id, name: data.name, level: data.level, color: data.color } as TeamRole : null;
  },

  deleteTeamRole: async (roleId: string) => {
      const { error } = await supabase.from('team_roles').delete().eq('id', roleId);
      return !error;
  },

  getTaskDetails: async (taskId: string) => {
      const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*, subtasks(*), attachments(*), comments(*)')
          .eq('id', taskId)
          .single();

      if (taskError || !taskData) return null;
      
      const mappedTask = mapTask(taskData);
      
      const { data: timelineData, error: timelineError } = await supabase
          .from('task_timeline')
          .select('*, profiles(name, avatar_url)')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

      if (!timelineError && timelineData) {
          mappedTask.timeline = timelineData.map((t: any) => ({
              id: t.id,
              taskId: t.task_id,
              userId: t.user_id,
              userName: t.profiles?.name || 'Sistema',
              userAvatar: t.profiles?.avatar_url,
              eventType: t.event_type,
              oldStatus: t.old_status,
              newStatus: t.new_status,
              reason: t.reason,
              createdAt: t.created_at
          }));
      }

      return mappedTask;
  },
  
  // --- Timeline Functions ---
  
  logTimelineEvent: async (taskId: string, eventType: string, newStatus?: string, oldStatus?: string, reason?: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      
      let { error } = await supabase.from('task_timeline').insert({
          task_id: taskId,
          user_id: userId,
          event_type: eventType,
          new_status: newStatus,
          old_status: oldStatus,
          reason: reason
      });
      
      if (error) {
          console.warn(`[Timeline] Fallback save: ${error.message}`);
          await supabase.from('task_timeline').insert({
              task_id: taskId,
              user_id: null,
              event_type: eventType,
              new_status: newStatus,
              old_status: oldStatus,
              reason: reason
          });
      }
      return true;
  },

  updateUser: async (userId: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.bio) dbUpdates.bio = updates.bio;
    if (updates.avatar) dbUpdates.avatar = updates.avatar;
    if (updates.coverImage) dbUpdates.cover_image = updates.coverImage;
    if (updates.skills) dbUpdates.skills = updates.skills; 
    
    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    return !error;
  },

  updateMemberRole: async (teamId: string, userId: string, newRole: string) => {
    const { error } = await supabase.from('team_members').update({ role: newRole }).eq('team_id', teamId).eq('user_id', userId);
    return !error;
  },

  createTeam: async (name: string, description: string, ownerId: string) => {
      try {
          const inviteCode = `JP-${name.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const { data: teamData, error: teamError } = await supabase.from('teams').insert({ name, description, owner_id: ownerId, invite_code: inviteCode }).select().single();
          if (teamError || !teamData) return false;
          
          await supabase.from('team_members').insert({ team_id: teamData.id, user_id: ownerId, role: 'Admin' });
          
          // Create Default Groups
          const defaultGroups = [
              { title: 'Geral', color: '#00b4d8', team_id: teamData.id }
          ];
          await supabase.from('task_groups').insert(defaultGroups);

          // Create Default Kanban Columns linked to this team
          const defaultCols = [
              { title: 'Tarefas de Entrada', color: 'bg-gray-100 dark:bg-gray-800', team_id: teamData.id },
              { title: 'Em Andamento', color: 'bg-blue-100 dark:bg-blue-900/30', team_id: teamData.id },
              { title: 'Concluído', color: 'bg-green-100 dark:bg-green-900/30', team_id: teamData.id }
          ];
          await supabase.from('columns').insert(defaultCols);

          const defaultRoles = [
              { team_id: teamData.id, name: 'Admin', level: 3, color: '#ef4444' },
              { team_id: teamData.id, name: 'Membro', level: 2, color: '#3b82f6' },
              { team_id: teamData.id, name: 'Observador', level: 1, color: '#9ca3af' }
          ];
          await supabase.from('team_roles').insert(defaultRoles);

          return true;
      } catch (e) { return false; }
  },

  updateTeam: async (teamId: string, updates: Partial<Team>) => {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.avatar) dbUpdates.avatar = updates.avatar;
      const { error } = await supabase.from('teams').update(dbUpdates).eq('id', teamId);
      return !error;
  },

  deleteTeam: async (teamId: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      return !error;
  },

  joinTeam: async (inviteCode: string, userId: string) => {
    try {
      const { data: teamData, error: teamError } = await supabase.from('teams').select('id').eq('invite_code', inviteCode.toUpperCase().trim()).single();
      if (teamError || !teamData) return false;
      const { error: memberError } = await supabase.from('team_members').insert({ team_id: teamData.id, user_id: userId, role: 'Membro' });
      return !memberError;
    } catch (e) { return false; }
  },

  createTaskGroup: async (teamId: string, title: string, color: string) => {
      const { data } = await supabase.from('task_groups').insert({ team_id: teamId, title, color }).select().single();
      return data ? { id: data.id, title: data.title, color: data.color, teamId: data.team_id } : null;
  },

  deleteTaskGroup: async (groupId: string) => {
      const { error } = await supabase.from('task_groups').delete().eq('id', groupId);
      return !error;
  },

  uploadAttachment: async (taskId: string, file: File) => {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${taskId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(fileName, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
              alert(`Erro no upload: ${uploadError.message}.`);
              return null;
          }

          const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);

          const { data: attData, error: dbError } = await supabase
              .from('attachments')
              .insert({ 
                  task_id: taskId, 
                  name: file.name, 
                  url: publicUrl, 
                  type: file.type.includes('image') ? 'image' : 'file' 
              })
              .select().single();
              
          if (dbError) return null;
          return attData;
      } catch (e) { return null; }
  },

  deleteAttachment: async (id: string) => {
      const { error } = await supabase.from('attachments').delete().eq('id', id);
      return !error;
  },

  createTask: async (task: Task, initialSubtasks: Partial<Subtask>[] = []) => {
    // Preparar payload
    const payload: any = {
      team_id: task.teamId, 
      group_id: task.groupId, 
      title: task.title,
      description: task.description, 
      status: task.status, 
      priority: task.priority,
      kanban_column_id: task.kanbanColumnId, 
      assignee_id: task.assigneeId, 
      start_date: task.startDate, 
      due_date: task.dueDate,
      color: task.color
    };

    // Tenta inserir
    let { data: taskData, error: taskError } = await supabase.from('tasks').insert(payload).select().single();
    
    // RETRY: Se falhar por FK da coluna (erro 23503), tenta sem a coluna
    if (taskError && taskError.code === '23503' && (taskError.details?.includes('columns') || taskError.message?.includes('kanban_column_id'))) {
        console.warn("Coluna Kanban não encontrada. Criando tarefa sem associação de coluna visual.");
        delete payload.kanban_column_id;
        const retry = await supabase.from('tasks').insert(payload).select().single();
        taskData = retry.data;
        taskError = retry.error;
    }
    
    if (taskError || !taskData) {
        return { success: false, error: taskError };
    }

    // Log creation in timeline immediately
    await api.logTimelineEvent(taskData.id, 'created', task.status);

    if (initialSubtasks.length > 0) {
        const subtasksToInsert = initialSubtasks.map(s => ({
            task_id: taskData.id,
            title: s.title,
            completed: false,
            duration: s.duration || 1,
            start_date: s.startDate,
            due_date: s.dueDate,
            assignee_id: s.assigneeId
        }));
        
        await supabase.from('subtasks').insert(subtasksToInsert);
    }

    return { success: true, data: mapTask(taskData) };
  },

  updateTask: async (task: Task) => {
    const dbUpdates: any = {
      group_id: task.groupId, title: task.title, description: task.description,
      status: task.status,
      priority: task.priority,
      kanban_column_id: task.kanbanColumnId, // Salva a posição visual
      assignee_id: task.assigneeId || null, 
      support_ids: task.supportIds ?? [],   
      progress: task.progress, approval_status: task.approvalStatus, approver_id: task.approverId,
      start_date: task.startDate, due_date: task.dueDate,
      started_at: task.startedAt, completed_at: task.completedAt,
      updated_at: new Date().toISOString(),
      color: task.color
    };

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', task.id);
    if (error) {
        console.error("Erro ao atualizar tarefa (Supabase):", error);
    }
    return !error;
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    return !error;
  },

  // ... rest of functions (subtasks, routines, meetings) kept same
  // --- Subtask Management ---
  createSubtask: async (taskId: string, title: string, duration: number = 1) => {
      const { data, error } = await supabase.from('subtasks').insert({ task_id: taskId, title, completed: false, duration }).select().single();
      if (!error) {
          await api.logTimelineEvent(taskId, 'subtask_update', undefined, undefined, `Atividade criada: ${title}`);
      }
      return { success: !error, data: data ? { id: data.id, title: data.title, completed: data.completed, assignee_id: data.assignee_id, duration: data.duration, startDate: data.start_date, dueDate: data.due_date } : null };
  },

  updateSubtask: async (subtaskId: string, updates: Partial<Subtask>) => {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.completed !== undefined) {
          dbUpdates.completed = updates.completed;
          dbUpdates.completed_at = updates.completed ? new Date().toISOString() : null;
      }
      if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId || null;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      
      const { error } = await supabase.from('subtasks').update(dbUpdates).eq('id', subtaskId);
      return !error;
  },

  deleteSubtask: async (subtaskId: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      return !error;
  },

  createRoutine: async (routine: RoutineTask) => {
    const { error } = await supabase.from('routines').insert({
        id: routine.id, team_id: routine.teamId, title: routine.title,
        description: routine.description, assignee_id: routine.assigneeId || null,
        frequency: routine.frequency, days_of_week: routine.daysOfWeek, time: routine.time
    });
    return !error;
  },

  updateRoutine: async (routineId: string, updates: Partial<RoutineTask>) => {
      const dbUpdates: any = {};
      if(updates.lastCompletedDate) dbUpdates.last_completed_date = updates.lastCompletedDate;
      const { error } = await supabase.from('routines').update(dbUpdates).eq('id', routineId);
      return !error;
  },

  createMeeting: async (meeting: Partial<Meeting>) => {
    const { error } = await supabase.from('meetings').insert(meeting);
    return !error; 
  },

  deleteMeeting: async (meetingId: string) => {
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
    return !error;
  }
};
