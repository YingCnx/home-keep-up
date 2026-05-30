'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }
interface ConfirmOptions { title: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean }
interface ConfirmState extends ConfirmOptions { resolve: (v: boolean) => void }

interface FeedbackContextValue {
  toast: (message: string, type?: ToastType) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider')
  return ctx
}

const toastStyle: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-green-600', icon: '✓' },
  error: { bg: 'bg-red-500', icon: '✕' },
  info: { bg: 'bg-slate-800', icon: 'i' },
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => setConfirmState({ ...opts, resolve }))
  }, [])

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] px-4 pt-14 pointer-events-none flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`${toastStyle[t.type].bg} text-white rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 animate-toast-in pointer-events-auto`}>
            <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold flex-shrink-0">{toastStyle[t.type].icon}</span>
            <p className="font-medium text-sm flex-1">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-[110]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-dialog-in">
            <h3 className="text-slate-800 font-bold text-lg mb-1.5">{confirmState.title}</h3>
            {confirmState.message && <p className="text-slate-500 text-sm mb-5">{confirmState.message}</p>}
            <div className={`flex gap-2 ${confirmState.message ? '' : 'mt-5'}`}>
              <button onClick={() => closeConfirm(false)}
                className="flex-1 py-3.5 text-slate-500 font-bold text-sm rounded-2xl active:bg-slate-50 transition-all">
                {confirmState.cancelText || 'ยกเลิก'}
              </button>
              <button onClick={() => closeConfirm(true)}
                className={`flex-1 py-3.5 text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all ${confirmState.danger ? 'bg-red-500' : 'bg-[#1B2F5E]'}`}>
                {confirmState.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}
