
import { supabase } from './supabaseClient';
import { Task, User, Team, TaskGroup, Column, RoutineTask, Notification, Subtask, Attachment, Comment, Meeting, TeamRole } from '../types';

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
  subtasks: (t.subtasks || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    completed: s.completed,
    assignee_id: s.assignee_id,
    due_date: s.due_date,
    start_date: s.start_date
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

      // Prepara os times
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

      // BUSCA PARALELA
      const [
          teamUsersRes,
          groupsRes,
          columnsRes,
          tasksRes,
          routinesRes,
          notificationsRes,
          rolesRes 
      ] = await Promise.all([
          supabase.from('team_members').select('user_id, role, profiles(*)').eq('team_id', teamId),
          supabase.from('task_groups').select('*').eq('team_id', teamId),
          supabase.from('columns').select('*').order('id', { ascending: true }),
          supabase.from('tasks').select('*, subtasks(*)').eq('team_id', teamId), 
          supabase.from('routines').select('*').eq('team_id', teamId),
          supabase.from('notifications').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(50),
          supabase.from('team_roles').select('*').eq('team_id', teamId)
      ]);

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

      let mappedColumns = columnsRes.data ? columnsRes.data.map((c:any) => ({ id: c.id, title: c.title, color: c.color })) : [];

      if (mappedColumns.length === 0) {
          mappedColumns = [
              { id: 'A Fazer', title: 'A Fazer', color: 'bg-gray-100 dark:bg-gray-800' },
              { id: 'Em Progresso', title: 'Em Progresso', color: 'bg-blue-100 dark:bg-blue-900/30' },
              { id: 'Revisão', title: 'Revisão', color: 'bg-purple-100 dark:bg-purple-900/30' },
              { id: 'Concluído', title: 'Concluído', color: 'bg-green-100 dark:bg-green-900/30' }
          ];
      }
      
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
        notifications: notificationsRes.data ? notificationsRes.data.map((n:any) => ({ ...n, userId: n.user_id, taskId: n.task_id })) : [],
        meetings: [],
        roles: mappedRoles
      };
    } catch (e) { 
        console.error("Fetch Error:", e);
        return null; 
    }
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
      const { data } = await supabase.from('tasks')
          .select('*, subtasks(*), attachments(*), comments(*)')
          .eq('id', taskId)
          .single();
      return data ? mapTask(data) : null;
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
          
          const defaultGroups = [
              { title: 'Desenvolvimento', color: '#00b4d8', team_id: teamData.id },
              { title: 'Design & UX', color: '#a25ddc', team_id: teamData.id }
          ];
          await supabase.from('task_groups').insert(defaultGroups);

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
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Math.random()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) return null;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      const { data: attData, error: dbError } = await supabase.from('attachments').insert({ task_id: taskId, name: file.name, url: publicUrl, type: file.type.includes('image') ? 'image' : 'file' }).select().single();
      return dbError ? null : attData;
  },

  deleteAttachment: async (id: string) => {
      const { error } = await supabase.from('attachments').delete().eq('id', id);
      return !error;
  },

  // FIXED: Do not send ID, let DB generate it to avoid 409
  createTask: async (task: Task) => {
    const { data, error } = await supabase.from('tasks').insert({
      team_id: task.teamId, 
      group_id: task.groupId, 
      title: task.title,
      description: task.description, 
      status: task.status, 
      priority: task.priority,
      assignee_id: task.assigneeId, 
      start_date: task.startDate, 
      due_date: task.dueDate
    }).select().single();
    
    if (error) {
        console.error("SUPABASE ERROR CREATING TASK:", error);
        return { success: false, error };
    }
    return { success: true, data: mapTask(data) };
  },

  updateTask: async (task: Task) => {
    const { error } = await supabase.from('tasks').update({
      group_id: task.groupId, title: task.title, description: task.description,
      status: task.status, priority: task.priority, assignee_id: task.assigneeId,
      progress: task.progress, approval_status: task.approvalStatus, approver_id: task.approverId
    }).eq('id', task.id);
    return !error;
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
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
