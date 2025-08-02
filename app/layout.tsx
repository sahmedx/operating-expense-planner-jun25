import type React from "react"
import type { Metadata } from "next"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "Operating Expense Planner",
  description: "A tool for planning and forecasting operating expenses",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
