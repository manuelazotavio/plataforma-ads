'use client'

import { useCallback, useState } from 'react'

type DialogOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

type DialogState = DialogOptions & {
  type: 'alert' | 'confirm'
  resolve: (value: boolean) => void
}

export function useAppDialog() {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const close = useCallback((value: boolean) => {
    setDialog((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  const confirm = useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        type: 'confirm',
        title: options.title ?? 'Confirmar ação',
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        tone: options.tone ?? 'danger',
        message: options.message,
        resolve,
      })
    })
  }, [])

  const alert = useCallback((options: DialogOptions | string) => {
    const normalized = typeof options === 'string' ? { message: options } : options

    return new Promise<void>((resolve) => {
      setDialog({
        type: 'alert',
        title: normalized.title ?? 'Aviso',
        confirmLabel: normalized.confirmLabel ?? 'Entendi',
        tone: normalized.tone ?? 'default',
        message: normalized.message,
        resolve: () => resolve(),
      })
    })
  }, [])

  const dialogNode = dialog ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={() => close(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{dialog.title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{dialog.message}</p>

        <div className="mt-5 flex justify-end gap-2">
          {dialog.type === 'confirm' && (
            <button
              type="button"
              onClick={() => close(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {dialog.cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => close(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
              dialog.tone === 'danger' ? 'bg-red-600' : 'bg-[#2F9E41]'
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, alert, dialogNode }
}
