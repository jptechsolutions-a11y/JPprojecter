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
    // Skills would need array handling if implemented in UI

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    return !error;
  },

  // --- TEAM MANAGEMENT ---
  createTeam: async (name: string, description: string, ownerId: string) => {
      try {
          // 1. Create Team
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

          if (teamError || !teamData) {
              console.error("Error creating team:", teamError);
              return false;
          }

          // 2. Add Owner as Member
          // Tenta inserir com a role 'owner'. Se a coluna não existir, tenta sem a role.
          let { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: teamData.id,
                user_id: ownerId,
                role: 'owner'
            });

          // PGRST204: Could not find the 'role' column
          if (memberError && memberError.code === 'PGRST204') {
              console.warn("Schema warning: 'role' column missing in team_members. Inserting without role.");
              const { error: retryError } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamData.id,
                    user_id: ownerId
                });
              memberError = retryError;
          }

          if (memberError) {
              console.error("Error adding owner:", memberError);
              // Rollback: delete the created team to avoid orphans
              await supabase.from('teams').delete().eq('id', teamData.id);
              return false;
          }

          // 3. Create Default Groups for Kanban
          const defaultGroups = [
              { title: 'Desenvolvimento', color: '#00b4d8', team_id: teamData.id },
              { title: 'Design & UX', color: '#a25ddc', team_id: teamData.id },
              { title: 'Marketing', color: '#fdab3d', team_id: teamData.id }
          ];
          await supabase.from('task_groups').insert(defaultGroups);

          return true;
      } catch (e) {
          console.error("Exception creating team:", e);
          return false;
      }
  },

  joinTeam: async (inviteCode: string, userId: string) => {
      try {
          // 1. Find Team
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id')
            .ilike('invite_code', inviteCode) // Case insensitive check
            .single();

          if (teamError || !teamData) {
              console.error("Team not found or invalid code");
              return false;
          }

          // 2. Add Member (Constraint ensures no duplicates)
          let { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: teamData.id,
                user_id: userId,
                role: 'member'
            });

          // PGRST204 Fallback
          if (memberError && memberError.code === 'PGRST204') {
             const { error: retryError } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamData.id,
                    user_id: userId
                });
             memberError = retryError;
          }

          if (memberError) {
              // Ignore duplicate key error (already joined)
              if (memberError.code === '23505') return true; 
              console.error("Error joining team:", memberError);
              return false;
          }

          return true;
      } catch (e) {
          console.error("Exception joining team:", e);
          return false;
      }
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
      
      if(error) console.error("Error creating group:", error);
      return data ? { id: data.id, title: data.title, color: data.color, teamId: data.team_id } : null;
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
        assignee_id: routine.assigneeId && routine.assigneeId.trim() !== '' ? routine.assigneeId : null, // Fix empty string UUID error
        frequency: routine.frequency,
        days_of_week: routine.daysOfWeek,
        time: routine.time
    };
    const { error } = await supabase.from('routines').insert(dbRoutine);
    if(error) console.error("Error creating routine:", error);
    return !error;
  },

  updateRoutine: async (routineId: string, updates: Partial<RoutineTask>) => {
      const dbUpdates: any = {};
      if(updates.lastCompletedDate) dbUpdates.last_completed_date = updates.lastCompletedDate;
      
      const { error } = await supabase.from('routines').update(dbUpdates).eq('id', routineId);
      if(error) console.error("Error updating routine:", error);
      return !error;
  }
};

export const INITIAL_USERS: User[] = [];
export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_GROUPS: TaskGroup[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_COLUMNS: Column[] = [];
export const INITIAL_ROUTINES: RoutineTask[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];