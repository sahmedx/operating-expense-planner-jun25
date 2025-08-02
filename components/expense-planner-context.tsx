"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { expenseDataService } from "@/lib/expense-data-service"
import { generateVendorCode } from "@/lib/supabase"
import { db } from "@/lib/supabase"

// First, add these constants at the top of the file, after the imports:
const CLOSED_PERIODS = ["Jan'25", "Feb'25", "Mar'25"]
const CURRENT_YEAR = 2025
const FORECAST_PERIODS = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25"]

// Define types for our context
type Version = "Actuals" | "Live Forecast" | "Budget"
type TimeGranularity = "Monthly" | "Quarterly" | "Annual"
type GLAccount =
  | "Compensation"
  | "Professional Services"
  | "Travel"
  | "Software"
  | "Marketing"
  | "Facilities"
  | "Other"
  | "All"
type CostCenter = "Finance" | "HR" | "Engineering" | "Marketing" | "Sales" | "All"

// Error type for consistent error handling
export type AppError = {
  message: string
  code?: string
  details?: any
}

// First, let's update the types to support our vendor registry approach
// Add this type definition near the top of the file, after the other type definitions:

interface Vendor {
  id: string
  name: string
  category: string
  vendorCode: string
  glAccount: GLAccount
  costCenter: CostCenter
}

interface VersionData {
  vendorIds: string[]
  expenses: Record<string, Record<string, number>>
}

// Add types for change tracking
interface ChangeTracking {
  changedVendors: Set<string>
  changedExpenses: Record<Version, Set<string>>
  isDataChanged: boolean
}

interface ExpensePlannerContextType {
  version: Version
  setVersion: (version: Version) => void
  timeGranularity: TimeGranularity
  setTimeGranularity: (granularity: TimeGranularity) => void
  glAccount: GLAccount
  setGLAccount: (account: GLAccount) => void
  selectedCostCenters: CostCenter[]
  setSelectedCostCenters: (centers: CostCenter[]) => void
  year: number
  setYear: (year: number) => void
  expenseData: any
  updateExpenseData: (vendorId: string, month: string, amount: number) => void
  isClosedPeriod: (month: string) => boolean
  isForecastPeriod: (month: string) => boolean
  addVendor: (name: string, glAccount: GLAccount, costCenter: CostCenter) => Promise<string>
  editVendor: (vendorId: string, name: string, glAccount: GLAccount, costCenter: CostCenter) => Promise<void>
  deleteVendor: (vendorId: string) => Promise<void>
  deleteAllVendors: () => Promise<void>
  saveData: () => Promise<void>
  loadData: () => Promise<void>
  isLoading: boolean
  isSaving: boolean
  error: AppError | null
  clearError: () => void
  synchronizeVersions: () => void
}

const ExpensePlannerContext = createContext<ExpensePlannerContextType | undefined>(undefined)

