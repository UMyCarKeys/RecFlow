import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <motion.div
      id={`project-card-${project.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Link
        to={`/project/${project.id}`}
        className="block rounded-xl bg-surface-2 border border-white/8 overflow-hidden hover:border-accent/40 transition-colors"
      >
        <div id={`project-${project.id}-cover`} className="h-32 bg-gradient-to-br from-accent/20 via-surface-3 to-surface-2 flex items-center justify-center">
          {project.cover_url ? (
            <img src={project.cover_url} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <AlbumIcon />
          )}
        </div>
        <div id={`project-${project.id}-info`} className="p-4">
          <h3 className="font-semibold text-white text-sm truncate">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-muted mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

function AlbumIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(124,106,240,0.5)" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
