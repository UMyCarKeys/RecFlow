import { CommentItem } from './CommentItem'
import { CommentComposer } from './CommentComposer'
import { Spinner } from '@/components/ui/Spinner'
import { useComments } from '@/hooks/useComments'

interface CommentThreadProps {
  versionId: string
}

export function CommentThread({ versionId }: CommentThreadProps) {
  const { comments, loading, addComment } = useComments(versionId)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">Comments</h3>

      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted py-2">No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={addComment} />
          ))}
        </div>
      )}

      <CommentComposer onSubmit={addComment} />
    </div>
  )
}
