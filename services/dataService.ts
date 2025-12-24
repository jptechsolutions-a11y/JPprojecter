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
  team: 't1', // Deprecated but kept for type compat
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
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) return null;

      // 1. Fetch Teams associated with the user via team_members table
      const { data: teamMemberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', currentUserId);
      
      if (memberError) {
          console.error("Error fetching memberships:", memberError);
          return null;
      }

      // Extract teams from the join
      const userTeams = teamMemberships
        .map((tm: any) => tm.teams)
        .filter(t => t !== null)
        .map((t: any) => ({
             id: t.id, 
             name: t.name, 
             description: t.description, 
             members: [], // Will fetch users next
             inviteCode: t.invite_code,
             avatar: t.avatar // Mapped team avatar
        }));

      // If user has no teams, return special empty state to trigger Onboarding in App.tsx
      if (userTeams.length === 0) {
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

      // Determine valid Team ID
      let teamId = requestedTeamId;
      const teamExists = userTeams.find(t => t.id === teamId);
      
      if (!teamId || !teamExists) {
          teamId = userTeams[0].id;
      }

      // 2. Fetch Users that belong to the current team
      // Use team_members to filter profiles
      const { data: teamUsersData } = await supabase
        .from('team_members')
        .select('user_id, profiles(*)')
        .eq('team_id', teamId);
      
      const mappedUsers = teamUsersData 
        ? teamUsersData.map((tu: any) => mapUser(tu.profiles)).filter(u => u.id) 
        : [];

      // Update team member lists in our local team objects
      const activeTeam = userTeams.find(t => t.id === teamId);
      if(activeTeam) activeTeam.members = mappedUsers.map(u => u.id);

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

      if (taskError) console.error("Error fetching tasks:", taskError);

      // 6. Routines
      const { data: routinesData } = await supabase.from('routines').select('*').eq('team_id', teamId);

      // 7. Notifications (Fetch for current user)
      const { data: notificationsData } = await supabase.from('notifications').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });

      return {
        users: mappedUsers,
        teams: userTeams,
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

  // --- USER MANAGEMENT ---
  updateUser: async (userId: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.bio) dbUpdates.bio = updates.bio;
    if (updates.avatar) dbUpdates.avatar = updates.avatar;
    if (updates.coverImage) dbUpdates.cover_image = updates.coverImage;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    return !error;
  },

  // --- TEAM MANAGEMENT ---
  createTeam: async (name: string, description: string, ownerId: string) => {
      try {
          const inviteCode = `JP-${name.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert({
                name,
                description,
                owner_id: ownerId,
                invite_code: inviteCode
            })
            .select()
            .single();

          if (teamError || !teamData) return false;

          await supabase.from('team_members').insert({
              team_id: teamData.id,
              user_id: ownerId,
              role: 'owner'
          });

          return true;
      } catch (e) { return false; }
  },

  joinTeam: async (inviteCode: string, userId: string) => {
      try {
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id')
            .ilike('invite_code', inviteCode)
            .single();

          if (teamError || !teamData) return false;

          const { error } = await supabase.from('team_members').insert({
              team_id: teamData.id,
              user_id: userId,
              role: 'member'
          });

          return !error;
      } catch (e) { return false; }
  },

  updateTeam: async (teamId: string, updates: Partial<Team>) => {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.avatar) dbUpdates.avatar = updates.avatar;
      
      const { error } = await supabase.from('teams').update(dbUpdates).eq('id', teamId);
      return !error;
  },

  createTaskGroup: async (teamId: string, title: string, color: string) => {
      const { data, error } = await supabase.from('task_groups').insert({
          team_id: teamId,
          title: title,
          color: color
      }).select().single();
      
      return data ? { id: data.id, title: data.title, color: data.color, teamId: data.team_id } : null;
  },

  deleteTaskGroup: async (groupId: string) => {
      const { error } = await supabase.from('task_groups').delete().eq('id', groupId);
      return !error;
  },

  // --- STORAGE HELPERS ---
  uploadFile: async (bucket: string, path: string, file: File) => {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) return null;
      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicUrl.publicUrl;
  },

  // --- TASKS CRUD ---
  createTask: async (task: Task) => {
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
    return !error;
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    return !error;
  },

  createRoutine: async (routine: RoutineTask) => {
    const dbRoutine = {
        id: routine.id,
        team_id: routine.teamId,
        title: routine.title,
        description: routine.description,
        assignee_id: routine.assigneeId && routine.assigneeId.trim() !== '' ? routine.assigneeId : null,
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
      const { error } = await supabase.from('routines').update(dbUpdates).eq('id', routineId);
      return !error;
  }
};