import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useMyTasks, type MyTask } from '@/hooks/useMyTasks'
import { useDepthStore } from '@/store/depthStore'

/**
 * My Tasks — a checklist of everything assigned to the signed-in user across
 * all projects (reached from the sidebar or the bell). Checking a task marks
 * it done; the Completed section keeps finished work visible as a record and
 * lets a mis-click be unchecked back to open.
 */
export function TasksPage() {
  const { user } = useAuth()
  const { openTasks, doneTasks, setTaskStatus } = useMyTasks(user?.id)
  const [showDone, setShowDone] = useState(false)
  const setDepth = useDepthStore((s) => s.setDepth)
  useEffect(() => setDepth(0), [setDepth])

  return (
    <div id="tasks-page" className="p-8 max-w-3xl mx-auto">
      <div id="tasks-header" className="mb-7">
        <h1 className="text-3xl font-light tracking-wide text-[#1a1620]">Tasks</h1>
        <p className="text-[#6b6275] text-sm mt-1.5 font-light">Assigned to you, across every project</p>
      </div>

      {openTasks.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[#6b6275] py-6">
          Nothing outstanding — anything assigned to you will show up here.
        </motion.p>
      ) : (
        <ul id="tasks-open" className="space-y-1.5">
          {openTasks.map((t, i) => (
            <motion.li key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <TaskRow task={t} onToggle={() => setTaskStatus(t.id, 'done')} />
            </motion.li>
          ))}
        </ul>
      )}

      {/* Completed — kept as a record; unchecking reopens a task */}
      {doneTasks.length > 0 && (
        <div id="tasks-done" className="mt-9">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-[#6b6275] uppercase tracking-wide hover:text-[#1a1620] transition-colors"
          >
            <span className={`inline-block transition-transform ${showDone ? 'rotate-90' : ''}`}>›</span>
            Completed · {doneTasks.length}
          </button>
          {showDone && (
            <ul className="mt-3 space-y-1.5">
              {doneTasks.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} done onToggle={() => setTaskStatus(t.id, 'open')} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, done = false, onToggle }: { task: MyTask; done?: boolean; onToggle: () => void }) {
  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-black/[0.06] card-glass transition-colors hover:border-black/[0.12] ${
        done ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={onToggle}
        title={done ? 'Reopen' : 'Mark done'}
        className={`w-[18px] h-[18px] flex-shrink-0 rounded-full border flex items-center justify-center transition-colors ${
          done
            ? 'bg-accent border-accent text-white'
            : 'border-[#b3aabb] text-transparent hover:border-accent hover:text-accent/50'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 5.5L4 8l4.5-6" />
        </svg>
      </button>

      <Link to={`/project/${task.project_id}/track/${task.track_id}`} className="flex-1 min-w-0">
        <p className={`text-sm text-[#1a1620] truncate ${done ? 'line-through' : ''}`}>{task.title}</p>
        {task.body && <p className="text-xs text-[#6b6275] font-light truncate mt-0.5">{task.body}</p>}
      </Link>

      <div className="flex items-center gap-2 flex-shrink-0">
        {task.due_date && !done && (
          <span className="text-[10px] text-[#6b6275] tabular-nums">{task.due_date}</span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.05] text-[#6b6275] truncate max-w-[120px]">
          {task.project_name}
        </span>
      </div>
    </div>
  )
}
