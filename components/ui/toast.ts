"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps,
  type ToastActionElement,
} from "@/components/ui/toast/toast"

export {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps,
  type ToastActionElement,
}

// Simple toast function
export function toast(props: ToastProps) {
  // This is a placeholder - in a real app, you'd use a toast library or context
  console.log("Toast:", props)
}
