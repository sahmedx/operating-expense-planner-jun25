"use client"

import { useState, useMemo, useEffect } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import { ExpensePlannerSidebar } from "./expense-planner-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "./multi-select"
import { LoadingOverlay } from "./loading-overlay"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { TooltipProvider } from "@/components/ui/tooltip"
import { VendorBreakdownDialog } from "./vendor-breakdown-dialog"
import { expenseDataService } from "@/lib/expense-data-service"

export function SummaryDashboard() {
  const { expenseData, isLoading, selectedCostCenters, setSelectedCostCenters, year, setYear } = useExpensePlanner()
  const [chartHeight, setChartHeight] = useState(350)
  const [budgetData, setBudgetData] = useState<Record<string, Record<string, number>>>({})
  const [forecastData, setForecastData] = useState<Record<string, Record<string, number>>>({})
  const [loadingVersionData, setLoadingVersionData] = useState(true)

  // Responsive chart height adjustment
  useEffect(() => {
    const handleResize = () => {
      // Adjust chart height based on viewport width
      if (window.innerWidth < 640) {
        setChartHeight(450) // More height on small screens
      } else if (window.innerWidth < 1024) {
        setChartHeight(400) // Medium height on medium screens
      } else {
        setChartHeight(350) // Default height on large screens
      }
    }

    // Set initial height
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Local state for dashboard filters and UI
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Full Year")
  const [selectedGLAccount, setSelectedGLAccount] = useState<string>("All")
  const [showVendorBreakdown, setShowVendorBreakdown] = useState(false)
  const [selectedGLForBreakdown, setSelectedGLForBreakdown] = useState<string | null>(null)

  // Load Budget and Live Forecast data
  useEffect(() => {
    const loadVersionData = async () => {
      try {
        setLoadingVersionData(true)

        // In a real implementation, you would fetch both versions from the database:
        // const budgetExpenses = await expenseDataService.loadExpenseDataForVersion("Budget")
        // const forecastExpenses = await expenseDataService.loadExpenseDataForVersion("Live Forecast")

        // For this implementation, we'll load the data from the database
        let budgetExpenses: Record<string, Record<string, number>> = {}
        let forecastExpenses: Record<string, Record<string, number>> = {}

        try {
          // Try to load from the database
          budgetExpenses = await expenseDataService.loadExpenseDataForVersion("Budget")
          forecastExpenses = await expenseDataService.loadExpenseDataForVersion("Live Forecast")

          console.log("Loaded version data from database")
        } catch (error) {
          console.error("Error loading from database, using sample data", error)

          // If loading from database fails, use the sample data structure
          // This is a fallback to ensure the dashboard works even if data loading fails

          // Create empty data structures
          budgetExpenses = {}
          forecastExpenses = {}

          // For each vendor in the current data
          expenseData.vendors.forEach((vendor) => {
            const vendorId = vendor.id

            // Initialize empty expense objects
            budgetExpenses[vendorId] = {}
            forecastExpenses[vendorId] = {}

            // Copy the expense data for each month (this is just a placeholder)
            // In a real implementation, this would be the actual data from each version
            if (expenseData.expenses[vendorId]) {
              Object.entries(expenseData.expenses[vendorId]).forEach(([month, amount]) => {
                // For demonstration, we'll use the same data but with slight modifications
                // to simulate different versions
                forecastExpenses[vendorId][month] = amount
                budgetExpenses[vendorId][month] = amount * 0.95 // Simulate budget as 5% lower
              })
            }
          })
        }

        setBudgetData(budgetExpenses)
        setForecastData(forecastExpenses)
        setLoadingVersionData(false)
      } catch (error) {
        console.error("Error loading version data:", error)
        setLoadingVersionData(false)
      }
    }

    loadVersionData()
  }, [expenseData.vendors])

  // Cost center options for filter
  const costCenterOptions = [
    { label: "All Cost Centers", value: "All" },
    { label: "Finance", value: "Finance" },
    { label: "HR", value: "HR" },
    { label: "Engineering", value: "Engineering" },
    { label: "Marketing", value: "Marketing" },
    { label: "Sales", value: "Sales" },
  ]

  // Period options
  const periodOptions = [
    "Full Year",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "Jan'25",
    "Feb'25",
    "Mar'25",
    "Apr'25",
    "May'25",
    "Jun'25",
    "Jul'25",
    "Aug'25",
    "Sep'25",
    "Oct'25",
    "Nov'25",
    "Dec'25",
  ]

  // Helper to get months for selected period
  const getMonthsForPeriod = (period: string): string[] => {
    const allMonths = [
      "Jan'25",
      "Feb'25",
      "Mar'25",
      "Apr'25",
      "May'25",
      "Jun'25",
      "Jul'25",
      "Aug'25",
      "Sep'25",
      "Oct'25",
      "Nov'25",
      "Dec'25",
    ]

    switch (period) {
      case "Q1":
        return ["Jan'25", "Feb'25", "Mar'25"]
      case "Q2":
        return ["Apr'25", "May'25", "Jun'25"]
      case "Q3":
        return ["Jul'25", "Aug'25", "Sep'25"]
      case "Q4":
        return ["Oct'25", "Nov'25", "Dec'25"]
      case "Full Year":
        return allMonths
      default:
        return [period] // Individual month
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate summary data for comparison
  const summaryData = useMemo(() => {
    // Get all vendors that match the cost center filter
    const filteredVendorIds = expenseData.vendors
      .filter((vendor) => {
        // Filter by Cost Center
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }

        // Filter by GL Account if specified
        if (selectedGLAccount !== "All" && expenseData.glAccounts[vendor.id] !== selectedGLAccount) {
          return false
        }

        return true
      })
      .map((vendor) => vendor.id)

    // Get months for the selected period
    const months = getMonthsForPeriod(selectedPeriod)

    // Calculate totals for Live Forecast and Budget
    let forecastTotal = 0
    let budgetTotal = 0

    // For each vendor
    filteredVendorIds.forEach((vendorId) => {
      // For each month in the period
      months.forEach((month) => {
        // Get Live Forecast amount from the actual Live Forecast data
        const vendorForecastExpenses = forecastData[vendorId] || {}
        forecastTotal += vendorForecastExpenses[month] || 0

        // Get Budget amount from the actual Budget data
        const vendorBudgetExpenses = budgetData[vendorId] || {}
        budgetTotal += vendorBudgetExpenses[month] || 0
      })
    })

    // Calculate variance
    const variance = forecastTotal - budgetTotal
    const variancePercent = budgetTotal !== 0 ? (variance / budgetTotal) * 100 : 0

    return {
      forecastTotal,
      budgetTotal,
      variance,
      variancePercent,
    }
  }, [
    expenseData.vendors,
    expenseData.glAccounts,
    expenseData.costCenters,
    forecastData,
    budgetData,
    selectedCostCenters,
    selectedPeriod,
    selectedGLAccount,
  ])

  // Calculate GL account breakdown
  const glAccountBreakdown = useMemo(() => {
    // Get all vendors that match the cost center filter
    const filteredVendorIds = expenseData.vendors
      .filter((vendor) => {
        // Filter by Cost Center
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }
        return true
      })
      .map((vendor) => vendor.id)

    // Get months for the selected period
    const months = getMonthsForPeriod(selectedPeriod)

    // Initialize GL account totals
    const glTotals: Record<string, { forecast: number; budget: number }> = {
      Software: { forecast: 0, budget: 0 },
      "Professional Services": { forecast: 0, budget: 0 },
      Travel: { forecast: 0, budget: 0 },
      Facilities: { forecast: 0, budget: 0 },
      Marketing: { forecast: 0, budget: 0 },
      Compensation: { forecast: 0, budget: 0 },
      Other: { forecast: 0, budget: 0 },
    }

    // For each vendor
    filteredVendorIds.forEach((vendorId) => {
      const glAccount = expenseData.glAccounts[vendorId] || "Other"

      // For each month in the period
      months.forEach((month) => {
        // Get Live Forecast amount from the actual Live Forecast data
        const vendorForecastExpenses = forecastData[vendorId] || {}
        glTotals[glAccount].forecast += vendorForecastExpenses[month] || 0

        // Get Budget amount from the actual Budget data
        const vendorBudgetExpenses = budgetData[vendorId] || {}
        glTotals[glAccount].budget += vendorBudgetExpenses[month] || 0
      })
    })

    // Convert to array for charts
    return Object.entries(glTotals)
      .filter(([_, values]) => values.forecast > 0 || values.budget > 0)
      .map(([name, values]) => {
        const variance = values.forecast - values.budget
        // Calculate variance percentage based on budget (not forecast)
        const variancePercent = values.budget !== 0 ? (variance / values.budget) * 100 : 0

        return {
          name,
          forecast: values.forecast,
          budget: values.budget,
          variance,
          variancePercent,
        }
      })
  }, [
    expenseData.vendors,
    expenseData.glAccounts,
    expenseData.costCenters,
    forecastData,
    budgetData,
    selectedCostCenters,
    selectedPeriod,
  ])

  // Handle GL account click for vendor breakdown
  const handleGLAccountClick = (glAccount: string) => {
    setSelectedGLForBreakdown(glAccount)
    setShowVendorBreakdown(true)
  }

  // Get vendors for a specific GL account
  const getVendorsForGLAccount = (glAccount: string) => {
    return expenseData.vendors
      .filter((vendor) => {
        // Filter by Cost Center
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }

        // Filter by GL Account
        return expenseData.glAccounts[vendor.id] === glAccount
      })
      .map((vendor) => {
        const months = getMonthsForPeriod(selectedPeriod)
        let forecastTotal = 0
        let budgetTotal = 0

        // Calculate totals for this vendor
        months.forEach((month) => {
          // Get Live Forecast amount from the actual Live Forecast data
          const vendorForecastExpenses = forecastData[vendor.id] || {}
          forecastTotal += vendorForecastExpenses[month] || 0

          // Get Budget amount from the actual Budget data
          const vendorBudgetExpenses = budgetData[vendor.id] || {}
          budgetTotal += vendorBudgetExpenses[month] || 0
        })

        const variance = forecastTotal - budgetTotal
        // Calculate variance percentage based on budget
        const variancePercent = budgetTotal !== 0 ? (variance / budgetTotal) * 100 : 0

        return {
          id: vendor.id,
          name: vendor.name,
          forecast: forecastTotal,
          budget: budgetTotal,
          variance,
          variancePercent,
        }
      })
      .sort((a, b) => b.forecast - a.forecast) // Sort by forecast amount descending
  }

  // Colors for charts
  const COLORS = {
    forecast: "hsl(215, 100%, 50%)",
    budget: "hsl(142, 76%, 36%)",
    positive: "hsl(142, 76%, 36%)",
    negative: "hsl(0, 84%, 60%)",
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <ExpensePlannerSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <LoadingOverlay isLoading={isLoading || loadingVersionData} message="Loading data..." />

          {/* Dashboard Header */}
          <div className="border-b bg-background">
            <div className="flex flex-col md:flex-row h-auto md:h-16 items-start md:items-center justify-between p-4">
              <h1 className="text-lg md:text-xl font-semibold mb-2 md:mb-0">Forecast vs Budget Summary</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between border-t px-4 py-3 overflow-x-auto">
              <div className="flex flex-wrap gap-4 w-full">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Year:</span>
                  <Select value={year.toString()} onValueChange={(v) => setYear(Number.parseInt(v))}>
                    <SelectTrigger className="h-8 w-[100px] text-sm">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">FY 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Period:</span>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="h-8 w-[150px] text-sm">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Year">Full Year</SelectItem>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                      <SelectItem value="Jan'25">Jan'25</SelectItem>
                      <SelectItem value="Feb'25">Feb'25</SelectItem>
                      <SelectItem value="Mar'25">Mar'25</SelectItem>
                      <SelectItem value="Apr'25">Apr'25</SelectItem>
                      <SelectItem value="May'25">May'25</SelectItem>
                      <SelectItem value="Jun'25">Jun'25</SelectItem>
                      <SelectItem value="Jul'25">Jul'25</SelectItem>
                      <SelectItem value="Aug'25">Aug'25</SelectItem>
                      <SelectItem value="Sep'25">Sep'25</SelectItem>
                      <SelectItem value="Oct'25">Oct'25</SelectItem>
                      <SelectItem value="Nov'25">Nov'25</SelectItem>
                      <SelectItem value="Dec'25">Dec'25</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">GL Account:</span>
                  <Select value={selectedGLAccount} onValueChange={setSelectedGLAccount}>
                    <SelectTrigger className="h-8 w-[180px] text-sm">
                      <SelectValue placeholder="GL Account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Accounts</SelectItem>
                      <SelectItem value="Compensation">Compensation</SelectItem>
                      <SelectItem value="Professional Services">Professional Services</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Facilities">Facilities</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Cost Center:</span>
                  <MultiSelect
                    options={costCenterOptions}
                    selected={selectedCostCenters}
                    onChange={setSelectedCostCenters}
                    className="h-8 w-[200px] text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-auto p-4">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Live Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.forecastTotal)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For {selectedPeriod},{" "}
                    {selectedCostCenters.includes("All") ? "All Cost Centers" : selectedCostCenters.join(", ")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.budgetTotal)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For {selectedPeriod},{" "}
                    {selectedCostCenters.includes("All") ? "All Cost Centers" : selectedCostCenters.join(", ")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Variance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div
                      className={`text-2xl font-bold ${summaryData.variance < 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(summaryData.variance)}
                    </div>
                    <div
                      className={`ml-2 flex items-center ${summaryData.variance < 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {summaryData.variance < 0 ? (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      )}
                      <span className="text-sm">{Math.abs(summaryData.variancePercent).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryData.variance < 0 ? "Under budget" : "Over budget"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* GL Account Variance Table */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">GL Account Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">GL Account</th>
                        <th className="text-right py-2 px-4 font-medium">Live Forecast</th>
                        <th className="text-right py-2 px-4 font-medium">Budget</th>
                        <th className="text-right py-2 px-4 font-medium">Variance</th>
                        <th className="text-right py-2 px-4 font-medium">Variance %</th>
                        <th className="text-center py-2 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {glAccountBreakdown.map((item) => (
                        <tr key={item.name} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{item.name}</td>
                          <td className="text-right py-2 px-4">{formatCurrency(item.forecast)}</td>
                          <td className="text-right py-2 px-4">{formatCurrency(item.budget)}</td>
                          <td
                            className={`text-right py-2 px-4 ${item.variance < 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(item.variance)}
                          </td>
                          <td
                            className={`text-right py-2 px-4 ${item.variance < 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {item.variancePercent.toFixed(1)}%
                          </td>
                          <td className="text-center py-2 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGLAccountClick(item.name)}
                              className="hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              View Vendors
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Chart - Now Horizontal */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Forecast vs Budget by GL Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`h-[${chartHeight}px] mb-8`}>
                  <ChartContainer
                    config={{
                      forecast: {
                        label: "Live Forecast",
                        color: COLORS.forecast,
                      },
                      budget: {
                        label: "Budget",
                        color: COLORS.budget,
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <RechartsBarChart
                        data={glAccountBreakdown}
                        layout="vertical" // Changed to horizontal layout
                        margin={{ top: 20, right: 30, left: 120, bottom: 20 }} // Adjusted margins
                        barGap={10}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number" // Changed for horizontal chart
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <YAxis
                          type="category" // Changed for horizontal chart
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          width={110} // Give more space for labels
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value)]}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="forecast"
                          fill={COLORS.forecast}
                          name="Live Forecast"
                          radius={[0, 4, 4, 0]} // Adjusted for horizontal bars
                          cursor="pointer"
                          onClick={(data) => handleGLAccountClick(data.name)}
                        />
                        <Bar
                          dataKey="budget"
                          fill={COLORS.budget}
                          name="Budget"
                          radius={[0, 4, 4, 0]} // Adjusted for horizontal bars
                          cursor="pointer"
                          onClick={(data) => handleGLAccountClick(data.name)}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <div className="text-center text-xs text-muted-foreground mt-2">
                    Click on any GL account to see vendor breakdown
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vendor Breakdown Dialog */}
        {selectedGLForBreakdown && (
          <VendorBreakdownDialog
            open={showVendorBreakdown}
            onOpenChange={setShowVendorBreakdown}
            glAccount={selectedGLForBreakdown}
            vendors={getVendorsForGLAccount(selectedGLForBreakdown)}
            period={selectedPeriod}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
