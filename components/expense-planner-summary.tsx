"use client"

import { useState, useMemo } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, AlertCircle } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"

// Define chart types for sidebar display
export type ChartType = "total" | "software" | "services" | "travel" | "facilities"

export function ExpensePlannerSummary() {
  const {
    expenseData,
    timeGranularity,
    setTimeGranularity,
    isClosedPeriod,
    version,
    glAccount,
    selectedCostCenters,
    year,
  } = useExpensePlanner()
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(null)

  // Helper function to generate month names based on year
  const getMonthsForYear = (year: number) => {
    return [
      `Jan'${year.toString().slice(-2)}`,
      `Feb'${year.toString().slice(-2)}`,
      `Mar'${year.toString().slice(-2)}`,
      `Apr'${year.toString().slice(-2)}`,
      `May'${year.toString().slice(-2)}`,
      `Jun'${year.toString().slice(-2)}`,
      `Jul'${year.toString().slice(-2)}`,
      `Aug'${year.toString().slice(-2)}`,
      `Sep'${year.toString().slice(-2)}`,
      `Oct'${year.toString().slice(-2)}`,
      `Nov'${year.toString().slice(-2)}`,
      `Dec'${year.toString().slice(-2)}`,
    ]
  }

  // Helper function to get quarters based on year
  const getQuartersForYear = (year: number) => {
    return [
      `Q1'${year.toString().slice(-2)}`,
      `Q2'${year.toString().slice(-2)}`,
      `Q3'${year.toString().slice(-2)}`,
      `Q4'${year.toString().slice(-2)}`,
    ]
  }

  // Helper function to get months in each quarter based on year
  const getMonthsInQuarter = (year: number) => {
    const yearSuffix = year.toString().slice(-2)
    return [
      [`Jan'${yearSuffix}`, `Feb'${yearSuffix}`, `Mar'${yearSuffix}`],
      [`Apr'${yearSuffix}`, `May'${yearSuffix}`, `Jun'${yearSuffix}`],
      [`Jul'${yearSuffix}`, `Aug'${yearSuffix}`, `Sep'${yearSuffix}`],
      [`Oct'${yearSuffix}`, `Nov'${yearSuffix}`, `Dec'${yearSuffix}`],
    ]
  }

  // Filter vendors based on selected filters
  const filteredVendorIds = useMemo(() => {
    return expenseData.vendors
      .filter((vendor) => {
        // Filter by GL Account
        if (glAccount !== "All" && expenseData.glAccounts[vendor.id] !== glAccount) {
          return false
        }

        // Filter by Cost Center
        if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(expenseData.costCenters[vendor.id])) {
          return false
        }

        return true
      })
      .map((vendor) => vendor.id)
  }, [expenseData.vendors, expenseData.glAccounts, expenseData.costCenters, glAccount, selectedCostCenters])

  // Calculate summary data with all filters applied
  const calculateMonthlySummary = useMemo(() => {
    const months = getMonthsForYear(year)

    return months.map((month) => {
      let total = 0
      let softwareTotal = 0
      let servicesTotal = 0
      let travelTotal = 0
      let facilitiesTotal = 0

      // Only process vendors that pass the filters
      filteredVendorIds.forEach((vendorId) => {
        const amount = expenseData.expenses[vendorId]?.[month] || 0
        total += amount

        const category = expenseData.glAccounts[vendorId]
        if (category === "Software") softwareTotal += amount
        else if (category === "Professional Services") servicesTotal += amount
        else if (category === "Travel") travelTotal += amount
        else if (category === "Facilities") facilitiesTotal += amount
      })

      return {
        name: month,
        total,
        software: softwareTotal,
        services: servicesTotal,
        travel: travelTotal,
        facilities: facilitiesTotal,
      }
    })
  }, [expenseData.expenses, expenseData.glAccounts, filteredVendorIds, year])

  // Calculate quarterly summary with all filters applied
  const calculateQuarterlySummary = useMemo(() => {
    const quarters = getQuartersForYear(year)
    const monthsInQuarter = getMonthsInQuarter(year)

    return quarters.map((quarter, idx) => {
      let total = 0
      let softwareTotal = 0
      let servicesTotal = 0
      let travelTotal = 0
      let facilitiesTotal = 0

      monthsInQuarter[idx].forEach((month) => {
        // Only process vendors that pass the filters
        filteredVendorIds.forEach((vendorId) => {
          const amount = expenseData.expenses[vendorId]?.[month] || 0
          total += amount

          const category = expenseData.glAccounts[vendorId]
          if (category === "Software") softwareTotal += amount
          else if (category === "Professional Services") servicesTotal += amount
          else if (category === "Travel") travelTotal += amount
          else if (category === "Facilities") facilitiesTotal += amount
        })
      })

      return {
        name: quarter,
        total,
        software: softwareTotal,
        services: servicesTotal,
        travel: travelTotal,
        facilities: facilitiesTotal,
      }
    })
  }, [expenseData.expenses, expenseData.glAccounts, filteredVendorIds, year])

  // Get the appropriate summary data based on time granularity
  const summaryData = useMemo(() => {
    return timeGranularity === "Monthly" ? calculateMonthlySummary : calculateQuarterlySummary
  }, [timeGranularity, calculateMonthlySummary, calculateQuarterlySummary])

  // Check if there's any data to display
  const hasData = useMemo(() => {
    return summaryData.some((item) => item.total > 0)
  }, [summaryData])

  // Calculate total by GL account
  const calculateGLSummary = useMemo(() => {
    const glCategories: Record<string, number> = {}

    filteredVendorIds.forEach((vendorId) => {
      const category = expenseData.glAccounts[vendorId]
      if (!glCategories[category]) glCategories[category] = 0

      // Get months based on year
      const months = getMonthsForYear(year)

      months.forEach((month) => {
        glCategories[category] += expenseData.expenses[vendorId]?.[month] || 0
      })
    })

    return Object.entries(glCategories).map(([name, value]) => ({ name, value }))
  }, [expenseData.glAccounts, expenseData.expenses, filteredVendorIds, year])

  // Calculate total by vendor (top 5)
  const calculateVendorSummary = useMemo(() => {
    const vendorTotals: Record<string, { id: string; name: string; total: number }> = {}

    filteredVendorIds.forEach((vendorId) => {
      const vendor = expenseData.vendors.find((v) => v.id === vendorId)
      if (!vendor) return

      vendorTotals[vendorId] = {
        id: vendorId,
        name: vendor.name,
        total: 0,
      }

      // Get months based on year
      const months = getMonthsForYear(year)

      months.forEach((month) => {
        vendorTotals[vendorId].total += expenseData.expenses[vendorId]?.[month] || 0
      })
    })

    return Object.values(vendorTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [expenseData.vendors, expenseData.expenses, filteredVendorIds, year])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Handle chart click to show details in sidebar
  const handleChartClick = (chartType: ChartType) => {
    // Toggle the chart selection
    setSelectedChart(selectedChart === chartType ? null : chartType)

    // If a chart is selected, notify the parent component to show the sidebar
    if (selectedChart !== chartType) {
      // We'll implement this in the parent component
      window.dispatchEvent(
        new CustomEvent("showChartDetails", {
          detail: {
            chartType,
            data: timeGranularity === "Monthly" ? calculateMonthlySummary : calculateQuarterlySummary,
          },
        }),
      )
    }
  }

  // Define chart colors
  const chartColors = {
    total: "hsl(var(--primary))",
    software: "hsl(var(--chart-1))",
    services: "hsl(var(--chart-2))",
    travel: "hsl(var(--chart-3))",
    facilities: "hsl(var(--chart-4))",
  }

  // Create filter description for empty state
  const getFilterDescription = () => {
    const filters = []

    if (glAccount !== "All") {
      filters.push(`GL Account: ${glAccount}`)
    }

    if (!selectedCostCenters.includes("All")) {
      filters.push(`Cost Centers: ${selectedCostCenters.join(", ")}`)
    }

    filters.push(`Year: ${year}`)
    filters.push(`Version: ${version}`)

    return filters.join(", ")
  }

  return (
    <div className="border-b bg-muted/20 p-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg font-semibold">Summary</h2>
        <Tabs defaultValue={timeGranularity} onValueChange={(v) => setTimeGranularity(v as any)} className="h-8">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="Monthly" className="text-xs flex-1 sm:flex-none">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="Quarterly" className="text-xs flex-1 sm:flex-none">
              Quarterly
            </TabsTrigger>
            <TabsTrigger value="Annual" className="text-xs flex-1 sm:flex-none">
              Annual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!hasData ? (
        <div className="bg-muted/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">No data available</h3>
          <p className="text-sm text-muted-foreground mb-4">There is no expense data matching your current filters.</p>
          <p className="text-xs text-muted-foreground">Current filters: {getFilterDescription()}</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedChart === "total" ? "ring-2 ring-primary" : ""}`}
            onClick={() => handleChartClick("total")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateMonthlySummary.reduce((acc, month) => acc + month.total, 0))}
              </div>
              <div className="h-[80px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summaryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.total} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={chartColors.total} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} hide />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Total"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={chartColors.total}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedChart === "software" ? "ring-2 ring-primary" : ""}`}
            onClick={() => handleChartClick("software")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Software</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateMonthlySummary.reduce((acc, month) => acc + month.software, 0))}
              </div>
              <div className="h-[80px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summaryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSoftware" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.software} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={chartColors.software} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} hide />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Software"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="software"
                      stroke={chartColors.software}
                      fillOpacity={1}
                      fill="url(#colorSoftware)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedChart === "services" ? "ring-2 ring-primary" : ""}`}
            onClick={() => handleChartClick("services")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Professional Services</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateMonthlySummary.reduce((acc, month) => acc + month.services, 0))}
              </div>
              <div className="h-[80px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summaryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorServices" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.services} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={chartColors.services} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} hide />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Professional Services"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="services"
                      stroke={chartColors.services}
                      fillOpacity={1}
                      fill="url(#colorServices)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedChart === "travel" ? "ring-2 ring-primary" : ""}`}
            onClick={() => handleChartClick("travel")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Travel</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateMonthlySummary.reduce((acc, month) => acc + month.travel, 0))}
              </div>
              <div className="h-[80px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summaryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTravel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.travel} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={chartColors.travel} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} hide />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Travel"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="travel"
                      stroke={chartColors.travel}
                      fillOpacity={1}
                      fill="url(#colorTravel)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
