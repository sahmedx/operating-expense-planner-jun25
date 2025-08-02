"use client"

import { useState } from "react"
import { ExpensePlannerHeader } from "@/components/expense-planner-header"
import { ExpensePlannerSidebar } from "@/components/expense-planner-sidebar"
import { ExpensePlannerGridWithProduct } from "@/components/expense-planner-grid-with-product"
import { useExpensePlanner } from "@/components/expense-planner-context"
import { LoadingOverlay } from "@/components/loading-overlay"

export function ExpensePlannerWithProduct() {
  const { isLoading } = useExpensePlanner()
  const [selectedTab, setSelectedTab] = useState("grid")

  return (
    <div className="flex h-screen overflow-hidden">
      <ExpensePlannerSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ExpensePlannerHeader
          title="Operating Expenses (with Product)"
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading ? (
            <LoadingOverlay />
          ) : (
            <div className="grid gap-6">
              <ExpensePlannerGridWithProduct />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
