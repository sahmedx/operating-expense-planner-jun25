"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import { ExpensePlannerSidebar } from "./expense-planner-sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingOverlay } from "./loading-overlay"
import { Search, Filter, ArrowRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "./multi-select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define the allocation data type
type AllocationData = {
  [vendorId: string]: {
    [product: string]: {
      [month: string]: number
    }
  }
}

export function VendorProductAllocation() {
  const {
    expenseData,
    isLoading,
    timeGranularity,
    selectedCostCenters,
    setSelectedCostCenters,
    version,
    glAccount,
    setGLAccount,
  } = useExpensePlanner()

  // Force Live Forecast version
  useEffect(() => {
    if (version !== "Live Forecast") {
      // This is just a UI indication - the actual data filtering happens below
      console.log("Vendor<>Product Cost Allocation only uses Live Forecast data")
    }
  }, [version])

  // Local state
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredVendors, setFilteredVendors] = useState(expenseData.vendors)
  const [productTags, setProductTags] = useState<Record<string, string[]>>({})
  const [allocations, setAllocations] = useState<AllocationData>({})
  const [editingCell, setEditingCell] = useState<{ vendorId: string; product: string; month: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [hoveredCell, setHoveredCell] = useState<{ vendorId: string; product: string; month: string } | null>(null)

  // Load product tags from localStorage on component mount
  useEffect(() => {
    try {
      const savedTags = localStorage.getItem("vendorProductTags")
      if (savedTags) {
        setProductTags(JSON.parse(savedTags))
      }
    } catch (err) {
      console.error("Error loading vendor product tags:", err)
    }
  }, [])

  // Filter vendors based on search query, GL Account, and Cost Centers
  useEffect(() => {
    let filtered = [...expenseData.vendors]

    // Filter by GL Account if not "All"
    if (glAccount !== "All") {
      filtered = filtered.filter((vendor) => expenseData.glAccounts[vendor.id] === glAccount)
    }

    // Filter by Cost Center if not "All"
    if (!selectedCostCenters.includes("All")) {
      filtered = filtered.filter((vendor) => selectedCostCenters.includes(expenseData.costCenters[vendor.id]))
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((vendor) => vendor.name.toLowerCase().includes(query))
    }

    // Filter to only include vendors that have product tags
    filtered = filtered.filter((vendor) => {
      const tags = productTags[vendor.id]
      return tags && tags.length > 0
    })

    setFilteredVendors(filtered)
  }, [
    expenseData.vendors,
    expenseData.glAccounts,
    expenseData.costCenters,
    glAccount,
    selectedCostCenters,
    searchQuery,
    productTags,
  ])

  // Get time columns based on time granularity
  const getTimeColumns = () => {
    if (timeGranularity === "Monthly") {
      return [
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
    } else if (timeGranularity === "Quarterly") {
      return ["Q1'25", "Q2'25", "Q3'25", "Q4'25"]
    } else {
      return ["FY 2025"]
    }
  }

  const timeColumns = getTimeColumns()

  // Cost center options for filter
  const costCenterOptions = [
    { label: "All Cost Centers", value: "All" },
    { label: "Finance", value: "Finance" },
    { label: "HR", value: "HR" },
    { label: "Engineering", value: "Engineering" },
    { label: "Marketing", value: "Marketing" },
    { label: "Sales", value: "Sales" },
  ]

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Get vendor expense for a specific month
  const getVendorExpense = (vendorId: string, month: string) => {
    // Always use Live Forecast data
    return expenseData.expenses[vendorId]?.[month] || 0
  }

  // Get allocated amount for a vendor, product, and month
  const getAllocatedAmount = (vendorId: string, product: string, month: string) => {
    return allocations[vendorId]?.[product]?.[month] || 0
  }

  // Calculate total allocated amount for a vendor and month
  const getTotalAllocatedAmount = (vendorId: string, month: string) => {
    const vendorProducts = productTags[vendorId] || []
    let total = 0

    vendorProducts.forEach((product) => {
      total += getAllocatedAmount(vendorId, product, month)
    })

    return total
  }

  // Calculate unallocated amount for a vendor and month
  const getUnallocatedAmount = (vendorId: string, month: string) => {
    const totalExpense = getVendorExpense(vendorId, month)
    const totalAllocated = getTotalAllocatedAmount(vendorId, month)
    return totalExpense - totalAllocated
  }

  // Check if allocations are balanced for a vendor and month
  const isAllocationBalanced = (vendorId: string, month: string) => {
    const unallocated = getUnallocatedAmount(vendorId, month)
    return Math.abs(unallocated) < 0.01 // Allow for small rounding errors
  }

  // Check if all allocations are balanced for a vendor
  const areAllAllocationsBalanced = (vendorId: string) => {
    return timeColumns.every((month) => isAllocationBalanced(vendorId, month))
  }

  // Handle cell click for editing
  const handleCellClick = (vendorId: string, product: string, month: string) => {
    setEditingCell({ vendorId, product, month })
    setEditValue(getAllocatedAmount(vendorId, product, month).toString())
  }

  // Handle cell edit save
  const handleCellSave = () => {
    if (editingCell) {
      const { vendorId, product, month } = editingCell
      const numValue = Number.parseFloat(editValue) || 0

      // Update allocation
      setAllocations((prev) => {
        const newAllocations = { ...prev }

        if (!newAllocations[vendorId]) {
          newAllocations[vendorId] = {}
        }

        if (!newAllocations[vendorId][product]) {
          newAllocations[vendorId][product] = {}
        }

        newAllocations[vendorId][product][month] = numValue

        return newAllocations
      })

      setEditingCell(null)
    }
  }

  // Handle key press in edit input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave()
    } else if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  // Handle allocate remaining
  const handleAllocateRemaining = (vendorId: string, product: string, month: string) => {
    const remaining = getUnallocatedAmount(vendorId, month)

    // Only allocate if there's a positive remaining amount
    if (remaining > 0) {
      const currentAmount = getAllocatedAmount(vendorId, product, month)
      const newAmount = currentAmount + remaining

      setAllocations((prev) => {
        const newAllocations = { ...prev }

        if (!newAllocations[vendorId]) {
          newAllocations[vendorId] = {}
        }

        if (!newAllocations[vendorId][product]) {
          newAllocations[vendorId][product] = {}
        }

        newAllocations[vendorId][product][month] = newAmount

        return newAllocations
      })
    }
  }

  // Handle apply to all months
  const handleApplyToAllMonths = (vendorId: string, sourceMonth: string) => {
    // Get the allocation pattern for the source month
    const vendorProducts = productTags[vendorId] || []
    const sourceMonthTotal = getVendorExpense(vendorId, sourceMonth)
    const sourceMonthAllocations: Record<string, number> = {}

    // Calculate the allocation percentages from the source month
    vendorProducts.forEach((product) => {
      const amount = getAllocatedAmount(vendorId, product, sourceMonth)
      sourceMonthAllocations[product] = sourceMonthTotal > 0 ? amount / sourceMonthTotal : 0
    })

    // Apply these percentages to all other months
    setAllocations((prev) => {
      const newAllocations = { ...prev }

      if (!newAllocations[vendorId]) {
        newAllocations[vendorId] = {}
      }

      timeColumns.forEach((targetMonth) => {
        if (targetMonth !== sourceMonth) {
          const targetMonthTotal = getVendorExpense(vendorId, targetMonth)

          vendorProducts.forEach((product) => {
            if (!newAllocations[vendorId][product]) {
              newAllocations[vendorId][product] = {}
            }

            // Apply the same percentage to the target month
            const percentage = sourceMonthAllocations[product]
            newAllocations[vendorId][product][targetMonth] = targetMonthTotal * percentage
          })
        }
      })

      return newAllocations
    })
  }

  // Allocation Summary component
  const AllocationSummary = ({ vendorId, vendorName }: { vendorId: string; vendorName: string }) => {
    const totalExpense = timeColumns.reduce((sum, month) => sum + getVendorExpense(vendorId, month), 0)
    const totalAllocated = timeColumns.reduce((sum, month) => sum + getTotalAllocatedAmount(vendorId, month), 0)
    const remaining = totalExpense - totalAllocated
    const isBalanced = Math.abs(remaining) < 0.01

    return (
      <div
        className={`p-3 rounded-md mb-2 ${isBalanced ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-medium">{vendorName} Allocation Summary</h4>
            <p className="text-sm text-muted-foreground">
              {isBalanced ? "✓ Fully allocated across products" : "⚠️ Allocation incomplete"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Total Expense</span>
              <span className="font-medium tabular-nums">{formatCurrency(totalExpense)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Allocated</span>
              <span className="font-medium tabular-nums">{formatCurrency(totalAllocated)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Remaining</span>
              <span
                className={`font-medium tabular-nums ${remaining > 0 ? "text-amber-600" : remaining < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <LoadingOverlay isLoading={isLoading} message="Loading expense data..." />
      <ExpensePlannerSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="flex flex-col md:flex-row h-auto md:h-16 items-start md:items-center justify-between p-4">
            <h1 className="text-lg md:text-xl font-semibold mb-2 md:mb-0">Vendor&lt;&gt;Product Cost Allocation</h1>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between border-t px-4 py-3 overflow-x-auto">
            <div className="flex flex-wrap gap-4 w-full">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-[200px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={glAccount} onValueChange={(v) => setGLAccount(v as any)}>
                  <SelectTrigger className="h-8 w-[180px]">
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
                  className="h-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-md border bg-background">
            <div className="p-4 border-b">
              <h3 className="text-sm font-bold">Product Cost Allocation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Allocate vendor expenses across products. The total allocated amount should equal the vendor's total
                expense. Make sure you assigned vendors to products on Vendor-Product tagging page and clicked save on that page.
              </p>
            </div>
            <div className="max-h-[calc(100vh-250px)] overflow-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-100 z-10">
                    <TableRow>
                      <TableHead className="min-w-[200px] font-bold">Vendor</TableHead>
                      <TableHead className="min-w-[150px] font-bold">Products</TableHead>
                      {timeColumns.map((month) => (
                        <TableHead key={month} className="min-w-[100px] font-bold">
                          <div className="flex items-center justify-between">
                            <span>{month}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[120px] font-bold">Unallocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={timeColumns.length + 3} className="text-center py-8 text-muted-foreground">
                          No vendors found with product tags. Please assign products to vendors in the Vendor-Product
                          Tagging page.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendors.map((vendor) => {
                        const vendorProducts = productTags[vendor.id] || []
                        const isBalanced = areAllAllocationsBalanced(vendor.id)

                        return (
                          <React.Fragment key={vendor.id}>
                            {/* Allocation Summary Dashboard */}
                            <TableRow>
                              <TableCell colSpan={timeColumns.length + 3} className="p-0 border-b-0">
                                <AllocationSummary vendorId={vendor.id} vendorName={vendor.name} />
                              </TableCell>
                            </TableRow>

                            {/* Vendor row */}
                            <TableRow className={isBalanced ? "bg-green-50" : "bg-red-50"}>
                              <TableCell className="font-medium" rowSpan={vendorProducts.length + 1}>
                                {vendor.name}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-wrap gap-1">
                                  {vendorProducts.map((product) => (
                                    <Badge key={product} variant="outline">
                                      {product}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              {timeColumns.map((month) => (
                                <TableCell key={month} className="font-medium tabular-nums text-right">
                                  <div className="flex flex-col items-end">
                                    <span>{formatCurrency(getVendorExpense(vendor.id, month))}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1 py-0 text-xs flex items-center"
                                          onClick={() => handleApplyToAllMonths(vendor.id, month)}
                                        >
                                          <span className="mr-0.5">%</span>
                                          <ArrowRight className="h-3 w-3" />
                                          <span className="sr-only">Apply to all months</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        Apply this month's allocation % split to all future months
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              ))}
                              <TableCell className="font-medium tabular-nums text-right">
                                {/* Total unallocated across all months */}
                                {formatCurrency(
                                  timeColumns.reduce((sum, month) => sum + getUnallocatedAmount(vendor.id, month), 0),
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Product rows */}
                            {vendorProducts.map((product) => (
                              <TableRow
                                key={`${vendor.id}-${product}`}
                                className={isBalanced ? "bg-green-50/50" : "bg-red-50/50"}
                              >
                                <TableCell>
                                  <Badge>{product}</Badge>
                                </TableCell>
                                {timeColumns.map((month) => (
                                  <TableCell
                                    key={`${vendor.id}-${product}-${month}`}
                                    className="tabular-nums text-right relative"
                                    onMouseEnter={() => setHoveredCell({ vendorId: vendor.id, product, month })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onClick={() => handleCellClick(vendor.id, product, month)}
                                  >
                                    {editingCell?.vendorId === vendor.id &&
                                    editingCell?.product === product &&
                                    editingCell?.month === month ? (
                                      <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleCellSave}
                                        onKeyDown={handleKeyPress}
                                        className="h-8 w-24 text-right"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        {hoveredCell?.vendorId === vendor.id &&
                                          hoveredCell?.product === product &&
                                          hoveredCell?.month === month &&
                                          getUnallocatedAmount(vendor.id, month) > 0 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleAllocateRemaining(vendor.id, product, month)
                                                  }}
                                                >
                                                  <ArrowRight className="h-3.5 w-3.5" />
                                                  <span className="sr-only">Allocate remaining</span>
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                Allocate remaining{" "}
                                                {formatCurrency(getUnallocatedAmount(vendor.id, month))}
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        <span className="ml-auto">
                                          {formatCurrency(getAllocatedAmount(vendor.id, product, month))}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="tabular-nums text-right">
                                  {/* Total allocated for this product across all months */}
                                  {formatCurrency(
                                    timeColumns.reduce(
                                      (sum, month) => sum + getAllocatedAmount(vendor.id, product, month),
                                      0,
                                    ),
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
