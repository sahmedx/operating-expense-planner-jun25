"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useExpensePlanner } from "@/components/expense-planner-context"
import { MultiSelect, type Option } from "@/components/multi-select"
import { formatCurrency } from "@/lib/utils"
import { db, type Vendor, type ExpenseView } from "@/lib/supabase"
import { LoadingOverlay } from "@/components/loading-overlay"

// Product options
const PRODUCTS = ["Trading", "Card", "Commerce", "Custody", "Markets"]

// GL Account options
const GL_ACCOUNTS = ["Compensation", "Professional Services", "Travel", "Software", "Marketing", "Facilities", "Other"]

// Cost Center options
const COST_CENTERS = ["Finance", "HR", "Engineering", "Marketing", "Sales"]

export function ExpensePlannerGridWithProduct() {
  // State for data
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [expenses, setExpenses] = useState<ExpenseView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for filters
  const [selectedGLAccounts, setSelectedGLAccounts] = useState<string[]>(["All"])
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>(["All"])
  const [selectedProducts, setSelectedProducts] = useState<string[]>(["All"])

  // State for vendor-product assignments
  const [vendorProducts, setVendorProducts] = useState<Record<string, string>>({})

  // Get the version from context (we'll still use this)
  const { version: selectedVersion } = useExpensePlanner()

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch vendors
        const vendorsData = await db.getVendors()
        setVendors(vendorsData)

        // Fetch expense data for the selected version
        const expensesData = await db.getExpenseView(selectedVersion)
        setExpenses(expensesData)

        // Generate random product assignments
        const assignments: Record<string, string> = {}
        vendorsData.forEach((vendor) => {
          const randomIndex = Math.floor(Math.random() * PRODUCTS.length)
          assignments[vendor.id] = PRODUCTS[randomIndex]
        })
        setVendorProducts(assignments)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedVersion])

  // Create options for filters
  const glAccountOptions: Option[] = [
    { label: "All GL Accounts", value: "All" },
    ...GL_ACCOUNTS.map((account) => ({ label: account, value: account })),
  ]

  const costCenterOptions: Option[] = [
    { label: "All Cost Centers", value: "All" },
    ...COST_CENTERS.map((center) => ({ label: center, value: center })),
  ]

  const productOptions: Option[] = [
    { label: "All Products", value: "All" },
    ...PRODUCTS.map((product) => ({ label: product, value: product })),
  ]

  // Get unique time periods from expenses
  const timePeriods = Array.from(new Set(expenses.map((expense) => expense.month))).sort()

  // Filter vendors based on selected GL accounts, cost centers, and products
  const filteredVendors = vendors.filter((vendor) => {
    const matchesGLAccount = selectedGLAccounts.includes("All") || selectedGLAccounts.includes(vendor.gl_account)

    const matchesCostCenter = selectedCostCenters.includes("All") || selectedCostCenters.includes(vendor.cost_center)

    const vendorProduct = vendorProducts[vendor.id] || ""
    const matchesProduct = selectedProducts.includes("All") || selectedProducts.includes(vendorProduct)

    return matchesGLAccount && matchesCostCenter && matchesProduct
  })

  const handleGLAccountChange = (values: string[]) => {
    setSelectedGLAccounts(values)
  }

  const handleCostCenterChange = (values: string[]) => {
    setSelectedCostCenters(values)
  }

  const handleProductChange = (values: string[]) => {
    setSelectedProducts(values)
  }

  if (isLoading) {
    return <LoadingOverlay />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-600">Error</h3>
            <p className="mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-2">
          <CardTitle className="text-xl font-bold">Vendor Expense Planning</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs font-normal">
              {selectedVersion || "Live Forecast"}
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              Read-Only
            </Badge>
          </div>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
          <div className="w-full md:w-48">
            <MultiSelect
              options={[{ label: "All", value: "All" }, ...glAccountOptions]}
              selected={selectedGLAccounts}
              onChange={handleGLAccountChange}
              allText="All GL Accounts"
            />
          </div>
          <div className="w-full md:w-48">
            <MultiSelect
              options={[{ label: "All", value: "All" }, ...costCenterOptions]}
              selected={selectedCostCenters}
              onChange={handleCostCenterChange}
              allText="All Cost Centers"
            />
          </div>
          <div className="w-full md:w-48">
            <MultiSelect
              options={[
                { label: "All", value: "All" },
                ...PRODUCTS.map((product) => ({ label: product, value: product })),
              ]}
              selected={selectedProducts}
              onChange={handleProductChange}
              allText="All Products"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Vendor</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Cost Center</TableHead>
                <TableHead>Product</TableHead>
                {timePeriods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => {
                const product = vendorProducts[vendor.id] || "Unassigned"

                // Get vendor expenses for each time period
                const vendorExpensesByPeriod = timePeriods.map((period) => {
                  const expense = expenses.find(
                    (e) => e.vendor_id === vendor.id && e.month === period && e.version === selectedVersion,
                  )
                  return expense?.amount || 0
                })

                // Calculate vendor total
                const vendorTotal = vendorExpensesByPeriod.reduce((total, amount) => total + amount, 0)

                return (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.gl_account}</TableCell>
                    <TableCell>{vendor.cost_center}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {product}
                      </Badge>
                    </TableCell>
                    {timePeriods.map((period, index) => (
                      <TableCell key={period} className="text-right tabular-nums">
                        {formatCurrency(vendorExpensesByPeriod[index])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(vendorTotal)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
