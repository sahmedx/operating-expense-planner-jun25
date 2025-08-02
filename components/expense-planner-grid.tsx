"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { ChevronDown, ChevronUp, Filter, Plus, Trash2, ExternalLink, Copy, Clipboard, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AddVendorDialog } from "./add-vendor-dialog"

interface ExpensePlannerGridProps {
  onSelectVendor: (vendorId: string) => void
}

export function ExpensePlannerGrid({ onSelectVendor }: ExpensePlannerGridProps) {
  const {
    expenseData,
    updateExpenseData,
    timeGranularity,
    glAccount,
    selectedCostCenters,
    version,
    isClosedPeriod,
    isForecastPeriod,
    addVendor,
    deleteAllVendors,
    error,
    clearError,
  } = useExpensePlanner()

  const [editingCell, setEditingCell] = useState<{ vendorId: string; month: string } | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ vendorId: string; month: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  const [filteredVendors, setFilteredVendors] = useState(expenseData.vendors)
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [copiedValue, setCopiedValue] = useState<number | null>(null)
  const [copiedCell, setCopiedCell] = useState<{ vendorId: string; month: string } | null>(null)
  const [pastedCell, setPastedCell] = useState<{ vendorId: string; month: string } | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Ref for the input element to focus it when needed
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if "All Cost Centers" is selected
  const isAllCostCentersSelected = selectedCostCenters.includes("All")

  // Filter vendors based on GL Account and Cost Centers
  useEffect(() => {
    // Start with vendors from the current version only
    let filtered = [...expenseData.vendors]

    if (glAccount !== "All") {
      filtered = filtered.filter((vendor) => expenseData.glAccounts[vendor.id] === glAccount)
    }

    // Updated to handle multiple cost centers
    if (!selectedCostCenters.includes("All")) {
      filtered = filtered.filter((vendor) => selectedCostCenters.includes(expenseData.costCenters[vendor.id]))
    }

    setFilteredVendors(filtered)
  }, [expenseData.vendors, expenseData.glAccounts, expenseData.costCenters, glAccount, selectedCostCenters, version])

  // Get months based on time granularity
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

  // Calculate quarterly and annual values
  const getTimeValue = (vendorId: string, timeColumn: string) => {
    // Make sure the vendor exists in the expenses object
    if (!expenseData.expenses[vendorId]) {
      return 0
    }

    if (timeGranularity === "Monthly") {
      return expenseData.expenses[vendorId]?.[timeColumn] || 0
    } else if (timeGranularity === "Quarterly") {
      const quarterMap: Record<string, string[]> = {
        "Q1'25": ["Jan'25", "Feb'25", "Mar'25"],
        "Q2'25": ["Apr'25", "May'25", "Jun'25"],
        "Q3'25": ["Jul'25", "Aug'25", "Sep'25"],
        "Q4'25": ["Oct'25", "Nov'25", "Dec'25"],
      }

      return quarterMap[timeColumn].reduce((sum, month) => {
        return sum + (expenseData.expenses[vendorId]?.[month] || 0)
      }, 0)
    } else {
      return Object.values(expenseData.expenses[vendorId] || {}).reduce((sum, value) => sum + (value as number), 0)
    }
  }

  // Check if a cell is editable
  const isCellEditable = (vendorId: string, month: string) => {
    // All cells are now editable
    return true
  }

  // Handle cell click for editing
  const handleCellClick = (vendorId: string, month: string) => {
    // Always set the selected cell for highlighting
    setSelectedCell({ vendorId, month })

    if (!isCellEditable(vendorId, month)) {
      return
    }

    // Make sure the vendor exists in the expenses object
    if (!expenseData.expenses[vendorId]) {
      console.log(`Initializing expenses for vendor ${vendorId}`)
      updateExpenseData(vendorId, month, 0)
    }

    setEditingCell({ vendorId, month })
    setEditValue(getTimeValue(vendorId, month).toString())

    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 10)
  }

  // Handle cell edit save
  const handleCellSave = () => {
    if (editingCell) {
      const { vendorId, month } = editingCell
      const numValue = Number.parseFloat(editValue) || 0

      if (timeGranularity === "Monthly") {
        updateExpenseData(vendorId, month, numValue)
      } else if (timeGranularity === "Quarterly") {
        // For quarterly, distribute evenly across months
        const quarterMap: Record<string, string[]> = {
          "Q1'25": ["Jan'25", "Feb'25", "Mar'25"],
          "Q2'25": ["Apr'25", "May'25", "Jun'25"],
          "Q3'25": ["Jul'25", "Aug'25", "Sep'25"],
          "Q4'25": ["Oct'25", "Nov'25", "Dec'25"],
        }

        const monthValue = numValue / quarterMap[month].length
        quarterMap[month].forEach((m) => {
          updateExpenseData(vendorId, m, monthValue)
        })
      } else {
        // For annual, distribute evenly across all months
        const months = [
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
        const monthValue = numValue / months.length
        months.forEach((m) => {
          updateExpenseData(vendorId, m, monthValue)
        })
      }

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

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate vendor total
  const getVendorTotal = (vendorId: string) => {
    return timeColumns.reduce((sum, month) => {
      return sum + getTimeValue(vendorId, month)
    }, 0)
  }

  // Calculate column total
  const getColumnTotal = (month: string) => {
    return filteredVendors.reduce((sum, vendor) => {
      return sum + getTimeValue(vendor.id, month)
    }, 0)
  }

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (!sortConfig) return 0

    if (sortConfig.key === "name") {
      return sortConfig.direction === "ascending" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else if (sortConfig.key === "category") {
      const catA = expenseData.glAccounts[a.id]
      const catB = expenseData.glAccounts[b.id]
      return sortConfig.direction === "ascending" ? catA.localeCompare(catB) : catB.localeCompare(catA)
    } else if (sortConfig.key === "costCenter") {
      const ccA = expenseData.costCenters[a.id]
      const ccB = expenseData.costCenters[b.id]
      return sortConfig.direction === "ascending" ? ccA.localeCompare(ccB) : ccB.localeCompare(ccA)
    } else if (sortConfig.key === "total") {
      const totalA = getVendorTotal(a.id)
      const totalB = getVendorTotal(b.id)
      return sortConfig.direction === "ascending" ? totalA - totalB : totalB - totalA
    } else {
      // Sort by specific month
      const valueA = getTimeValue(a.id, sortConfig.key)
      const valueB = getTimeValue(b.id, sortConfig.key)
      return sortConfig.direction === "ascending" ? valueA - valueB : valueB - valueA
    }
  })

  // Get sort direction icon
  const getSortDirectionIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null
    }
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
  }

  // Handle delete all vendors
  const handleDeleteAllVendors = () => {
    deleteAllVendors()
    setShowDeleteAllConfirm(false)
  }

  // Copy cell value to clipboard
  const handleCopyCell = (vendorId: string, month: string) => {
    const value = getTimeValue(vendorId, month)
    setCopiedValue(value)

    // Copy the value to clipboard
    navigator.clipboard
      .writeText(value.toString())
      .then(() => {
        // Visual feedback instead of toast
        setCopiedCell({ vendorId, month })
        setStatusMessage({ type: "success", text: `Value ${formatCurrency(value)} copied to clipboard` })

        // Clear visual feedback after 2 seconds
        setTimeout(() => {
          setCopiedCell(null)
          setStatusMessage(null)
        }, 2000)
      })
      .catch((err) => {
        console.error("Failed to copy value: ", err)
        setStatusMessage({ type: "error", text: "Failed to copy value to clipboard" })
        setTimeout(() => setStatusMessage(null), 3000)
      })
  }

  // Paste cell value from clipboard
  const handlePasteCell = async (vendorId: string, month: string) => {
    if (!isCellEditable(vendorId, month)) {
      setStatusMessage({ type: "error", text: "This cell is not editable" })
      setTimeout(() => setStatusMessage(null), 3000)
      return
    }

    try {
      // Try to get text from clipboard
      const text = await navigator.clipboard.readText()

      // Parse the value - handle currency formatting and other formats
      let value: number

      // Remove currency symbols, commas, and other non-numeric characters except decimal point
      const cleanedText = text.replace(/[^0-9.-]/g, "")

      // Parse the cleaned text as a number
      value = Number.parseFloat(cleanedText)

      // Check if the value is a valid number
      if (isNaN(value)) {
        throw new Error("Invalid number format")
      }

      // Update the cell with the pasted value
      if (timeGranularity === "Monthly") {
        updateExpenseData(vendorId, month, value)
      } else if (timeGranularity === "Quarterly") {
        // For quarterly, distribute evenly across months
        const quarterMap: Record<string, string[]> = {
          "Q1'25": ["Jan'25", "Feb'25", "Mar'25"],
          "Q2'25": ["Apr'25", "May'25", "Jun'25"],
          "Q3'25": ["Jul'25", "Aug'25", "Sep'25"],
          "Q4'25": ["Oct'25", "Nov'25", "Dec'25"],
        }

        const monthValue = value / quarterMap[month].length
        quarterMap[month].forEach((m) => {
          updateExpenseData(vendorId, m, monthValue)
        })
      } else {
        // For annual, distribute evenly across all months
        const months = [
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
        const monthValue = value / months.length
        months.forEach((m) => {
          updateExpenseData(vendorId, m, monthValue)
        })
      }

      // Visual feedback
      setPastedCell({ vendorId, month })
      setStatusMessage({ type: "success", text: `Pasted ${formatCurrency(value)} into cell` })
      setTimeout(() => {
        setPastedCell(null)
        setStatusMessage(null)
      }, 2000)
    } catch (err) {
      console.error("Failed to paste value: ", err)
      setStatusMessage({ type: "error", text: "Failed to paste a valid number" })
      setTimeout(() => setStatusMessage(null), 3000)
    }
  }

  // Handle keyboard shortcuts for copy and paste
  const handleCellKeyDown = (e: React.KeyboardEvent, vendorId: string, month: string) => {
    // Copy on Ctrl+C
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault()
      handleCopyCell(vendorId, month)
    }

    // Paste on Ctrl+V
    if (e.ctrlKey && e.key === "v") {
      e.preventDefault()
      handlePasteCell(vendorId, month)
    }
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 border-b">
          <h3 className="text-sm font-bold">Vendor Expense Planning</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 px-2 sm:px-3">
              <Filter className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Filter</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddVendorDialog(true)}
              className="text-xs sm:text-sm h-8 px-2 sm:px-3"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Add</span> Vendor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteAllConfirm(true)}
              className="text-xs sm:text-sm h-8 px-2 sm:px-3 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Delete All</span>
            </Button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-350px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-100 z-10">
              <TableRow>
                <TableHead
                  className="min-w-[120px] md:min-w-[200px] cursor-pointer font-bold"
                  onClick={() => requestSort("name")}
                >
                  <div className="flex items-center">Vendor {getSortDirectionIcon("name")}</div>
                </TableHead>
                <TableHead className="cursor-pointer font-bold" onClick={() => requestSort("category")}>
                  <div className="flex items-center">GL Account {getSortDirectionIcon("category")}</div>
                </TableHead>
                <TableHead className="cursor-pointer font-bold" onClick={() => requestSort("costCenter")}>
                  <div className="flex items-center">Cost Center {getSortDirectionIcon("costCenter")}</div>
                </TableHead>
                {timeColumns.map((month) => (
                  <TableHead
                    key={month}
                    className={`cursor-pointer min-w-[80px] md:min-w-[100px] font-bold ${
                      isClosedPeriod(month) ? "bg-amber-50" : ""
                    }`}
                    onClick={() => requestSort(month)}
                  >
                    <div className="flex items-center">
                      {month} {getSortDirectionIcon(month)}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="cursor-pointer font-bold" onClick={() => requestSort("total")}>
                  <div className="flex items-center">Total {getSortDirectionIcon("total")}</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium cursor-pointer" onClick={() => onSelectVendor(vendor.id)}>
                    <div className="flex items-center">
                      <span className="mr-1">{vendor.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expenseData.glAccounts[vendor.id]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expenseData.costCenters[vendor.id]}</Badge>
                  </TableCell>
                  {timeColumns.map((month) => (
                    <TableCell
                      key={month}
                      className={`tabular-nums text-left ${
                        isClosedPeriod(month)
                          ? "bg-amber-50"
                          : version === "Live Forecast" && isForecastPeriod(month)
                            ? "text-blue-600"
                            : ""
                      } ${isCellEditable(vendor.id, month) ? "cursor-pointer" : "cursor-not-allowed"}
                      ${selectedCell?.vendorId === vendor.id && selectedCell?.month === month ? "bg-blue-100" : ""}
                      ${copiedCell?.vendorId === vendor.id && copiedCell?.month === month ? "bg-green-100" : ""}
                      ${pastedCell?.vendorId === vendor.id && pastedCell?.month === month ? "bg-green-100" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCellClick(vendor.id, month)
                      }}
                      onKeyDown={(e) => handleCellKeyDown(e, vendor.id, month)}
                      tabIndex={0}
                    >
                      {editingCell?.vendorId === vendor.id && editingCell?.month === month ? (
                        <Input
                          ref={inputRef}
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyPress}
                          className="h-8 w-24 text-left"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center justify-start group">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={
                                  !isCellEditable(vendor.id, month) &&
                                  version === "Live Forecast" &&
                                  isForecastPeriod(month)
                                    ? "text-black"
                                    : ""
                                }
                              >
                                {formatCurrency(getTimeValue(vendor.id, month))}
                              </span>
                            </TooltipTrigger>
                            {!isCellEditable(vendor.id, month) && (
                              <TooltipContent>
                                <p>This period cannot be edited</p>
                              </TooltipContent>
                            )}
                          </Tooltip>

                          <div className="flex ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyCell(vendor.id, month)
                                  }}
                                  className="p-0.5 text-muted-foreground hover:text-foreground"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy to clipboard</p>
                              </TooltipContent>
                            </Tooltip>

                            {isCellEditable(vendor.id, month) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handlePasteCell(vendor.id, month)
                                    }}
                                    className="p-0.5 ml-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <Clipboard className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Paste from clipboard</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="font-medium tabular-nums text-left">
                    {formatCurrency(getVendorTotal(vendor.id))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={3}>Total</TableCell>
                {timeColumns.map((month) => (
                  <TableCell
                    key={month}
                    className={`tabular-nums text-left ${isClosedPeriod(month) ? "bg-amber-50" : ""}`}
                    style={{ color: "black" }} // Force black color regardless of other conditions
                  >
                    {formatCurrency(getColumnTotal(month))}
                  </TableCell>
                ))}
                <TableCell className="tabular-nums text-left" style={{ color: "black" }}>
                  {formatCurrency(filteredVendors.reduce((sum, vendor) => sum + getVendorTotal(vendor.id), 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <AddVendorDialog open={showAddVendorDialog} onOpenChange={setShowAddVendorDialog} />

      {/* Delete All Vendors Confirmation Dialog */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Vendors</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all vendors? This action cannot be undone and will remove all vendors from
              all versions (Actuals, Live Forecast, and Budget).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllVendors} className="bg-destructive text-destructive-foreground">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {statusMessage && (
        <div
          className={`fixed bottom-4 right-4 p-3 rounded-md shadow-md z-50 flex items-center gap-2 ${
            statusMessage.type === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : "bg-green-100 text-green-800 border border-green-300"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="hover:bg-opacity-20 hover:bg-gray-500 rounded-full p-1"
            aria-label="Dismiss message"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </TooltipProvider>
  )
}
