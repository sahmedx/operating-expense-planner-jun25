"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { X, BarChart, LineChart, Filter } from "lucide-react"
import type { ChartType } from "./expense-planner-summary"
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { useExpensePlanner } from "./expense-planner-context"
import { Badge } from "@/components/ui/badge"

interface ChartDetailsSidebarProps {
  chartType: ChartType
  data: any[]
  onClose: () => void
}

export function ChartDetailsSidebar({ chartType, data, onClose }: ChartDetailsSidebarProps) {
  const { glAccount, selectedCostCenters, year, version } = useExpensePlanner()

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Define chart colors
  const chartColors = {
    total: "hsl(var(--primary))",
    software: "hsl(var(--chart-1))",
    services: "hsl(var(--chart-2))",
    travel: "hsl(var(--chart-3))",
    facilities: "hsl(var(--chart-4))",
  }

  // Get chart title and data key based on chart type
  const getChartInfo = () => {
    switch (chartType) {
      case "total":
        return {
          title: "Total Expenses",
          dataKey: "total",
          color: chartColors.total,
          description: "Total expenses across all categories and vendors",
          icon: <LineChart className="h-5 w-5" />,
        }
      case "software":
        return {
          title: "Software Expenses",
          dataKey: "software",
          color: chartColors.software,
          description: "Expenses for software licenses, subscriptions, and related services",
          icon: <BarChart className="h-5 w-5" />,
        }
      case "services":
        return {
          title: "Professional Services Expenses",
          dataKey: "services",
          color: chartColors.services,
          description: "Expenses for consulting, legal, accounting, and other professional services",
          icon: <BarChart className="h-5 w-5" />,
        }
      case "travel":
        return {
          title: "Travel Expenses",
          dataKey: "travel",
          color: chartColors.travel,
          description: "Expenses for business travel",
          icon: <BarChart className="h-5 w-5" />,
        }
      default:
        return {
          title: "Expenses",
          dataKey: "total",
          color: chartColors.total,
          description: "Expense data",
          icon: <BarChart className="h-5 w-5" />,
        }
    }
  }

  const chartInfo = getChartInfo()

  // Calculate total for the selected chart type
  const calculateTotal = () => {
    if (Array.isArray(chartInfo.dataKey)) {
      return data.reduce((acc, item) => {
        return acc + chartInfo.dataKey.reduce((sum, key) => sum + (item[key] || 0), 0)
      }, 0)
    }
    return data.reduce((acc, item) => acc + (item[chartInfo.dataKey] || 0), 0)
  }

  // Calculate monthly average
  const calculateMonthlyAverage = () => {
    return calculateTotal() / (data.length || 1)
  }

  // Find highest month
  const findHighestMonth = () => {
    if (Array.isArray(chartInfo.dataKey)) {
      return data.reduce(
        (highest, item) => {
          const total = chartInfo.dataKey.reduce((sum, key) => sum + (item[key] || 0), 0)
          return total > highest.value ? { name: item.name, value: total } : highest
        },
        { name: "", value: 0 },
      )
    }

    return data.reduce(
      (highest, item) => {
        return (item[chartInfo.dataKey] || 0) > highest.value
          ? { name: item.name, value: item[chartInfo.dataKey] || 0 }
          : highest
      },
      { name: "", value: 0 },
    )
  }

  // Find lowest month
  const findLowestMonth = () => {
    if (Array.isArray(chartInfo.dataKey)) {
      return data.reduce(
        (lowest, item) => {
          const total = chartInfo.dataKey.reduce((sum, key) => sum + (item[key] || 0), 0)
          return (lowest.value === 0 || total < lowest.value) && total > 0 ? { name: item.name, value: total } : lowest
        },
        { name: "", value: 0 },
      )
    }

    return data.reduce(
      (lowest, item) => {
        const value = item[chartInfo.dataKey] || 0
        return (lowest.value === 0 || value < lowest.value) && value > 0 ? { name: item.name, value } : lowest
      },
      { name: "", value: 0 },
    )
  }

  const highestMonth = findHighestMonth()
  const lowestMonth = findLowestMonth()

  // Get active filters for display
  const getActiveFilters = () => {
    const filters = []

    if (glAccount !== "All") {
      filters.push({ label: "GL Account", value: glAccount })
    }

    if (!selectedCostCenters.includes("All")) {
      filters.push({ label: "Cost Centers", value: selectedCostCenters.join(", ") })
    }

    filters.push({ label: "Year", value: year.toString() })
    filters.push({ label: "Version", value: version })

    return filters
  }

  const activeFilters = getActiveFilters()

  return (
    <div className="w-full h-full overflow-auto p-2 md:p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {chartInfo.icon}
          <h3 className="text-lg font-semibold">{chartInfo.title}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{chartInfo.description}</p>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Active Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                <span className="text-xs font-medium">{filter.label}:</span>
                <span className="text-xs">{filter.value}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(calculateTotal())}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(calculateMonthlyAverage())}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Highest Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(highestMonth.value)}</div>
              <div className="text-sm text-muted-foreground">{highestMonth.name}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lowest Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(lowestMonth.value)}</div>
              <div className="text-sm text-muted-foreground">{lowestMonth.name}</div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {chartType !== "travel" ? (
                <ChartContainer
                  config={{
                    [chartInfo.dataKey as string]: {
                      label: chartInfo.title,
                      color: chartInfo.color as string,
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), chartInfo.title]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={chartInfo.dataKey as string}
                        stroke={chartInfo.color as string}
                        fill={`url(#color${chartType.charAt(0).toUpperCase() + chartType.slice(1)})`}
                        fillOpacity={0.6}
                      />
                      <defs>
                        <linearGradient
                          id={`color${chartType.charAt(0).toUpperCase() + chartType.slice(1)}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor={chartInfo.color as string} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartInfo.color as string} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <ChartContainer
                  config={{
                    travel: {
                      label: "Travel",
                      color: chartColors.travel,
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
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
                        fill={`url(#colorTravel)`}
                        fillOpacity={0.6}
                      />
                      <defs>
                        <linearGradient id="colorTravel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.travel} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartColors.travel} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ChartContainer
                config={
                  chartType !== "travel"
                    ? {
                        [chartInfo.dataKey as string]: {
                          label: chartInfo.title,
                          color: chartInfo.color as string,
                        },
                      }
                    : {
                        travel: {
                          label: "Travel",
                          color: chartColors.travel,
                        },
                      }
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Travel"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="travel" fill={chartColors.travel} radius={[4, 4, 0, 0]} name="Travel" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
