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

const CLOSED_MONTHS = ["Jan'25", "Feb'25", "Mar'25"]
const OPEN_MONTHS = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25"]

export function SummaryDashboard() {
  const { expenseData, isLoading, selectedCostCenters, setSelectedCostCenters, year, setYear } = useExpensePlanner()
  const [chartHeight, setChartHeight] = useState(350)
  const [budgetData, setBudgetData] = useState<Record<string, Record<string, number>>>({})
  const [forecastData, setForecastData] = useState<Record<string, Record<string, number>>>({})
  const [actualsData, setActualsData] = useState<Record<string, Record<string, number>>>({})
  const [loadingVersionData, setLoadingVersionData] = useState(true)
  const [tableTab, setTableTab] = useState<"forecast" | "fye">("forecast")

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setChartHeight(450)
      } else if (window.innerWidth < 1024) {
        setChartHeight(400)
      } else {
        setChartHeight(350)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const [selectedPeriod, setSelectedPeriod] = useState<string>("Full Year")
  const [selectedGLAccount, setSelectedGLAccount] = useState<string>("All")
  const [showVendorBreakdown, setShowVendorBreakdown] = useState(false)
  const [selectedGLForBreakdown, setSelectedGLForBreakdown] = useState<string | null>(null)

  useEffect(() => {
    const loadVersionData = async () => {
      try {
        setLoadingVersionData(true)

        let budgetExpenses: Record<string, Record<string, number>> = {}
        let forecastExpenses: Record<string, Record<string, number>> = {}
        let actualsExpenses: Record<string, Record<string, number>> = {}

        try {
          ;[budgetExpenses, forecastExpenses, actualsExpenses] = await Promise.all([
            expenseDataService.loadExpenseDataForVersion("Budget"),
            expenseDataService.loadExpenseDataForVersion("Live Forecast"),
            expenseDataService.loadExpenseDataForVersion("Actuals"),
          ])
        } catch (error) {
          console.error("Error loading from database, using sample data", error)

          expenseData.vendors.forEach((vendor) => {
            const vendorId = vendor.id
            budgetExpenses[vendorId] = {}
            forecastExpenses[vendorId] = {}
            actualsExpenses[vendorId] = {}

            if (expenseData.expenses[vendorId]) {
              Object.entries(expenseData.expenses[vendorId]).forEach(([month, amount]) => {
                forecastExpenses[vendorId][month] = amount
                budgetExpenses[vendorId][month] = amount * 0.95
                if (CLOSED_MONTHS.includes(month)) {
                  actualsExpenses[vendorId][month] = amount * 0.98
                }
              })
            }
          })
        }

        setBudgetData(budgetExpenses)
        setForecastData(forecastExpenses)
        setActualsData(actualsExpenses)
        setLoadingVersionData(false)
      } catch (error) {
        console.error("Error loading version data:", error)
        setLoadingVersionData(false)
      }
    }

    loadVersionData()
  }, [expenseData.vendors])

  const costCenterOptions = [
    { label: "All Cost Centers", value: "All" },
    { label: "Finance", value: "Finance" },
    { label: "HR", value: "HR" },
    { label: "Engineering", value: "Engineering" },
    { label: "Marketing", value: "Marketing" },
    { label: "Sales", value: "Sales" },
  ]

  const getMonthsForPeriod = (period: string): string[] => {
    const allMonths = [
      "Jan'25", "Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25",
      "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25",
    ]
    switch (period) {
      case "Q1": return ["Jan'25", "Feb'25", "Mar'25"]
      case "Q2": return ["Apr'25", "May'25", "Jun'25"]
      case "Q3": return ["Jul'25", "Aug'25", "Sep'25"]
      case "Q4": return ["Oct'25", "Nov'25", "Dec'25"]
      case "Full Year": return allMonths
      default: return [period]
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const summaryData = useMemo(() => {
    const filteredVendorIds = expenseData.vendors
      .filter((vendor) => {
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }
        if (selectedGLAccount !== "All" && expenseData.glAccounts[vendor.id] !== selectedGLAccount) {
          return false
        }
        return true
      })
      .map((vendor) => vendor.id)

    const months = getMonthsForPeriod(selectedPeriod)

    let forecastTotal = 0
    let budgetTotal = 0
    let fyeTotal = 0

    filteredVendorIds.forEach((vendorId) => {
      months.forEach((month) => {
        forecastTotal += (forecastData[vendorId] || {})[month] || 0
        budgetTotal += (budgetData[vendorId] || {})[month] || 0
        const fyeSource = CLOSED_MONTHS.includes(month) ? actualsData : forecastData
        fyeTotal += (fyeSource[vendorId] || {})[month] || 0
      })
    })

    const variance = forecastTotal - budgetTotal
    const variancePercent = budgetTotal !== 0 ? (variance / budgetTotal) * 100 : 0
    const fyeVsBudgetVariance = fyeTotal - budgetTotal
    const fyeVsBudgetVariancePercent = budgetTotal !== 0 ? (fyeVsBudgetVariance / budgetTotal) * 100 : 0

    return {
      forecastTotal,
      budgetTotal,
      variance,
      variancePercent,
      fyeTotal,
      fyeVsBudgetVariance,
      fyeVsBudgetVariancePercent,
    }
  }, [
    expenseData.vendors,
    expenseData.glAccounts,
    expenseData.costCenters,
    forecastData,
    budgetData,
    actualsData,
    selectedCostCenters,
    selectedPeriod,
    selectedGLAccount,
  ])

  const glAccountBreakdown = useMemo(() => {
    const filteredVendorIds = expenseData.vendors
      .filter((vendor) => {
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }
        return true
      })
      .map((vendor) => vendor.id)

    const months = getMonthsForPeriod(selectedPeriod)

    const glTotals: Record<string, { forecast: number; budget: number; fye: number }> = {
      Software: { forecast: 0, budget: 0, fye: 0 },
      "Professional Services": { forecast: 0, budget: 0, fye: 0 },
      Travel: { forecast: 0, budget: 0, fye: 0 },
      Facilities: { forecast: 0, budget: 0, fye: 0 },
      Marketing: { forecast: 0, budget: 0, fye: 0 },
      Compensation: { forecast: 0, budget: 0, fye: 0 },
      Other: { forecast: 0, budget: 0, fye: 0 },
    }

    filteredVendorIds.forEach((vendorId) => {
      const glAccount = expenseData.glAccounts[vendorId] || "Other"
      months.forEach((month) => {
        glTotals[glAccount].forecast += (forecastData[vendorId] || {})[month] || 0
        glTotals[glAccount].budget += (budgetData[vendorId] || {})[month] || 0
        const fyeSource = CLOSED_MONTHS.includes(month) ? actualsData : forecastData
        glTotals[glAccount].fye += (fyeSource[vendorId] || {})[month] || 0
      })
    })

    return Object.entries(glTotals)
      .filter(([_, values]) => values.forecast > 0 || values.budget > 0 || values.fye > 0)
      .map(([name, values]) => {
        const variance = values.forecast - values.budget
        const variancePercent = values.budget !== 0 ? (variance / values.budget) * 100 : 0
        const fyeVariance = values.fye - values.budget
        const fyeVariancePercent = values.budget !== 0 ? (fyeVariance / values.budget) * 100 : 0

        return {
          name,
          forecast: values.forecast,
          budget: values.budget,
          variance,
          variancePercent,
          fye: values.fye,
          fyeVariance,
          fyeVariancePercent,
        }
      })
  }, [
    expenseData.vendors,
    expenseData.glAccounts,
    expenseData.costCenters,
    forecastData,
    budgetData,
    actualsData,
    selectedCostCenters,
    selectedPeriod,
  ])

  const handleGLAccountClick = (glAccount: string) => {
    setSelectedGLForBreakdown(glAccount)
    setShowVendorBreakdown(true)
  }

  const getVendorsForGLAccount = (glAccount: string, mode: "forecast" | "fye" = "forecast") => {
    return expenseData.vendors
      .filter((vendor) => {
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }
        return expenseData.glAccounts[vendor.id] === glAccount
      })
      .map((vendor) => {
        const months = getMonthsForPeriod(selectedPeriod)
        let forecastTotal = 0
        let budgetTotal = 0
        let fyeTotal = 0
        const fyeMonthDetail: { month: string; amount: number; source: "Actuals" | "Forecast" }[] = []

        months.forEach((month) => {
          forecastTotal += (forecastData[vendor.id] || {})[month] || 0
          budgetTotal += (budgetData[vendor.id] || {})[month] || 0
          const isClosed = CLOSED_MONTHS.includes(month)
          const fyeSource = isClosed ? actualsData : forecastData
          const fyeAmount = (fyeSource[vendor.id] || {})[month] || 0
          fyeTotal += fyeAmount
          fyeMonthDetail.push({ month, amount: fyeAmount, source: isClosed ? "Actuals" : "Forecast" })
        })

        const variance = forecastTotal - budgetTotal
        const variancePercent = budgetTotal !== 0 ? (variance / budgetTotal) * 100 : 0
        const fyeVariance = fyeTotal - budgetTotal
        const fyeVariancePercent = budgetTotal !== 0 ? (fyeVariance / budgetTotal) * 100 : 0

        return {
          id: vendor.id,
          name: vendor.name,
          forecast: forecastTotal,
          budget: budgetTotal,
          variance,
          variancePercent,
          fye: fyeTotal,
          fyeVariance,
          fyeVariancePercent,
          fyeMonthDetail,
        }
      })
      .sort((a, b) => b.forecast - a.forecast)
  }

  const COLORS = {
    forecast: "hsl(215, 100%, 50%)",
    fye: "hsl(271, 91%, 65%)",
    budget: "hsl(142, 76%, 36%)",
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
            {/* Summary Cards — 4 columns */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
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
                  <CardTitle className="text-sm font-medium">Variance (F vs B)</CardTitle>
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Full Year Estimate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.fyeTotal)}</div>
                  <div
                    className={`flex items-center mt-1 text-xs font-medium ${summaryData.fyeVsBudgetVariance < 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {summaryData.fyeVsBudgetVariance < 0 ? (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    )}
                    {formatCurrency(Math.abs(summaryData.fyeVsBudgetVariance))} vs Budget
                    <span className="ml-1">
                      ({Math.abs(summaryData.fyeVsBudgetVariancePercent).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Actuals (Jan–Mar) + Forecast (Apr–Dec)</p>
                </CardContent>
              </Card>
            </div>

            {/* GL Account Variance Table */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">GL Account Variance Analysis</CardTitle>
                  <div className="flex gap-1 rounded-md border p-1">
                    <button
                      onClick={() => setTableTab("forecast")}
                      className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                        tableTab === "forecast"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Forecast vs Budget
                    </button>
                    <button
                      onClick={() => setTableTab("fye")}
                      className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                        tableTab === "fye"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      FYE vs Budget
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">GL Account</th>
                        <th className="text-right py-2 px-4 font-medium">
                          {tableTab === "forecast" ? "Live Forecast" : "Full Year Estimate"}
                        </th>
                        <th className="text-right py-2 px-4 font-medium">Budget</th>
                        <th className="text-right py-2 px-4 font-medium">Variance</th>
                        <th className="text-right py-2 px-4 font-medium">Variance %</th>
                        <th className="text-center py-2 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {glAccountBreakdown.map((item) => {
                        const displayAmount = tableTab === "forecast" ? item.forecast : item.fye
                        const displayVariance = tableTab === "forecast" ? item.variance : item.fyeVariance
                        const displayVariancePct = tableTab === "forecast" ? item.variancePercent : item.fyeVariancePercent

                        return (
                          <tr key={item.name} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{item.name}</td>
                            <td className="text-right py-2 px-4">{formatCurrency(displayAmount)}</td>
                            <td className="text-right py-2 px-4">{formatCurrency(item.budget)}</td>
                            <td
                              className={`text-right py-2 px-4 ${displayVariance < 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatCurrency(displayVariance)}
                            </td>
                            <td
                              className={`text-right py-2 px-4 ${displayVariance < 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {displayVariancePct.toFixed(1)}%
                            </td>
                            <td className="text-center py-2 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGLAccountClick(item.name)}
                                className="hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                {tableTab === "fye" ? "View Vendors (FYE)" : "View Vendors"}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Chart */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {tableTab === "forecast"
                    ? "Forecast vs Budget by GL Account"
                    : "FYE vs Budget by GL Account"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`h-[${chartHeight}px] mb-8`}>
                  <ChartContainer
                    config={
                      tableTab === "forecast"
                        ? {
                            forecast: { label: "Live Forecast", color: COLORS.forecast },
                            budget: { label: "Budget", color: COLORS.budget },
                          }
                        : {
                            fye: { label: "Full Year Estimate", color: COLORS.fye },
                            budget: { label: "Budget", color: COLORS.budget },
                          }
                    }
                  >
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <RechartsBarChart
                        data={glAccountBreakdown}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                        barGap={10}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          width={110}
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
                        {tableTab === "forecast" ? (
                          <Bar
                            dataKey="forecast"
                            fill={COLORS.forecast}
                            name="Live Forecast"
                            radius={[0, 4, 4, 0]}
                            cursor="pointer"
                            onClick={(data) => handleGLAccountClick(data.name)}
                          />
                        ) : (
                          <Bar
                            dataKey="fye"
                            fill={COLORS.fye}
                            name="Full Year Estimate"
                            radius={[0, 4, 4, 0]}
                            cursor="pointer"
                            onClick={(data) => handleGLAccountClick(data.name)}
                          />
                        )}
                        <Bar
                          dataKey="budget"
                          fill={COLORS.budget}
                          name="Budget"
                          radius={[0, 4, 4, 0]}
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

        {selectedGLForBreakdown && (
          <VendorBreakdownDialog
            open={showVendorBreakdown}
            onOpenChange={setShowVendorBreakdown}
            glAccount={selectedGLForBreakdown}
            vendors={getVendorsForGLAccount(selectedGLForBreakdown, tableTab)}
            period={selectedPeriod}
            mode={tableTab}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
