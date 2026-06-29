import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectMember, MemberRole } from '@/types/database'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        else setProjects(data ?? [])
        setLoading(false)
      })
  }, [])

  return { projects, loading, error }
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return

    Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase
        .from('project_members')
        .select('*, profiles(*)')
        .eq('project_id', projectId),
    ]).then(([{ data: p }, { data: m }]) => {
      setProject(p)
      setMembers((m as ProjectMember[]) ?? [])
      setLoading(false)
    })
  }, [projectId])

  const addMember = async (userId: string, role: MemberRole) => {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role })
      .select('*, profiles(*)')
      .single()
    if (!error && data) setMembers((prev) => [...prev, data as ProjectMember])
    return { error }
  }

  const updateMemberRole = async (memberId: string, role: MemberRole) => {
    const { error } = await supabase.from('project_members').update({ role }).eq('id', memberId)
    if (!error) setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)))
    return { error }
  }

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('project_members').delete().eq('id', memberId)
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== memberId))
    return { error }
  }

  const updateProject = async (updates: Partial<Pick<Project, 'name' | 'description' | 'cover_url' | 'name_history'>>) => {
    const { data, error } = await supabase.from('projects').update(updates).eq('id', projectId).select().single()
    if (!error && data) setProject(data as Project)
    return { error }
  }

  return { project, members, loading, addMember, updateMemberRole, removeMember, updateProject }
}
