"use client"

import { useState, useEffect } from "react"
import { ExpensePlannerHeader } from "./expense-planner-header"
import { ExpensePlannerSidebar } from "./expense-planner-sidebar"
import { ExpensePlannerGrid } from "./expense-planner-grid"
import { ExpensePlannerSummary, type ChartType } from "./expense-planner-summary"
import { ExpensePlannerDetails } from "./expense-planner-details"
import { ChartDetailsSidebar } from "./chart-details-sidebar"
import { ExpensePlannerProvider, useExpensePlanner } from "./expense-planner-context"
import { LoadingOverlay } from "./loading-overlay"

function ExpensePlannerContent() {
  const [showDetails, setShowDetails] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null)
  const [showChartDetails, setShowChartDetails] = useState(false)
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const { isLoading, isSaving } = useExpensePlanner()

  // Listen for chart click events
  useEffect(() => {
    const handleChartClick = (event: CustomEvent) => {
      const { chartType, data } = event.detail
      setSelectedChart(chartType)
      setChartData(data)
      setShowChartDetails(true)
      // Close vendor details if open
      setShowDetails(false)
    }

    window.addEventListener("showChartDetails", handleChartClick as EventListener)

    return () => {
      window.removeEventListener("showChartDetails", handleChartClick as EventListener)
    }
  }, [])

  return (
    <>
      <LoadingOverlay isLoading={isLoading} message="Loading expense data..." />
      <LoadingOverlay isLoading={isSaving} message="Saving expense data..." />
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <ExpensePlannerSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <ExpensePlannerHeader />
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <ExpensePlannerSummary />
              <div className="flex-1 overflow-auto p-4">
                <ExpensePlannerGrid
                  onSelectVendor={(vendor) => {
                    setSelectedVendor(vendor)
                    setShowDetails(true)
                    // Close chart details if open
                    setShowChartDetails(false)
                  }}
                />
              </div>
            </div>
            {showDetails && (
              <div className="border-l bg-background w-full max-w-[320px] md:max-w-[350px] flex-shrink-0 overflow-hidden">
                <ExpensePlannerDetails vendor={selectedVendor} onClose={() => setShowDetails(false)} />
              </div>
            )}
            {showChartDetails && selectedChart && (
              <div className="border-l bg-background w-full max-w-[320px] md:max-w-[350px] flex-shrink-0 overflow-hidden">
                <ChartDetailsSidebar
                  chartType={selectedChart}
                  data={chartData}
                  onClose={() => setShowChartDetails(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function ExpensePlannerDashboard() {
  return (
    <ExpensePlannerProvider>
      <ExpensePlannerContent />
    </ExpensePlannerProvider>
  )
}
