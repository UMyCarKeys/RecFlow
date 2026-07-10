import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useMyTasks, type MyTask } from '@/hooks/useMyTasks'
import { useChromeStore } from '@/store/chromeStore'
import { usePlayerStore } from '@/store/playerStore'

/**
 * My Tasks as an in-place flyout (no navigation): opens from the sidebar's
 * checklist icon or the bell's "View all", anchored bottom-left next to the
 * rail and lifted above the player bar when a track is loaded. Checking a
 * task marks it done; the Completed section keeps finished work visible as a
 * record and lets a mis-click be unchecked back to open.
 */
export function TasksPanel() {
  const open = useChromeStore((s) => s.tasksOpen)
  const setOpen = useChromeStore((s) => s.setTasksOpen)
  const hasPlayer = usePlayerStore((s) => !!s.activeVersionId)
  const { user } = useAuth()
  const { openTasks, doneTasks, setTaskStatus } = useMyTasks(open ? user?.id : undefined)
  const [showDone, setShowDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          data-ui-overlay
          id="tasks-panel"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed left-[76px] z-40 w-[360px] max-h-[62vh] flex flex-col rounded-xl glass-light border border-line/[0.08] shadow-xl"
          style={{ bottom: hasPlayer ? 72 : 16 }}
        >
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-medium text-ink">Tasks</h2>
              <p className="text-[11px] text-muted font-light">Assigned to you, across every project</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-faint hover:text-ink transition-colors text-sm" title="Close">
              ✕
            </button>
          </div>

          <div className="px-3 pb-3 overflow-y-auto overscroll-contain no-scrollbar">
            {openTasks.length === 0 ? (
              <p className="text-xs text-muted px-1 py-4">Nothing outstanding — anything assigned to you shows up here.</p>
            ) : (
              <ul className="space-y-1.5">
                {openTasks.map((t) => (
                  <li key={t.id}>
                    <TaskRow task={t} onToggle={() => setTaskStatus(t.id, 'done')} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            )}

            {/* Completed — kept as a record; unchecking reopens a task */}
            {doneTasks.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowDone((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wide hover:text-ink transition-colors px-1"
                >
                  <span className={`inline-block transition-transform ${showDone ? 'rotate-90' : ''}`}>›</span>
                  Completed · {doneTasks.length}
                </button>
                {showDone && (
                  <ul className="mt-2 space-y-1.5">
                    {doneTasks.map((t) => (
                      <li key={t.id}>
                        <TaskRow task={t} done onToggle={() => setTaskStatus(t.id, 'open')} onNavigate={() => setOpen(false)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TaskRow({ task, done = false, onToggle, onNavigate }: { task: MyTask; done?: boolean; onToggle: () => void; onNavigate: () => void }) {
  return (
    <div
      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg field-glass border border-line/[0.06] transition-colors hover:border-line/[0.14] ${
        done ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={onToggle}
        title={done ? 'Reopen' : 'Mark done'}
        className={`w-[16px] h-[16px] flex-shrink-0 rounded-full border flex items-center justify-center transition-colors ${
          done
            ? 'bg-accent border-accent text-white'
            : 'border-faint/80 text-transparent hover:border-accent hover:text-accent/50'
        }`}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 5.5L4 8l4.5-6" />
        </svg>
      </button>

      <Link to={`/project/${task.project_id}/track/${task.track_id}`} onClick={onNavigate} className="flex-1 min-w-0">
        <p className={`text-[13px] text-ink truncate ${done ? 'line-through' : ''}`}>{task.title}</p>
      </Link>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task.due_date && !done && <span className="text-[10px] text-muted tabular-nums">{task.due_date}</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-line/[0.05] text-muted truncate max-w-[90px]">
          {task.project_name}
        </span>
      </div>
    </div>
  )
}
