import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'

export function Toast() {
  const toast = useUiStore((s) => s.toast)
  const clearToast = useUiStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 4000)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-surface-3 border border-white/10 text-sm text-white shadow-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
