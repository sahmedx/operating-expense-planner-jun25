"use client"

import { useState } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { X, Edit, Trash, BarChart, PieChart, AlertCircle } from "lucide-react"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditVendorDialog } from "./edit-vendor-dialog"

interface ExpensePlannerDetailsProps {
  vendor: string | null
  onClose: () => void
}

export function ExpensePlannerDetails({ vendor, onClose }: ExpensePlannerDetailsProps) {
  const { expenseData, isClosedPeriod, version, deleteVendor } = useExpensePlanner()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!vendor) return null

  const vendorData = expenseData.vendors.find((v) => v.id === vendor)
  if (!vendorData) return null

  const vendorExpenses = expenseData.expenses[vendor] || {}
  const glAccount = expenseData.glAccounts[vendor]
  const costCenter = expenseData.costCenters[vendor]

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate total expense
  const totalExpense = Object.values(vendorExpenses).reduce((sum, value) => sum + (value as number), 0)

  // Prepare chart data
  const chartData = Object.entries(vendorExpenses).map(([month, amount]) => ({
    month,
    amount: amount as number,
  }))

  // Calculate quarterly data
  const quarterlyData = [
    {
      name: "Q1",
      amount: (vendorExpenses["Jan'25"] || 0) + (vendorExpenses["Feb'25"] || 0) + (vendorExpenses["Mar'25"] || 0),
    },
    {
      name: "Q2",
      amount: (vendorExpenses["Apr'25"] || 0) + (vendorExpenses["May'25"] || 0) + (vendorExpenses["Jun'25"] || 0),
    },
    {
      name: "Q3",
      amount: (vendorExpenses["Jul'25"] || 0) + (vendorExpenses["Aug'25"] || 0) + (vendorExpenses["Sep'25"] || 0),
    },
    {
      name: "Q4",
      amount: (vendorExpenses["Oct'25"] || 0) + (vendorExpenses["Nov'25"] || 0) + (vendorExpenses["Dec'25"] || 0),
    },
  ]

  // Handle delete vendor
  const handleDeleteVendor = () => {
    try {
      deleteVendor(vendor)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vendor")
    }
  }

  return (
    <div className="w-full h-full overflow-auto p-2 md:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Vendor Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-grow">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Vendor Name</h4>
          <p className="text-lg font-semibold">{vendorData.name}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Vendor ID</h4>
          <p className="text-sm font-mono bg-muted p-1 rounded">{vendor}</p>
        </div>

        <div className="flex justify-between">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">GL Account</h4>
            <p>{glAccount}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Cost Center</h4>
            <p>{costCenter}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Total Annual Expense</h4>
          <p className="text-xl font-bold">{formatCurrency(totalExpense)}</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(true)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>

        <Separator />

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] md:h-[200px]">
              <ChartContainer
                config={{
                  amount: {
                    label: "Amount",
                    color: "hsl(var(--chart-1))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [formatCurrency(value), "Amount"]}
                    />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Quarterly Breakdown</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] md:h-[200px]">
              <ChartContainer
                config={{
                  amount: {
                    label: "Amount",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={quarterlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [formatCurrency(value), "Amount"]}
                    />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {vendorData.name}? This action cannot be undone and will remove the vendor
              from all versions (Actuals, Live Forecast, and Budget).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVendor} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Edit Vendor Dialog */}
      <EditVendorDialog open={showEditDialog} onOpenChange={setShowEditDialog} vendorId={vendor} />
    </div>
  )
}
