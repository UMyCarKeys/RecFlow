export type MemberRole = 'owner' | 'contributor' | 'viewer'
export type TaskStatus = 'open' | 'in_progress' | 'done'
export type TrackStage = 'idea' | 'demo' | 'mix' | 'final_mix' | 'master'

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  profiles?: Profile
}

export interface Track {
  id: string
  project_id: string
  title: string
  position: number
  created_by: string
  created_at: string
  updated_at: string
  stage: TrackStage
  notes: string | null
  links: { url: string; label: string }[]
}

export interface Version {
  id: string
  track_id: string
  version_number: number
  audio_key: string
  file_name: string
  file_size: number | null
  duration: number | null
  description: string | null
  tags: string[]
  uploaded_by: string
  created_at: string
  profiles?: Profile
}

export interface Comment {
  id: string
  version_id: string
  parent_id: string | null
  author_id: string
  body: string
  timestamp_s: number | null
  created_at: string
  updated_at: string
  profiles?: Profile
  replies?: Comment[]
}

export interface Task {
  id: string
  version_id: string
  project_id: string
  title: string
  body: string | null
  status: TaskStatus
  assignee_id: string | null
  created_by: string
  due_date: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
  creator?: Profile
}

// Supabase client generic helper
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Project> }
      project_members: { Row: ProjectMember; Insert: Omit<ProjectMember, 'id' | 'joined_at'>; Update: Partial<ProjectMember> }
      tracks: { Row: Track; Insert: Omit<Track, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Track> }
      versions: { Row: Version; Insert: Omit<Version, 'id' | 'version_number' | 'created_at'>; Update: Partial<Version> }
      comments: { Row: Comment; Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Comment> }
      tasks: { Row: Task; Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Task> }
    }
    Enums: {
      member_role: MemberRole
      task_status: TaskStatus
    }
  }
}
