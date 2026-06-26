import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectMember } from '@/types/database'

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

  return { project, members, loading }
}
