import { CommentItem } from './CommentItem'
import { CommentComposer } from './CommentComposer'
import { Spinner } from '@/components/ui/Spinner'
import { useThread } from '@/hooks/useThread'
import type { ProjectMember } from '@/types/database'

interface CommentThreadProps {
  versionId: string
  projectId: string
  members: ProjectMember[]
}

export function CommentThread({ versionId, projectId, members }: CommentThreadProps) {
  const { comments, loading, addComment, setTaskDone, deleteTask, deleteComment } = useThread(versionId, projectId)

  return (
    <div id={`comment-thread-${versionId}`} className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Comments &amp; tasks</h3>

      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted py-1">No comments yet. Add one below.</p>
      ) : (
        <div id={`comment-list-${versionId}`} className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              members={members}
              onReply={addComment}
              onTaskDone={setTaskDone}
              onDeleteTask={deleteTask}
              onDeleteComment={deleteComment}
            />
          ))}
        </div>
      )}

      <CommentComposer onSubmit={addComment} members={members} showTaskOption />
    </div>
  )
}
