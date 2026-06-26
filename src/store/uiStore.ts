import { create } from 'zustand'

type Modal = 'upload-version' | 'invite-member' | 'create-project' | 'create-track' | null

interface UiState {
  activeModal: Modal
  modalContext: Record<string, string>
  toast: { message: string; id: number } | null

  openModal: (modal: Modal, context?: Record<string, string>) => void
  closeModal: () => void
  showToast: (message: string) => void
  clearToast: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  modalContext: {},
  toast: null,

  openModal: (modal, context = {}) => set({ activeModal: modal, modalContext: context }),
  closeModal: () => set({ activeModal: null, modalContext: {} }),
  showToast: (message) => set({ toast: { message, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
}))
