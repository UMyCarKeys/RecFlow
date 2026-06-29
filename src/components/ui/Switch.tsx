interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
    >
      <span className={`relative w-8 h-[18px] rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-black/20'}`}>
        <span
          className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? 'translate-x-[14px]' : ''}`}
        />
      </span>
      {label && <span className="text-xs text-muted">{label}</span>}
    </button>
  )
}
