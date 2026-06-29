import { cn } from '@/lib/utils'
import { STAGE_ORDER, STAGE_LABEL, STAGE_HINT } from '@/lib/progress'
import type { TrackStage } from '@/types/database'

interface StageProgressProps {
  stage: TrackStage
  onChange?: (stage: TrackStage) => void
}

export function StageProgress({ stage, onChange }: StageProgressProps) {
  const currentIndex = STAGE_ORDER.findIndex((s) => s === stage)

  return (
    <div
      id="stage-progress"
      className="flex items-center overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-12px),transparent)]"
    >
      {STAGE_ORDER.map((key, i) => {
        const isActive = key === stage
        const isCompleted = i < currentIndex
        return (
          <div key={key} id={`stage-step-${key}`} className="flex items-center flex-shrink-0">
            <button
              id={`stage-btn-${key}`}
              onClick={() => onChange?.(key)}
              title={STAGE_HINT[key]}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
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
              {STAGE_LABEL[key]}
            </button>
            {i < STAGE_ORDER.length - 1 && (
              <div
                id={`stage-connector-${key}`}
                className={cn('h-px w-5 mx-0.5 flex-shrink-0', i < currentIndex ? 'bg-accent/40' : 'bg-white/10')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