// Helper function to generate a proper UUID
function generateUUID(): string {
  // This is a simplified version of RFC4122 v4 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function ExpensePlannerProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<Version>("Live Forecast")
  const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>("Monthly")
  const [glAccount, setGLAccount] = useState<GLAccount>("All")
  const [selectedCostCenters, setSelectedCostCenters] = useState<CostCenter[]>(["All"])
  const [year, setYear] = useState<number>(2025)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [deletedVendorIds, setDeletedVendorIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<AppError | null>(null)

  // Create a vendor registry to store all vendors
  const [vendorRegistry, setVendorRegistry] = useState<Record<string, Vendor>>({})

  // Create version-specific data that references vendors in the registry
  const [versionData, setVersionData] = useState<Record<Version, VersionData>>({
    Actuals: {
      vendorIds: [],
      expenses: {},
    },
    "Live Forecast": {
      vendorIds: [],
      expenses: {},
    },
    Budget: {
      vendorIds: [],
      expenses: {},
    },
  })

  // Add change tracking state
  const [changeTracking, setChangeTracking] = useState<ChangeTracking>({
    changedVendors: new Set<string>(),
    changedExpenses: {
      Actuals: new Set<string>(),
      "Live Forecast": new Set<string>(),
      Budget: new Set<string>(),
    },
    isDataChanged: false,
  })

  // Initialize the vendor registry with sample vendors
  const initializeData = () => {
    const initialVendors: Record<string, Vendor> = {
      v1: {
        id: "v1",
        name: "Salesforce",
        category: "Software",
        vendorCode: "VND-SF01",
        glAccount: "Software",
        costCenter: "Sales",
      },
      v2: {
        id: "v2",
        name: "Accenture",
        category: "Professional Services",
        vendorCode: "VND-AC01",
        glAccount: "Professional Services",
        costCenter: "Finance",
      },
      v3: {
        id: "v3",
        name: "AWS",
        category: "Software",
        vendorCode: "VND-AWS1",
        glAccount: "Software",
        costCenter: "Engineering",
      },
      v4: {
        id: "v4",
        name: "Slack",
        category: "Software",
        vendorCode: "VND-SL01",
        glAccount: "Software",
        costCenter: "Sales",
      },
      v5: {
        id: "v5",
        name: "Deloitte",
        category: "Professional Services",
        vendorCode: "VND-DL01",
        glAccount: "Professional Services",
        costCenter: "Finance",
      },
      v6: {
        id: "v6",
        name: "Zoom",
        category: "Software",
        vendorCode: "VND-ZM01",
        glAccount: "Software",
        costCenter: "Engineering",
      },
      v7: {
        id: "v7",
        name: "Adobe",
        category: "Software",
        vendorCode: "VND-AD01",
        glAccount: "Software",
        costCenter: "Marketing",
      },
      v8: {
        id: "v8",
        name: "WeWork",
        category: "Facilities",
        vendorCode: "VND-WW01",
        glAccount: "Facilities",
        costCenter: "Finance",
      },
      v9: {
        id: "v9",
        name: "Delta Airlines",
        category: "Travel",
        vendorCode: "VND-DA01",
        glAccount: "Travel",
        costCenter: "Sales",
      },
      v10: {
        id: "v10",
        name: "Microsoft",
        category: "Software",
        vendorCode: "VND-MS01",
        glAccount: "Software",
        costCenter: "Engineering",
      },
    }

    setVendorRegistry(initialVendors)

    // Initialize version data with references to vendors
    const vendorIds = Object.keys(initialVendors)

    const initialVersionData: Record<Version, VersionData> = {
      Actuals: {
        vendorIds: [...vendorIds],
        expenses: {
          v1: {
            "Jan'25": 9800,
            "Feb'25": 9900,
            "Mar'25": 10100,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v2: {
            "Jan'25": 24500,
            "Feb'25": 0,
            "Mar'25": 25200,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v3: {
            "Jan'25": 44800,
            "Feb'25": 45100,
            "Mar'25": 45300,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v4: {
            "Jan'25": 4900,
            "Feb'25": 5100,
            "Mar'25": 5050,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v5: {
            "Jan'25": 0,
            "Feb'25": 39800,
            "Mar'25": 0,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v6: {
            "Jan'25": 2950,
            "Feb'25": 2950,
            "Mar'25": 3100,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v7: {
            "Jan'25": 7900,
            "Feb'25": 7950,
            "Mar'25": 8100,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v8: {
            "Jan'25": 19800,
            "Feb'25": 19800,
            "Mar'25": 20100,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v9: {
            "Jan'25": 14800,
            "Feb'25": 4900,
            "Mar'25": 15200,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
          v10: {
            "Jan'25": 29800,
            "Feb'25": 29900,
            "Mar'25": 30200,
            "Apr'25": 0,
            "May'25": 0,
            "Jun'25": 0,
            "Jul'25": 0,
            "Aug'25": 0,
            "Sep'25": 0,
            "Oct'25": 0,
            "Nov'25": 0,
            "Dec'25": 0,
          },
        },
      },
      "Live Forecast": {
        vendorIds: [...vendorIds],
        expenses: {
          v1: {
            "Jan'25": 9800,
            "Feb'25": 9900,
            "Mar'25": 10100,
            "Apr'25": 10000,
            "May'25": 10000,
            "Jun'25": 10000,
            "Jul'25": 12000,
            "Aug'25": 12000,
            "Sep'25": 12000,
            "Oct'25": 12000,
            "Nov'25": 12000,
            "Dec'25": 12000,
          },
          v2: {
            "Jan'25": 24500,
            "Feb'25": 0,
            "Mar'25": 25200,
            "Apr'25": 0,
            "May'25": 25000,
            "Jun'25": 0,
            "Jul'25": 30000,
            "Aug'25": 0,
            "Sep'25": 30000,
            "Oct'25": 0,
            "Nov'25": 30000,
            "Dec'25": 0,
          },
          v3: {
            "Jan'25": 44800,
            "Feb'25": 45100,
            "Mar'25": 45300,
            "Apr'25": 50000,
            "May'25": 50000,
            "Jun'25": 50000,
            "Jul'25": 55000,
            "Aug'25": 55000,
            "Sep'25": 55000,
            "Oct'25": 60000,
            "Nov'25": 60000,
            "Dec'25": 60000,
          },
          v4: {
            "Jan'25": 4900,
            "Feb'25": 5100,
            "Mar'25": 5050,
            "Apr'25": 5000,
            "May'25": 5000,
            "Jun'25": 5000,
            "Jul'25": 5000,
            "Aug'25": 5000,
            "Sep'25": 5000,
            "Oct'25": 5000,
            "Nov'25": 5000,
            "Dec'25": 5000,
          },
          v5: {
            "Jan'25": 0,
            "Feb'25": 39800,
            "Mar'25": 0,
            "Apr'25": 40000,
            "May'25": 0,
            "Jun'25": 40000,
            "Jul'25": 0,
            "Aug'25": 45000,
            "Sep'25": 0,
            "Oct'25": 45000,
            "Nov'25": 0,
            "Dec'25": 45000,
          },
          v6: {
            "Jan'25": 2950,
            "Feb'25": 2950,
            "Mar'25": 3100,
            "Apr'25": 3000,
            "May'25": 3000,
            "Jun'25": 3000,
            "Jul'25": 3500,
            "Aug'25": 3500,
            "Sep'25": 3500,
            "Oct'25": 3500,
            "Nov'25": 3500,
            "Dec'25": 3500,
          },
          v7: {
            "Jan'25": 7900,
            "Feb'25": 7950,
            "Mar'25": 8100,
            "Apr'25": 8000,
            "May'25": 8000,
            "Jun'25": 8000,
            "Jul'25": 9000,
            "Aug'25": 9000,
            "Sep'25": 9000,
            "Oct'25": 9000,
            "Nov'25": 9000,
            "Dec'25": 9000,
          },
          v8: {
            "Jan'25": 19800,
            "Feb'25": 19800,
            "Mar'25": 20100,
            "Apr'25": 20000,
            "May'25": 20000,
            "Jun'25": 20000,
            "Jul'25": 22000,
            "Aug'25": 22000,
            "Sep'25": 22000,
            "Oct'25": 22000,
            "Nov'25": 22000,
            "Dec'25": 22000,
          },
          v9: {
            "Jan'25": 14800,
            "Feb'25": 4900,
            "Mar'25": 15200,
            "Apr'25": 5000,
            "May'25": 15000,
            "Jun'25": 5000,
            "Jul'25": 18000,
            "Aug'25": 6000,
            "Sep'25": 18000,
            "Oct'25": 6000,
            "Nov'25": 18000,
            "Dec'25": 6000,
          },
          v10: {
            "Jan'25": 29800,
            "Feb'25": 29900,
            "Mar'25": 30200,
            "Apr'25": 30000,
            "May'25": 30000,
            "Jun'25": 30000,
            "Jul'25": 35000,
            "Aug'25": 35000,
            "Sep'25": 35000,
            "Oct'25": 35000,
            "Nov'25": 35000,
            "Dec'25": 35000,
          },
        },
      },
      Budget: {
        vendorIds: [...vendorIds],
        expenses: {
          v1: {
            "Jan'25": 10000,
            "Feb'25": 10000,
            "Mar'25": 10000,
            "Apr'25": 10000,
            "May'25": 10000,
            "Jun'25": 10000,
            "Jul'25": 12000,
            "Aug'25": 12000,
            "Sep'25": 12000,
            "Oct'25": 12000,
            "Nov'25": 12000,
            "Dec'25": 12000,
          },
          v2: {
            "Jan'25": 25000,
            "Feb'25": 0,
            "Mar'25": 25000,
            "Apr'25": 0,
            "May'25": 25000,
            "Jun'25": 0,
            "Jul'25": 30000,
            "Aug'25": 0,
            "Sep'25": 30000,
            "Oct'25": 0,
            "Nov'25": 30000,
            "Dec'25": 0,
          },
          v3: {
            "Jan'25": 45000,
            "Feb'25": 45000,
            "Mar'25": 45000,
            "Apr'25": 50000,
            "May'25": 50000,
            "Jun'25": 50000,
            "Jul'25": 55000,
            "Aug'25": 55000,
            "Sep'25": 55000,
            "Oct'25": 60000,
            "Nov'25": 60000,
            "Dec'25": 60000,
          },
          v4: {
            "Jan'25": 5000,
            "Feb'25": 5000,
            "Mar'25": 5000,
            "Apr'25": 5000,
            "May'25": 5000,
            "Jun'25": 5000,
            "Jul'25": 5000,
            "Aug'25": 5000,
            "Sep'25": 5000,
            "Oct'25": 5000,
            "Nov'25": 5000,
            "Dec'25": 5000,
          },
          v5: {
            "Jan'25": 0,
            "Feb'25": 40000,
            "Mar'25": 0,
            "Apr'25": 40000,
            "May'25": 0,
            "Jun'25": 40000,
            "Jul'25": 0,
            "Aug'25": 45000,
            "Sep'25": 0,
            "Oct'25": 45000,
            "Nov'25": 0,
            "Dec'25": 45000,
          },
          v6: {
            "Jan'25": 3000,
            "Feb'25": 3000,
            "Mar'25": 3000,
            "Apr'25": 3000,
            "May'25": 3000,
            "Jun'25": 3000,
            "Jul'25": 3500,
            "Aug'25": 3500,
            "Sep'25": 3500,
            "Oct'25": 3500,
            "Nov'25": 3500,
            "Dec'25": 3500,
          },
          v7: {
            "Jan'25": 8000,
            "Feb'25": 8000,
            "Mar'25": 8000,
            "Apr'25": 8000,
            "May'25": 8000,
            "Jun'25": 8000,
            "Jul'25": 9000,
            "Aug'25": 9000,
            "Sep'25": 9000,
            "Oct'25": 9000,
            "Nov'25": 9000,
            "Dec'25": 9000,
          },
          v8: {
            "Jan'25": 20000,
            "Feb'25": 20000,
            "Mar'25": 20000,
            "Apr'25": 20000,
            "May'25": 20000,
            "Jun'25": 20000,
            "Jul'25": 22000,
            "Aug'25": 22000,
            "Sep'25": 22000,
            "Oct'25": 22000,
            "Nov'25": 22000,
            "Dec'25": 22000,
          },
          v9: {
            "Jan'25": 15000,
            "Feb'25": 5000,
            "Mar'25": 15000,
            "Apr'25": 5000,
            "May'25": 15000,
            "Jun'25": 5000,
            "Jul'25": 18000,
            "Aug'25": 6000,
            "Sep'25": 18000,
            "Oct'25": 6000,
            "Nov'25": 18000,
            "Dec'25": 6000,
          },
          v10: {
            "Jan'25": 30000,
            "Feb'25": 30000,
            "Mar'25": 30000,
            "Apr'25": 30000,
            "May'25": 30000,
            "Jun'25": 30000,
            "Jul'25": 35000,
            "Aug'25": 35000,
            "Sep'25": 35000,
            "Oct'25": 35000,
            "Nov'25": 35000,
            "Dec'25": 35000,
          },
        },
      },
    }

    // Copy over the existing expense data
    Object.keys(versionData).forEach((version) => {
      vendorIds.forEach((vendorId) => {
        initialVersionData[version as Version].expenses[vendorId] =
          versionData[version as Version].expenses[vendorId] || {}
      })
    })

    setVersionData(initialVersionData)

    // Reset change tracking after initialization
    resetChangeTracking()
  }

  // Helper function to reset change tracking
  const resetChangeTracking = () => {
    setChangeTracking({
      changedVendors: new Set<string>(),
      changedExpenses: {
        Actuals: new Set<string>(),
        "Live Forecast": new Set<string>(),
        Budget: new Set<string>(),
      },
      isDataChanged: false,
    })
  }

  // Call initializeData in a useEffect to set up the initial data
  useEffect(() => {
    if (!dataLoaded) {
      initializeData()
    }
  }, [dataLoaded])

  // Now, let's update the expenseData computed value to use the registry
  // Replace the expenseData definition with:

  // Get the current version's data
  const currentVersionData = versionData[version]

  // Compute the expenseData from the registry and current version
  const expenseData = {
    vendors: currentVersionData.vendorIds.map((id) => ({
      id,
      name: vendorRegistry[id]?.name || "",
      category: vendorRegistry[id]?.category || "",
      vendorCode: vendorRegistry[id]?.vendorCode || "",
    })),
    glAccounts: Object.fromEntries(currentVersionData.vendorIds.map((id) => [id, vendorRegistry[id]?.glAccount || ""])),
    costCenters: Object.fromEntries(
      currentVersionData.vendorIds.map((id) => [id, vendorRegistry[id]?.costCenter || ""]),
    ),
    expenses: currentVersionData.expenses,
  }

  // Now, let's update the addVendor function to use the registry
  // Replace the addVendor function with:

  const addVendor = async (name: string, glAccountValue: GLAccount, costCenterValue: CostCenter) => {
    try {
      // Ensure "All" is not used as a cost center for vendors
      if (costCenterValue === "All") {
        throw new Error("'All Cost Centers' is not a valid cost center for vendors")
      }

      // Generate a proper UUID for the vendor ID
      const vendorId = generateUUID()

      // Generate a unique vendor code
      const vendorCode = generateVendorCode()

      // Create the new vendor in the registry
      const newVendor: Vendor = {
        id: vendorId,
        name,
        category: glAccountValue,
        vendorCode,
        glAccount: glAccountValue,
        costCenter: costCenterValue,
      }

      // Add the vendor to the registry
      setVendorRegistry((prev) => ({
        ...prev,
        [vendorId]: newVendor,
      }))

      // Mark this vendor as changed
      setChangeTracking((prev) => ({
        ...prev,
        changedVendors: new Set([...prev.changedVendors, vendorId]),
        isDataChanged: true,
      }))

      // Create empty expenses object
      const emptyExpenses = {
        "Jan'25": 0,
        "Feb'25": 0,
        "Mar'25": 0,
        "Apr'25": 0,
        "May'25": 0,
        "Jun'25": 0,
        "Jul'25": 0,
        "Aug'25": 0,
        "Sep'25": 0,
        "Oct'25": 0,
        "Nov'25": 0,
        "Dec'25": 0,
      }

      // Add the vendor reference to ALL versions to ensure consistency
      setVersionData((prev) => {
        const newVersionData = { ...prev }

        // Add to all versions
        Object.keys(newVersionData).forEach((versionKey) => {
          const version = versionKey as Version
          newVersionData[version] = {
            ...newVersionData[version],
            vendorIds: [...newVersionData[version].vendorIds, vendorId],
            expenses: {
              ...newVersionData[version].expenses,
              [vendorId]: { ...emptyExpenses },
            },
          }
        })

        return newVersionData
      })

      // Mark this vendor's expenses as changed for all versions
      setChangeTracking((prev) => {
        const newChangedExpenses = { ...prev.changedExpenses }

        Object.keys(newChangedExpenses).forEach((versionKey) => {
          const version = versionKey as Version
          newChangedExpenses[version] = new Set([...newChangedExpenses[version], vendorId])
        })

        return {
          ...prev,
          changedExpenses: newChangedExpenses,
          isDataChanged: true,
        }
      })

      // Switch to Live Forecast version to allow editing
      setVersion("Live Forecast")

      // If a specific cost center is selected, update the selection to include the new vendor's cost center
      if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(costCenterValue)) {
        setSelectedCostCenters([...selectedCostCenters, costCenterValue])
      }

      console.log(`Vendor "${name}" added successfully with ID: ${vendorId}`)
      return vendorId
    } catch (error) {
      console.error("Error adding vendor:", error)
      setError({
        message: `Failed to add vendor: ${error.message}`,
        details: error,
      })
      throw error
    }
  }

  const editVendor = async (vendorId: string, name: string, glAccountValue: GLAccount, costCenterValue: CostCenter) => {
    try {
      // Ensure "All" is not used as a cost center for vendors
      if (costCenterValue === "All") {
        throw new Error("'All Cost Centers' is not a valid cost center for vendors")
      }

      // Get the current vendor from the registry
      const currentVendor = vendorRegistry[vendorId]
      if (!currentVendor) {
        throw new Error(`Vendor with ID ${vendorId} not found`)
      }

      // Update the vendor in the registry
      setVendorRegistry((prev) => ({
        ...prev,
        [vendorId]: {
          ...prev[vendorId],
          name,
          category: glAccountValue,
          glAccount: glAccountValue,
          costCenter: costCenterValue,
        },
      }))

      // Mark this vendor as changed
      setChangeTracking((prev) => ({
        ...prev,
        changedVendors: new Set([...prev.changedVendors, vendorId]),
        isDataChanged: true,
      }))

      console.log(`Vendor "${name}" updated successfully.`)
    } catch (error) {
      console.error("Error editing vendor:", error)
      setError({
        message: `Failed to edit vendor: ${error.message}`,
        details: error,
      })
      throw error
    }
  }

  const deleteVendor = async (vendorId: string) => {
    try {
      // Add to deleted vendor IDs set to track deletions for saving
      setDeletedVendorIds((prev) => new Set([...prev, vendorId]))

      // Remove the vendor from all versions
      setVersionData((prev) => {
        const newVersionData = { ...prev }

        // Remove vendor ID from each version
        Object.keys(newVersionData).forEach((versionKey) => {
          const version = versionKey as Version
          newVersionData[version] = {
            ...newVersionData[version],
            vendorIds: newVersionData[version].vendorIds.filter((id) => id !== vendorId),
            expenses: { ...newVersionData[version].expenses },
          }

          // Remove expenses for this vendor
          delete newVersionData[version].expenses[vendorId]
        })

        return newVersionData
      })

      // Remove the vendor from the registry
      setVendorRegistry((prev) => {
        const newRegistry = { ...prev }
        delete newRegistry[vendorId]
        return newRegistry
      })

      // Mark data as changed
      setChangeTracking((prev) => ({
        ...prev,
        isDataChanged: true,
      }))

      console.log(`Vendor with ID "${vendorId}" deleted successfully.`)
    } catch (error) {
      console.error("Error deleting vendor:", error)
      setError({
        message: `Failed to delete vendor: ${error.message}`,
        details: error,
      })
      throw error
    }
  }

  const deleteAllVendors = async () => {
    try {
      // Get all vendor IDs
      const allVendorIds = Object.keys(vendorRegistry)

      // Add all vendor IDs to deleted vendor IDs set
      setDeletedVendorIds((prev) => new Set([...prev, ...allVendorIds]))

      // Clear all versions
      setVersionData((prev) => {
        const newVersionData = { ...prev }

        // Clear vendor IDs and expenses from each version
        Object.keys(newVersionData).forEach((versionKey) => {
          const version = versionKey as Version
          newVersionData[version] = {
            vendorIds: [],
            expenses: {},
          }
        })

        return newVersionData
      })

      // Clear the vendor registry
      setVendorRegistry({})

      // Mark data as changed
      setChangeTracking((prev) => ({
        ...prev,
        isDataChanged: true,
      }))

      console.log("All vendors deleted successfully.")
    } catch (error) {
      console.error("Error deleting all vendors:", error)
      setError({
        message: `Failed to delete all vendors: ${error.message}`,
        details: error,
      })
      throw error
    }
  }

  // Synchronize data across all versions
  const synchronizeVersions = () => {
    try {
      // Get all vendor IDs
      const vendorIds = Object.keys(vendorRegistry)

      // Get all versions
      const versions: Version[] = ["Actuals", "Live Forecast", "Budget"]

      // Get the current version's data as the source
      const sourceVersion = version

      setVersionData((prev) => {
        const newVersionData = { ...prev }

        // For each vendor
        vendorIds.forEach((vendorId) => {
          // Get the expenses from the source version
          const sourceExpenses = prev[sourceVersion].expenses[vendorId] || {}

          // Apply these expenses to all versions
          versions.forEach((targetVersion) => {
            if (targetVersion !== sourceVersion) {
              newVersionData[targetVersion] = {
                ...newVersionData[targetVersion],
                expenses: {
                  ...newVersionData[targetVersion].expenses,
                  [vendorId]: { ...sourceExpenses },
                },
              }

              // Mark this vendor's expenses as changed for the target version
              setChangeTracking((prev) => ({
                ...prev,
                changedExpenses: {
                  ...prev.changedExpenses,
                  [targetVersion]: new Set([...prev.changedExpenses[targetVersion], vendorId]),
                },
                isDataChanged: true,
              }))
            }
          })
        })

        return newVersionData
      })

      // Show success message
      setError({
        message: `Data synchronized across all versions using ${sourceVersion} as source`,
        code: "SUCCESS",
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null)
      }, 3000)
    } catch (error) {
      console.error("Error synchronizing versions:", error)
      setError({
        message: `Failed to synchronize versions: ${error.message}`,
        details: error,
      })
    }
  }

  // Updated saveData function with change tracking optimization
  const saveData = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // If no data has changed, return early
      if (!changeTracking.isDataChanged && deletedVendorIds.size === 0) {
        console.log("No data changes detected, skipping save operation")
        setError({
          message: "No changes to save",
          code: "SUCCESS",
        })

        // Clear success message after 3 seconds
        setTimeout(() => {
          setError(null)
        }, 3000)

        setIsSaving(false)
        return
      }

      // Safety check: Make sure we're not accidentally deleting all vendors
      const vendorCount = Object.keys(vendorRegistry).length
      if (
        vendorCount === 0 &&
        !window.confirm(
          "You are about to save with no vendors. This will delete all vendors from the database. Are you sure?",
        )
      ) {
        setError({
          message: "Save operation cancelled",
          code: "CANCELLED",
        })
        setIsSaving(false)
        return
      }

      // Synchronize closed periods before saving
      syncClosedPeriods()

      // Validate data before saving
      validateData()

      console.log("Saving data to database...")
      console.log("Changed vendors to save:", changeTracking.changedVendors.size)

      // Check if Supabase is initialized
      if (!db.supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.")
      }

      // Before saving, ensure all versions have the same vendors
      // This is necessary for data consistency
      setVersionData((prev) => {
        const allVendorIds = new Set<string>()

        // Collect all vendor IDs from all versions
        Object.values(prev).forEach((versionData) => {
          versionData.vendorIds.forEach((id) => allVendorIds.add(id))
        })

        // Create empty expenses object for vendors that don't have expenses in other versions
        const emptyExpenses = {
          "Jan'25": 0,
          "Feb'25": 0,
          "Mar'25": 0,
          "Apr'25": 0,
          "May'25": 0,
          "Jun'25": 0,
          "Jul'25": 0,
          "Aug'25": 0,
          "Sep'25": 0,
          "Oct'25": 0,
          "Nov'25": 0,
          "Dec'25": 0,
        }

        // Update all versions to include all vendors
        const newVersionData = { ...prev }

        Object.keys(newVersionData).forEach((versionKey) => {
          const version = versionKey as Version
          const currentVendorIds = new Set(newVersionData[version].vendorIds)

          // Add missing vendor IDs to this version
          const missingVendorIds = [...allVendorIds].filter((id) => !currentVendorIds.has(id))

          if (missingVendorIds.length > 0) {
            newVersionData[version] = {
              ...newVersionData[version],
              vendorIds: [...newVersionData[version].vendorIds, ...missingVendorIds],
              expenses: {
                ...newVersionData[version].expenses,
                ...Object.fromEntries(missingVendorIds.map((id) => [id, { ...emptyExpenses }])),
              },
            }
          }
        })

        return newVersionData
      })

      // IMPORTANT: Get current vendors from database to avoid accidental deletion
      const currentDbVendors = await db.getVendors()
      const currentDbVendorIds = new Set(currentDbVendors.map((v) => v.id))

      // Only delete vendors that were explicitly marked for deletion
      // and filter out any that might have been accidentally included
      const vendorsToActuallyDelete = Array.from(deletedVendorIds).filter((id) => currentDbVendorIds.has(id)) // Only delete if it exists in DB

      console.log(`Vendors explicitly marked for deletion: ${deletedVendorIds.size}`)
      console.log(`Vendors that will actually be deleted: ${vendorsToActuallyDelete.length}`)

      // Only save vendors that have been changed or are new
      const vendorsToSave = Array.from(changeTracking.changedVendors)
        .filter((id) => vendorRegistry[id]) // Filter out deleted vendors
        .map((id) => ({
          id,
          name: vendorRegistry[id].name,
          category: vendorRegistry[id].category,
          vendorCode: vendorRegistry[id].vendorCode,
          gl_account: vendorRegistry[id].glAccount,
          cost_center: vendorRegistry[id].costCenter,
        }))

      // Save changed vendors
      if (vendorsToSave.length > 0) {
        await expenseDataService.saveVendors(vendorsToSave)
        console.log(`Saved ${vendorsToSave.length} changed vendors to database`)
      }

      // Process deleted vendors - ONLY those explicitly marked for deletion
      if (vendorsToActuallyDelete.length > 0) {
        for (const vendorId of vendorsToActuallyDelete) {
          await expenseDataService.deleteVendor(vendorId)
          console.log(`Deleted vendor with ID ${vendorId} from database`)
        }
      }

      // Then save expense data for each version, but only for changed vendors
      const versions: Version[] = ["Actuals", "Live Forecast", "Budget"]
      for (const version of versions) {
        // Get the changed vendor IDs for this version
        const changedVendorIds = Array.from(changeTracking.changedExpenses[version])
          // Only include vendors that still exist in the registry
          .filter((id) => vendorRegistry[id])

        if (changedVendorIds.length > 0) {
          const versionExpenses: Record<string, Record<string, number>> = {}

          // Get expenses for changed vendors in this version
          changedVendorIds.forEach((vendorId) => {
            if (versionData[version].expenses[vendorId]) {
              versionExpenses[vendorId] = versionData[version].expenses[vendorId]
            }
          })

          // Save expense data for this version, but only for changed vendors
          if (Object.keys(versionExpenses).length > 0) {
            try {
              await expenseDataService.saveVersionExpenseData(version, versionExpenses)
              console.log(`Saved expense data for ${Object.keys(versionExpenses).length} vendors in ${version}`)
            } catch (error) {
              console.error(`Error saving expense data for ${version}:`, error)
              // Continue with other versions instead of stopping completely
            }
          }
        }
      }

      // Clear deleted vendor IDs after successful save
      setDeletedVendorIds(new Set())

      // Reset change tracking after successful save
      resetChangeTracking()

      console.log("Data saved successfully")

      // Show success message
      setError({
        message: "Data saved successfully",
        code: "SUCCESS",
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null)
      }, 3000)
    } catch (error) {
      console.error("Error saving data:", error)
      setError({
        message: `Failed to save data: ${error.message}`,
        details: error,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      clearError()

      // Try to load data from Supabase
      try {
        // Load all expense data
        const data = await expenseDataService.loadExpenseData()

        // Create vendor registry from loaded data
        const loadedRegistry: Record<string, Vendor> = {}
        data.vendors.forEach((vendor) => {
          loadedRegistry[vendor.id] = {
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            vendorCode: vendor.vendorCode,
            glAccount: data.glAccounts[vendor.id],
            costCenter: data.costCenters[vendor.id],
          }
        })

        setVendorRegistry(loadedRegistry)

        // Create version data with references to vendors
        const loadedVersionData: Record<Version, VersionData> = {
          Actuals: {
            vendorIds: data.vendors.map((v) => v.id),
            expenses: await expenseDataService.loadExpenseDataForVersion("Actuals"),
          },
          "Live Forecast": {
            vendorIds: data.vendors.map((v) => v.id),
            expenses: await expenseDataService.loadExpenseDataForVersion("Live Forecast"),
          },
          Budget: {
            vendorIds: data.vendors.map((v) => v.id),
            expenses: await expenseDataService.loadExpenseDataForVersion("Budget"),
          },
        }

        setVersionData(loadedVersionData)

        // Reset deleted vendor IDs after loading
        setDeletedVendorIds(new Set())

        // Reset change tracking after loading
        resetChangeTracking()

        setDataLoaded(true)
        console.log("Data loaded successfully from Supabase")

        // Synchronize closed periods after loading
        syncClosedPeriods()
      } catch (error) {
        console.log("No data found in Supabase or error loading, using sample data", error)
        setError({
          message: "Failed to load data from database, using sample data",
          details: error,
        })
        // If loading from Supabase fails, we'll use the sample data that's already set
        initializeData()
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError({
        message: `Failed to load data: ${error.message}`,
        details: error,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncClosedPeriods = () => {
    // This function is now a no-op since we've removed the closed period concept
    return
  }

  const updateExpenseData = (vendorId: string, month: string, amount: number) => {
    try {
      // Check if the value is actually changing
      const currentAmount = versionData[version].expenses[vendorId]?.[month] || 0
      if (currentAmount === amount) {
        return // No change, exit early
      }

      // Ensure the vendor exists in the current version's vendor list
      setVersionData((prev) => {
        const newVersionData = { ...prev }

        // Make sure the vendor ID is in the vendorIds array
        if (!newVersionData[version].vendorIds.includes(vendorId)) {
          newVersionData[version].vendorIds = [...newVersionData[version].vendorIds, vendorId]
        }

        // Make sure the vendor has an expenses object
        if (!newVersionData[version].expenses[vendorId]) {
          newVersionData[version].expenses[vendorId] = {}
        }

        // Update the expense amount
        newVersionData[version] = {
          ...newVersionData[version],
          expenses: {
            ...newVersionData[version].expenses,
            [vendorId]: {
              ...newVersionData[version].expenses[vendorId],
              [month]: amount,
            },
          },
        }

        return newVersionData
      })

      // Mark this vendor's expenses as changed for this version
      setChangeTracking((prev) => ({
        ...prev,
        changedExpenses: {
          ...prev.changedExpenses,
          [version]: new Set([...prev.changedExpenses[version], vendorId]),
        },
        isDataChanged: true,
      }))
    } catch (error) {
      console.error("Error updating expense data:", error)
      setError({
        message: "Failed to update expense data",
        details: error,
      })
    }
  }

  const validateData = () => {
    try {
      // Basic validation can still be performed here if needed
      // But we're removing the closed period validation
    } catch (error) {
      console.error("Data validation error:", error)
      throw error
    }
  }

  // Function to check if a period is closed - now always returns false
  const isClosedPeriod = (month: string) => {
    // We're keeping this function for backward compatibility, but it always returns false now
    return false
  }

  // Function to check if a period is a forecast period
  const isForecastPeriod = (month: string) => {
    return FORECAST_PERIODS.includes(month)
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  // Load data on initial mount
  useEffect(() => {
    loadData()
  }, [])

  // Update the ExpensePlannerContext.Provider value to include error handling
  return (
    <ExpensePlannerContext.Provider
      value={{
        version,
        setVersion,
        timeGranularity,
        setTimeGranularity,
        glAccount,
        setGLAccount,
        selectedCostCenters,
        setSelectedCostCenters,
        year,
        setYear,
        expenseData,
        updateExpenseData,
        isClosedPeriod,
        isForecastPeriod,
        addVendor,
        editVendor,
        deleteVendor,
        deleteAllVendors,
        saveData,
        loadData,
        isLoading,
        isSaving,
        error,
        clearError,
        synchronizeVersions,
      }}
    >
      {children}
    </ExpensePlannerContext.Provider>
  )
}

export function useExpensePlanner() {
  const context = useContext(ExpensePlannerContext)
  if (context === undefined) {
    throw new Error("useExpensePlanner must be used within an ExpensePlannerProvider")
  }
  return context
}
