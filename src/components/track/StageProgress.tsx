import { cn } from '@/lib/utils'
import type { TrackStage } from '@/types/database'

const STAGES: { key: TrackStage; label: string }[] = [
  { key: 'idea',      label: 'Idea'      },
  { key: 'demo',      label: 'Demo'      },
  { key: 'mix',       label: 'Mix'       },
  { key: 'final_mix', label: 'Final Mix' },
  { key: 'master',    label: 'Master'    },
]

interface StageProgressProps {
  stage: TrackStage
  onChange?: (stage: TrackStage) => void
}

export function StageProgress({ stage, onChange }: StageProgressProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage)

  return (
    <div id="stage-progress" className="flex items-center">
      {STAGES.map((s, i) => {
        const isActive = s.key === stage
        const isCompleted = i < currentIndex
        return (
          <div key={s.key} id={`stage-step-${s.key}`} className="flex items-center">
            <button
              id={`stage-btn-${s.key}`}
              onClick={() => onChange?.(s.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive && 'bg-accent/20 text-accent ring-1 ring-accent/40',
                isCompleted && !isActive && 'text-accent/70 hover:text-accent',
                !isActive && !isCompleted && 'text-muted hover:text-white',
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] border flex-shrink-0',
                  isActive && 'bg-accent border-accent text-white',
                  isCompleted && !isActive && 'bg-accent/30 border-accent/50 text-accent',
                  !isActive && !isCompleted && 'border-white/20 text-muted',
                )}
              >
                {isCompleted ? '✓' : i + 1}
              </span>
              {s.label}
            </button>
            {i < STAGES.length - 1 && (
              <div id={`stage-connector-${s.key}`} className={cn('h-px w-6 mx-1 flex-shrink-0', i < currentIndex ? 'bg-accent/40' : 'bg-white/10')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
