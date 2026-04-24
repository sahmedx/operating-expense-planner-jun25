"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { expenseDataService } from "@/lib/expense-data-service"
import { generateVendorCode } from "@/lib/supabase"

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

const FORECAST_PERIODS = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25"]
const MONTHS = [
  "Jan'25", "Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25",
  "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25",
]
const VERSIONS: Version[] = ["Actuals", "Live Forecast", "Budget"]

export type AppError = {
  message: string
  code?: string
  details?: unknown
}

type Vendor = {
  id: string
  name: string
  category: string
  vendorCode: string
  glAccount: GLAccount
  costCenter: CostCenter
}

type VersionData = {
  vendorIds: string[]
  expenses: Record<string, Record<string, number>>
}

type ChangeTracking = {
  changedVendors: Set<string>
  changedExpenses: Record<Version, Set<string>>
  isDataChanged: boolean
}

type ExpensePlannerContextType = {
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
  expenseData: {
    vendors: { id: string; name: string; category: string; vendorCode: string }[]
    glAccounts: Record<string, string>
    costCenters: Record<string, string>
    expenses: Record<string, Record<string, number>>
  }
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

const SAMPLE_VENDORS: Vendor[] = [
  { id: "v1",  name: "Salesforce",     category: "Software",              vendorCode: "VND-SF01", glAccount: "Software",              costCenter: "Sales" },
  { id: "v2",  name: "Accenture",      category: "Professional Services", vendorCode: "VND-AC01", glAccount: "Professional Services", costCenter: "Finance" },
  { id: "v3",  name: "AWS",            category: "Software",              vendorCode: "VND-AWS1", glAccount: "Software",              costCenter: "Engineering" },
  { id: "v4",  name: "Slack",          category: "Software",              vendorCode: "VND-SL01", glAccount: "Software",              costCenter: "Sales" },
  { id: "v5",  name: "Deloitte",       category: "Professional Services", vendorCode: "VND-DL01", glAccount: "Professional Services", costCenter: "Finance" },
  { id: "v6",  name: "Zoom",           category: "Software",              vendorCode: "VND-ZM01", glAccount: "Software",              costCenter: "Engineering" },
  { id: "v7",  name: "Adobe",          category: "Software",              vendorCode: "VND-AD01", glAccount: "Software",              costCenter: "Marketing" },
  { id: "v8",  name: "WeWork",         category: "Facilities",            vendorCode: "VND-WW01", glAccount: "Facilities",            costCenter: "Finance" },
  { id: "v9",  name: "Delta Airlines", category: "Travel",                vendorCode: "VND-DA01", glAccount: "Travel",                costCenter: "Sales" },
  { id: "v10", name: "Microsoft",      category: "Software",              vendorCode: "VND-MS01", glAccount: "Software",              costCenter: "Engineering" },
]

const SAMPLE_AMOUNTS: Record<Version, Record<string, number[]>> = {
  Actuals: {
    v1:  [9800,  9900,  10100,     0,     0,     0,     0,     0,     0,     0,     0,     0],
    v2:  [24500,    0,  25200,     0,     0,     0,     0,     0,     0,     0,     0,     0],
    v3:  [44800, 45100, 45300,     0,     0,     0,     0,     0,     0,     0,     0,     0],
    v4:  [4900,  5100,  5050,      0,     0,     0,     0,     0,     0,     0,     0,     0],
    v5:  [0,     39800,    0,      0,     0,     0,     0,     0,     0,     0,     0,     0],
    v6:  [2950,  2950,  3100,      0,     0,     0,     0,     0,     0,     0,     0,     0],
    v7:  [7900,  7950,  8100,      0,     0,     0,     0,     0,     0,     0,     0,     0],
    v8:  [19800, 19800, 20100,     0,     0,     0,     0,     0,     0,     0,     0,     0],
    v9:  [14800, 4900,  15200,     0,     0,     0,     0,     0,     0,     0,     0,     0],
    v10: [29800, 29900, 30200,     0,     0,     0,     0,     0,     0,     0,     0,     0],
  },
  "Live Forecast": {
    v1:  [9800,  9900,  10100, 10000, 10000, 10000, 12000, 12000, 12000, 12000, 12000, 12000],
    v2:  [24500,    0,  25200,     0, 25000,     0, 30000,     0, 30000,     0, 30000,     0],
    v3:  [44800, 45100, 45300, 50000, 50000, 50000, 55000, 55000, 55000, 60000, 60000, 60000],
    v4:  [4900,  5100,  5050,  5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000],
    v5:  [0,     39800,    0,  40000,     0, 40000,     0, 45000,     0, 45000,     0, 45000],
    v6:  [2950,  2950,  3100,  3000,  3000,  3000,  3500,  3500,  3500,  3500,  3500,  3500],
    v7:  [7900,  7950,  8100,  8000,  8000,  8000,  9000,  9000,  9000,  9000,  9000,  9000],
    v8:  [19800, 19800, 20100, 20000, 20000, 20000, 22000, 22000, 22000, 22000, 22000, 22000],
    v9:  [14800, 4900,  15200, 5000,  15000, 5000,  18000, 6000,  18000, 6000,  18000, 6000],
    v10: [29800, 29900, 30200, 30000, 30000, 30000, 35000, 35000, 35000, 35000, 35000, 35000],
  },
  Budget: {
    v1:  [10000, 10000, 10000, 10000, 10000, 10000, 12000, 12000, 12000, 12000, 12000, 12000],
    v2:  [25000,    0,  25000,     0, 25000,     0, 30000,     0, 30000,     0, 30000,     0],
    v3:  [45000, 45000, 45000, 50000, 50000, 50000, 55000, 55000, 55000, 60000, 60000, 60000],
    v4:  [5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000,  5000],
    v5:  [0,     40000,    0,  40000,     0, 40000,     0, 45000,     0, 45000,     0, 45000],
    v6:  [3000,  3000,  3000,  3000,  3000,  3000,  3500,  3500,  3500,  3500,  3500,  3500],
    v7:  [8000,  8000,  8000,  8000,  8000,  8000,  9000,  9000,  9000,  9000,  9000,  9000],
    v8:  [20000, 20000, 20000, 20000, 20000, 20000, 22000, 22000, 22000, 22000, 22000, 22000],
    v9:  [15000, 5000,  15000, 5000,  15000, 5000,  18000, 6000,  18000, 6000,  18000, 6000],
    v10: [30000, 30000, 30000, 30000, 30000, 30000, 35000, 35000, 35000, 35000, 35000, 35000],
  },
}

function createEmptyExpenses(): Record<string, number> {
  return Object.fromEntries(MONTHS.map((month) => [month, 0]))
}

function createEmptyVersionData(): Record<Version, VersionData> {
  return {
    Actuals: { vendorIds: [], expenses: {} },
    "Live Forecast": { vendorIds: [], expenses: {} },
    Budget: { vendorIds: [], expenses: {} },
  }
}

function createEmptyChangeTracking(): ChangeTracking {
  return {
    changedVendors: new Set<string>(),
    changedExpenses: {
      Actuals: new Set<string>(),
      "Live Forecast": new Set<string>(),
      Budget: new Set<string>(),
    },
    isDataChanged: false,
  }
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function buildSampleVendorRegistry(): Record<string, Vendor> {
  return Object.fromEntries(SAMPLE_VENDORS.map((v) => [v.id, v]))
}

function buildSampleVersionData(): Record<Version, VersionData> {
  const vendorIds = SAMPLE_VENDORS.map((v) => v.id)
  const result = createEmptyVersionData()

  for (const version of VERSIONS) {
    result[version].vendorIds = [...vendorIds]
    for (const vendorId of vendorIds) {
      const amounts = SAMPLE_AMOUNTS[version][vendorId]
      result[version].expenses[vendorId] = Object.fromEntries(MONTHS.map((month, i) => [month, amounts[i]]))
    }
  }

  return result
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

  const [vendorRegistry, setVendorRegistry] = useState<Record<string, Vendor>>({})
  const [versionData, setVersionData] = useState<Record<Version, VersionData>>(createEmptyVersionData)
  const [changeTracking, setChangeTracking] = useState<ChangeTracking>(createEmptyChangeTracking)

  const resetChangeTracking = useCallback(() => {
    setChangeTracking(createEmptyChangeTracking())
  }, [])

  const initializeData = useCallback(() => {
    setVendorRegistry(buildSampleVendorRegistry())
    setVersionData(buildSampleVersionData())
    resetChangeTracking()
  }, [resetChangeTracking])

  useEffect(() => {
    if (!dataLoaded) initializeData()
  }, [dataLoaded, initializeData])

  const currentVersionData = versionData[version]

  const expenseData = useMemo(
    () => ({
      vendors: currentVersionData.vendorIds.map((id) => ({
        id,
        name: vendorRegistry[id]?.name || "",
        category: vendorRegistry[id]?.category || "",
        vendorCode: vendorRegistry[id]?.vendorCode || "",
      })),
      glAccounts: Object.fromEntries(
        currentVersionData.vendorIds.map((id) => [id, vendorRegistry[id]?.glAccount || ""]),
      ),
      costCenters: Object.fromEntries(
        currentVersionData.vendorIds.map((id) => [id, vendorRegistry[id]?.costCenter || ""]),
      ),
      expenses: currentVersionData.expenses,
    }),
    [currentVersionData, vendorRegistry],
  )

  const addVendor = async (name: string, glAccountValue: GLAccount, costCenterValue: CostCenter) => {
    try {
      if (costCenterValue === "All") {
        throw new Error("'All Cost Centers' is not a valid cost center for vendors")
      }

      const vendorId = generateUUID()
      const vendorCode = generateVendorCode()

      const newVendor: Vendor = {
        id: vendorId,
        name,
        category: glAccountValue,
        vendorCode,
        glAccount: glAccountValue,
        costCenter: costCenterValue,
      }

      setVendorRegistry((prev) => ({ ...prev, [vendorId]: newVendor }))

      setVersionData((prev) => {
        const next = { ...prev }
        for (const v of VERSIONS) {
          next[v] = {
            vendorIds: [...next[v].vendorIds, vendorId],
            expenses: { ...next[v].expenses, [vendorId]: createEmptyExpenses() },
          }
        }
        return next
      })

      setChangeTracking((prev) => {
        const changedExpenses = { ...prev.changedExpenses }
        for (const v of VERSIONS) {
          changedExpenses[v] = new Set([...changedExpenses[v], vendorId])
        }
        return {
          changedVendors: new Set([...prev.changedVendors, vendorId]),
          changedExpenses,
          isDataChanged: true,
        }
      })

      setVersion("Live Forecast")

      if (!selectedCostCenters.includes("All") && !selectedCostCenters.includes(costCenterValue)) {
        setSelectedCostCenters([...selectedCostCenters, costCenterValue])
      }

      return vendorId
    } catch (error) {
      console.error("Error adding vendor:", error)
      setError({ message: `Failed to add vendor: ${errorMessage(error)}`, details: error })
      throw error
    }
  }

  const editVendor = async (
    vendorId: string,
    name: string,
    glAccountValue: GLAccount,
    costCenterValue: CostCenter,
  ) => {
    try {
      if (costCenterValue === "All") {
        throw new Error("'All Cost Centers' is not a valid cost center for vendors")
      }
      if (!vendorRegistry[vendorId]) {
        throw new Error(`Vendor with ID ${vendorId} not found`)
      }

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

      setChangeTracking((prev) => ({
        ...prev,
        changedVendors: new Set([...prev.changedVendors, vendorId]),
        isDataChanged: true,
      }))
    } catch (error) {
      console.error("Error editing vendor:", error)
      setError({ message: `Failed to edit vendor: ${errorMessage(error)}`, details: error })
      throw error
    }
  }

  const deleteVendor = async (vendorId: string) => {
    try {
      setDeletedVendorIds((prev) => new Set([...prev, vendorId]))

      setVersionData((prev) => {
        const next = { ...prev }
        for (const v of VERSIONS) {
          const expenses = { ...next[v].expenses }
          delete expenses[vendorId]
          next[v] = {
            vendorIds: next[v].vendorIds.filter((id) => id !== vendorId),
            expenses,
          }
        }
        return next
      })

      setVendorRegistry((prev) => {
        const next = { ...prev }
        delete next[vendorId]
        return next
      })

      setChangeTracking((prev) => ({ ...prev, isDataChanged: true }))
    } catch (error) {
      console.error("Error deleting vendor:", error)
      setError({ message: `Failed to delete vendor: ${errorMessage(error)}`, details: error })
      throw error
    }
  }

  const deleteAllVendors = async () => {
    try {
      const allVendorIds = Object.keys(vendorRegistry)
      setDeletedVendorIds((prev) => new Set([...prev, ...allVendorIds]))
      setVersionData(createEmptyVersionData())
      setVendorRegistry({})
      setChangeTracking((prev) => ({ ...prev, isDataChanged: true }))
    } catch (error) {
      console.error("Error deleting all vendors:", error)
      setError({ message: `Failed to delete all vendors: ${errorMessage(error)}`, details: error })
      throw error
    }
  }

  const synchronizeVersions = () => {
    try {
      const sourceVersion = version
      const vendorIds = Object.keys(vendorRegistry)

      setVersionData((prev) => {
        const next = { ...prev }
        for (const targetVersion of VERSIONS) {
          if (targetVersion === sourceVersion) continue

          const expenses = { ...next[targetVersion].expenses }
          for (const vendorId of vendorIds) {
            expenses[vendorId] = { ...(prev[sourceVersion].expenses[vendorId] || {}) }
          }
          next[targetVersion] = { ...next[targetVersion], expenses }
        }
        return next
      })

      setChangeTracking((prev) => {
        const changedExpenses = { ...prev.changedExpenses }
        for (const targetVersion of VERSIONS) {
          if (targetVersion === sourceVersion) continue
          changedExpenses[targetVersion] = new Set([...changedExpenses[targetVersion], ...vendorIds])
        }
        return { ...prev, changedExpenses, isDataChanged: true }
      })

      setError({
        message: `Data synchronized across all versions using ${sourceVersion} as source`,
        code: "SUCCESS",
      })
      setTimeout(() => setError(null), 3000)
    } catch (error) {
      console.error("Error synchronizing versions:", error)
      setError({ message: `Failed to synchronize versions: ${errorMessage(error)}`, details: error })
    }
  }

  const saveData = async () => {
    try {
      setIsSaving(true)
      setError(null)

      if (!changeTracking.isDataChanged && deletedVendorIds.size === 0) {
        setError({ message: "No changes to save", code: "SUCCESS" })
        setTimeout(() => setError(null), 3000)
        setIsSaving(false)
        return
      }

      const vendorCount = Object.keys(vendorRegistry).length
      if (
        vendorCount === 0 &&
        !window.confirm(
          "You are about to save with no vendors. This will delete all vendors from the database. Are you sure?",
        )
      ) {
        setError({ message: "Save operation cancelled", code: "CANCELLED" })
        setIsSaving(false)
        return
      }

      // Ensure all versions reference every vendor before saving, for consistency.
      setVersionData((prev) => {
        const allVendorIds = new Set<string>()
        for (const v of VERSIONS) {
          for (const id of prev[v].vendorIds) allVendorIds.add(id)
        }

        const next = { ...prev }
        for (const v of VERSIONS) {
          const currentIds = new Set(next[v].vendorIds)
          const missingIds = [...allVendorIds].filter((id) => !currentIds.has(id))

          if (missingIds.length > 0) {
            next[v] = {
              vendorIds: [...next[v].vendorIds, ...missingIds],
              expenses: {
                ...next[v].expenses,
                ...Object.fromEntries(missingIds.map((id) => [id, createEmptyExpenses()])),
              },
            }
          }
        }
        return next
      })

      const vendorsToSave = [...changeTracking.changedVendors]
        .filter((id) => vendorRegistry[id])
        .map((id) => ({
          id,
          name: vendorRegistry[id].name,
          category: vendorRegistry[id].category,
          vendorCode: vendorRegistry[id].vendorCode,
          gl_account: vendorRegistry[id].glAccount,
          cost_center: vendorRegistry[id].costCenter,
        }))

      if (vendorsToSave.length > 0) {
        await expenseDataService.saveVendors(vendorsToSave)
      }

      for (const vendorId of deletedVendorIds) {
        await expenseDataService.deleteVendor(vendorId)
      }

      for (const v of VERSIONS) {
        const changedVendorIds = [...changeTracking.changedExpenses[v]].filter((id) => vendorRegistry[id])
        if (changedVendorIds.length === 0) continue

        const versionExpenses: Record<string, Record<string, number>> = {}
        for (const vendorId of changedVendorIds) {
          if (versionData[v].expenses[vendorId]) {
            versionExpenses[vendorId] = versionData[v].expenses[vendorId]
          }
        }

        if (Object.keys(versionExpenses).length === 0) continue

        try {
          await expenseDataService.saveVersionExpenseData(v, versionExpenses)
        } catch (saveError) {
          console.error(`Error saving expense data for ${v}:`, saveError)
          // Continue with other versions instead of stopping completely
        }
      }

      setDeletedVendorIds(new Set())
      resetChangeTracking()

      setError({ message: "Data saved successfully", code: "SUCCESS" })
      setTimeout(() => setError(null), 3000)
    } catch (error) {
      console.error("Error saving data:", error)
      setError({ message: `Failed to save data: ${errorMessage(error)}`, details: error })
    } finally {
      setIsSaving(false)
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      try {
        const data = await expenseDataService.loadExpenseData()

        const loadedRegistry: Record<string, Vendor> = {}
        for (const vendor of data.vendors) {
          loadedRegistry[vendor.id] = {
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            vendorCode: vendor.vendorCode,
            glAccount: data.glAccounts[vendor.id] as GLAccount,
            costCenter: data.costCenters[vendor.id] as CostCenter,
          }
        }
        setVendorRegistry(loadedRegistry)

        const vendorIds = data.vendors.map((v) => v.id)
        const [actuals, liveForecast, budget] = await Promise.all([
          expenseDataService.loadExpenseDataForVersion("Actuals"),
          expenseDataService.loadExpenseDataForVersion("Live Forecast"),
          expenseDataService.loadExpenseDataForVersion("Budget"),
        ])

        setVersionData({
          Actuals: { vendorIds: [...vendorIds], expenses: actuals },
          "Live Forecast": { vendorIds: [...vendorIds], expenses: liveForecast },
          Budget: { vendorIds: [...vendorIds], expenses: budget },
        })

        setDeletedVendorIds(new Set())
        resetChangeTracking()
        setDataLoaded(true)
      } catch (loadError) {
        console.log("No data found or error loading, using sample data", loadError)
        setError({
          message: "Failed to load data from database, using sample data",
          details: loadError,
        })
        initializeData()
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError({ message: `Failed to load data: ${errorMessage(error)}`, details: error })
    } finally {
      setIsLoading(false)
    }
  }

  const updateExpenseData = (vendorId: string, month: string, amount: number) => {
    try {
      const currentAmount = versionData[version].expenses[vendorId]?.[month] || 0
      if (currentAmount === amount) return

      setVersionData((prev) => {
        const current = prev[version]
        const vendorIds = current.vendorIds.includes(vendorId)
          ? current.vendorIds
          : [...current.vendorIds, vendorId]

        return {
          ...prev,
          [version]: {
            vendorIds,
            expenses: {
              ...current.expenses,
              [vendorId]: { ...(current.expenses[vendorId] || {}), [month]: amount },
            },
          },
        }
      })

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
      setError({ message: "Failed to update expense data", details: error })
    }
  }

  // Kept for backward compatibility with the public API; closed-period logic has been removed.
  const isClosedPeriod = (_month: string) => false

  const isForecastPeriod = (month: string) => FORECAST_PERIODS.includes(month)

  const clearError = () => setError(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
