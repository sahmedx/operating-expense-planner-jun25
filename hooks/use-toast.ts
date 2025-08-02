"use client"

import { useState } from "react"
import type { ToastProps } from "@/components/ui/toast/toast"

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  function toast(props: ToastProps) {
    setToasts((prev) => [...prev, props])

    // Auto-dismiss after duration
    if (props.duration !== Number.POSITIVE_INFINITY) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t !== props))
      }, props.duration || 5000)
    }
  }

  function dismiss(toastId?: string) {
    setToasts((prev) => (toastId ? prev.filter((t) => t.id !== toastId) : []))
  }

  return {
    toast,
    dismiss,
    toasts,
  }
}
