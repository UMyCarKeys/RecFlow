import { TaskItem } from './TaskItem'
import { TaskComposer } from './TaskComposer'
import { Spinner } from '@/components/ui/Spinner'
import { useTasks } from '@/hooks/useTasks'
import type { ProjectMember } from '@/types/database'

interface TaskListProps {
  versionId: string
  projectId: string
  members: ProjectMember[]
}

export function TaskList({ versionId, projectId, members }: TaskListProps) {
  const { tasks, loading, addTask, updateStatus } = useTasks(versionId)

  return (
    <div id={`task-list-${versionId}`} className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Tasks</h3>

      {loading ? (
        <div id={`task-list-${versionId}-loading`} className="flex justify-center py-4"><Spinner /></div>
      ) : tasks.length === 0 ? (
        <p id={`task-list-${versionId}-empty`} className="text-xs text-muted">No tasks yet.</p>
      ) : (
        <div id={`task-list-${versionId}-items`} className="space-y-2">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} onStatusChange={updateStatus} />
          ))}
        </div>
      )}

      <TaskComposer onSubmit={addTask} projectId={projectId} members={members} />
    </div>
  )
}
