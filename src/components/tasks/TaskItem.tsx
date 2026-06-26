import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: Task
  onStatusChange: (id: string, status: TaskStatus) => void
}

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  open: 'text-yellow-400 bg-yellow-900/20',
  in_progress: 'text-blue-400 bg-blue-900/20',
  done: 'text-green-400 bg-green-900/20',
}

export function TaskItem({ task, onStatusChange }: TaskItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-3 hover:bg-surface-3/80 transition-colors">
      <button
        onClick={() => onStatusChange(task.id, STATUS_CYCLE[task.status])}
        className={cn('flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors', STATUS_COLOR[task.status])}
        title="Click to advance status"
      >
        {STATUS_LABEL[task.status]}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through text-muted')}>
          {task.title}
        </p>
        {task.body && <p className="text-xs text-muted mt-0.5">{task.body}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-muted">{timeAgo(task.created_at)}</span>
          {task.assignee && (
            <div className="flex items-center gap-1">
              <Avatar src={task.assignee.avatar_url} name={task.assignee.username} size="sm" />
              <span className="text-xs text-muted">{task.assignee.username}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
