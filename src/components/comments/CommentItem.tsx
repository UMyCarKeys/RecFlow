import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { CommentComposer } from './CommentComposer'
import { usePlayerStore } from '@/store/playerStore'
import { formatDuration, timeAgo } from '@/lib/utils'
import type { Comment } from '@/types/database'

interface CommentItemProps {
  comment: Comment
  onReply: (body: string, authorId: string, parentId?: string, timestampS?: number) => Promise<unknown>
}

export function CommentItem({ comment, onReply }: CommentItemProps) {
  const [replying, setReplying] = useState(false)
  const { setProgress, activeVersionId } = usePlayerStore()

  const handleTimestampClick = () => {
    if (comment.timestamp_s != null && activeVersionId) {
      setProgress(comment.timestamp_s)
    }
  }

  return (
    <div id={`comment-${comment.id}`} className="space-y-2">
      <div id={`comment-${comment.id}-header`} className="flex gap-3">
        <Avatar src={comment.profiles?.avatar_url} name={comment.profiles?.username} size="sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white">{comment.profiles?.username}</span>
            {comment.timestamp_s != null && (
              <button
                onClick={handleTimestampClick}
                className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent-hover hover:bg-accent/30 transition-colors"
              >
                {formatDuration(comment.timestamp_s)}
              </button>
            )}
            <span className="text-xs text-muted">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-white/80 mt-1 leading-relaxed">{comment.body}</p>
          <button
            onClick={() => setReplying((v) => !v)}
            className="text-xs text-muted hover:text-white transition-colors mt-1"
          >
            Reply
          </button>
        </div>
      </div>

      {replying && (
        <div className="ml-10">
          <CommentComposer
            onSubmit={onReply}
            parentId={comment.id}
            placeholder="Reply…"
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div id={`comment-${comment.id}-replies`} className="ml-10 space-y-3 border-l border-white/8 pl-3">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}
