import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { CommentComposer } from './CommentComposer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePlayerStore } from '@/store/playerStore'
import { useAuth } from '@/hooks/useAuth'
import { formatDuration, timeAgo } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
import type { AddOpts } from '@/hooks/useThread'
import type { Comment, ProjectMember } from '@/types/database'

interface CommentItemProps {
  comment: Comment
  members: ProjectMember[]
  onReply: (body: string, authorId: string, opts?: AddOpts) => Promise<unknown>
  onTaskDone: (taskId: string, done: boolean) => void
  onDeleteTask: (taskId: string) => void
  onDeleteComment: (commentId: string) => void
}

export function CommentItem({ comment, members, onReply, onTaskDone, onDeleteTask, onDeleteComment }: CommentItemProps) {
  const [replying, setReplying] = useState(false)
  const [confirm, setConfirm] = useState<null | 'comment' | 'task'>(null)
  const { setProgress, activeVersionId } = usePlayerStore()
  const { user } = useAuth()

  const task = comment.task
  const isAuthor = user?.id === comment.author_id
  const done = task?.status === 'done'

  return (
    <div id={`comment-${comment.id}`} className="space-y-2">
      <div id={`comment-${comment.id}-header`} className="flex gap-3">
        <Avatar src={comment.profiles?.avatar_url} name={displayName(comment.profiles)} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#1a1620]">{displayName(comment.profiles)}</span>
            {comment.timestamp_s != null && (
              <button
                onClick={() => activeVersionId && setProgress(comment.timestamp_s!)}
                className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
              >
                {formatDuration(comment.timestamp_s)}
              </button>
            )}
            <span className="text-xs text-[#9a8fa3]">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-[#3a3340] mt-1 leading-relaxed">{comment.body}</p>

          {/* Inline task */}
          {task && (
            <div className="mt-2 flex items-center gap-2 p-2 rounded-lg field-glass border border-black/[0.06]">
              <button
                onClick={() => onTaskDone(task.id, !done)}
                className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                  done ? 'bg-accent border-accent text-white' : 'border-black/30 text-transparent hover:border-accent'
                }`}
                title={done ? 'Mark not done' : 'Mark done'}
              >
                ✓
              </button>
              <span className={`text-xs flex-1 min-w-0 truncate ${done ? 'line-through text-[#9a8fa3]' : 'text-[#2a2433]'}`}>
                {task.title}
              </span>
              {task.assignee && (
                <span className="flex items-center gap-1 text-xs text-[#6b6275] flex-shrink-0">
                  <Avatar src={task.assignee.avatar_url} name={displayName(task.assignee)} size="sm" />
                  {displayName(task.assignee)}
                </span>
              )}
              <button onClick={() => setConfirm('task')} className="text-[#9a8fa3] hover:text-red-500 transition-colors flex-shrink-0" title="Remove task">
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => setReplying((v) => !v)} className="text-xs text-[#6b6275] hover:text-[#1a1620] transition-colors">
              Reply
            </button>
            {isAuthor && (
              <button onClick={() => setConfirm('comment')} className="text-xs text-[#6b6275] hover:text-red-500 transition-colors">
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {replying && (
        <div className="ml-10">
          <CommentComposer onSubmit={onReply} parentId={comment.id} placeholder="Reply…" onCancel={() => setReplying(false)} />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div id={`comment-${comment.id}-replies`} className="ml-10 space-y-3 border-l border-black/[0.08] pl-3">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              members={members}
              onReply={onReply}
              onTaskDone={onTaskDone}
              onDeleteTask={onDeleteTask}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'task' ? 'Remove task?' : 'Delete comment?'}
        message={
          confirm === 'task'
            ? 'This removes the task from this comment. The comment stays.'
            : 'This permanently deletes the comment (and its task, if any).'
        }
        confirmLabel={confirm === 'task' ? 'Remove' : 'Delete'}
        danger
        onConfirm={() => {
          if (confirm === 'task' && task) onDeleteTask(task.id)
          if (confirm === 'comment') onDeleteComment(comment.id)
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
