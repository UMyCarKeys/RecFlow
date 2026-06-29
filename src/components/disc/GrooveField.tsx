/**
 * Layer-2 background: a deeply zoomed-in field of vinyl grooves in the track's
 * color, hovering behind the track page. An optional glow pulses when the track
 * has idea notes (a flicker of light added to the record).
 */
interface GrooveFieldProps {
  hue: string
  glow?: boolean
}

export function GrooveField({ hue, glow = false }: GrooveFieldProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 top-1/2 w-[170%] aspect-square -translate-x-1/2 -translate-y-1/2 animate-[spin_140s_linear_infinite] opacity-[0.16]"
      >
        {Array.from({ length: 70 }).map((_, i) => {
          const r = 3 + i * 0.7
          return (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={hue} strokeOpacity={0.55} strokeWidth={0.16} />
          )
        })}
      </svg>

      {/* Soft colored haze from the track hue */}
      <div
        className="absolute left-1/2 top-1/2 w-[80%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] opacity-[0.12]"
        style={{ background: hue }}
      />

      {/* Flicker of light when the track has idea notes */}
      {glow && (
        <div
          className="absolute left-[62%] top-[40%] w-40 h-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl animate-pulse"
          style={{ background: hue, opacity: 0.16 }}
        />
      )}
    </div>
  )
}
