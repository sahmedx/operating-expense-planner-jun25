import { db, type Vendor as DbVendor, type ExpenseData as DbExpenseData, generateVendorCode } from "./supabase"

type Version = "Actuals" | "Live Forecast" | "Budget"

export type AppVendor = {
  id: string
  name: string
  category: string
  vendorCode: string
}

export type ExpenseDataState = {
  vendors: AppVendor[]
  glAccounts: Record<string, string>
  costCenters: Record<string, string>
  expenses: Record<string, Record<string, number>>
}

type VendorSaveInput = {
  id: string
  name: string
  category: string
  vendorCode: string
  gl_account: string
  cost_center: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function toDbVendor(
  vendor: Pick<AppVendor, "name" | "category" | "vendorCode">,
  glAccount: string,
  costCenter: string,
): Omit<DbVendor, "id" | "created_at" | "updated_at"> {
  return {
    name: vendor.name,
    category: vendor.category,
    gl_account: glAccount,
    cost_center: costCenter,
    vendor_code: vendor.vendorCode,
  }
}

function expensesByVendor(entries: DbExpenseData[]): Record<string, Record<string, number>> {
  const expenses: Record<string, Record<string, number>> = {}
  for (const entry of entries) {
    if (!expenses[entry.vendor_id]) expenses[entry.vendor_id] = {}
    expenses[entry.vendor_id][entry.month] = Number(entry.amount)
  }
  return expenses
}

export const expenseDataService = {
  async loadExpenseData(): Promise<ExpenseDataState> {
    try {
      const [dbVendors, dbExpenseData] = await Promise.all([db.getVendors(), db.getExpenseData()])

      const vendors: AppVendor[] = []
      const glAccounts: Record<string, string> = {}
      const costCenters: Record<string, string> = {}
      const expenses: Record<string, Record<string, number>> = {}

      for (const dbVendor of dbVendors) {
        vendors.push({
          id: dbVendor.id,
          name: dbVendor.name,
          category: dbVendor.category,
          vendorCode: dbVendor.vendor_code || generateVendorCode(),
        })
        glAccounts[dbVendor.id] = dbVendor.gl_account
        costCenters[dbVendor.id] = dbVendor.cost_center
        expenses[dbVendor.id] = {}
      }

      for (const entry of dbExpenseData) {
        if (!expenses[entry.vendor_id]) expenses[entry.vendor_id] = {}
        expenses[entry.vendor_id][entry.month] = Number(entry.amount)
      }

      return { vendors, glAccounts, costCenters, expenses }
    } catch (error) {
      console.error("Error loading expense data:", error)
      throw new Error(`Failed to load expense data: ${errorMessage(error)}`)
    }
  },

  async saveExpenseData(version: Version, data: ExpenseDataState): Promise<void> {
    try {
      console.log(`Saving ${version} data to database...`)

      const currentVendorIds = new Set((await db.getVendors()).map((v) => v.id))
      const newVendorIds = new Set(data.vendors.map((v) => v.id))

      const vendorsToDelete = [...currentVendorIds].filter((id) => !newVendorIds.has(id))
      for (const vendorId of vendorsToDelete) {
        await db.deleteVendor(vendorId)
      }

      for (const vendor of data.vendors) {
        const payload = toDbVendor(vendor, data.glAccounts[vendor.id], data.costCenters[vendor.id])
        if (currentVendorIds.has(vendor.id)) {
          await db.updateVendor(vendor.id, payload)
        } else {
          await db.saveVendor(payload)
        }
      }

      for (const vendor of data.vendors) {
        const months = Object.keys(data.expenses[vendor.id] || {})
        if (months.length === 0) continue

        const batch: Omit<DbExpenseData, "id" | "created_at" | "updated_at">[] = months.map((month) => ({
          vendor_id: vendor.id,
          version,
          month,
          amount: data.expenses[vendor.id][month] || 0,
        }))

        await db.saveExpenseDataBatch(batch)
      }

      console.log(`Successfully saved ${version} data`)
    } catch (error) {
      console.error(`Error saving ${version} expense data:`, error)
      throw new Error(`Failed to save ${version} expense data: ${errorMessage(error)}`)
    }
  },

  async loadExpenseDataForVersion(version: Version): Promise<Record<string, Record<string, number>>> {
    try {
      const dbExpenseData = await db.getExpenseData(version)
      return expensesByVendor(dbExpenseData)
    } catch (error) {
      console.error(`Error loading ${version} expense data:`, error)
      throw new Error(`Failed to load ${version} expense data: ${errorMessage(error)}`)
    }
  },

  async deleteVendor(vendorId: string): Promise<void> {
    try {
      await db.deleteVendor(vendorId)
    } catch (error) {
      console.error("Error deleting vendor:", error)
      throw new Error(`Failed to delete vendor: ${errorMessage(error)}`)
    }
  },

  async editVendor(vendorId: string, name: string, glAccount: string, costCenter: string): Promise<void> {
    try {
      await db.updateVendor(vendorId, {
        name,
        category: glAccount,
        gl_account: glAccount,
        cost_center: costCenter,
      })
    } catch (error) {
      console.error("Error updating vendor:", error)
      throw new Error(`Failed to update vendor: ${errorMessage(error)}`)
    }
  },

  async saveVendors(vendors: VendorSaveInput[]): Promise<void> {
    try {
      console.log(`Saving ${vendors.length} vendors to database...`)

      const currentVendorIds = new Set((await db.getVendors()).map((v) => v.id))

      for (const vendor of vendors) {
        const payload = {
          name: vendor.name,
          category: vendor.category,
          gl_account: vendor.gl_account,
          cost_center: vendor.cost_center,
          vendor_code: vendor.vendorCode,
        }

        if (currentVendorIds.has(vendor.id)) {
          await db.updateVendor(vendor.id, payload)
        } else {
          await db.saveVendor(payload, vendor.id)
        }
      }

      console.log(`Successfully saved ${vendors.length} vendors`)
    } catch (error) {
      console.error("Error saving vendors:", error)
      throw new Error(`Failed to save vendors: ${errorMessage(error)}`)
    }
  },

  async saveVersionExpenseData(version: Version, expenses: Record<string, Record<string, number>>): Promise<void> {
    try {
      const vendorIds = Object.keys(expenses)
      if (vendorIds.length === 0) return

      const existingVendorIds = new Set(
        (await db.getVendors()).filter((v) => vendorIds.includes(v.id)).map((v) => v.id),
      )

      const validVendorIds = vendorIds.filter((id) => {
        if (existingVendorIds.has(id)) return true
        console.warn(`Vendor with ID ${id} not found in database. Skipping expense data for this vendor.`)
        return false
      })

      if (validVendorIds.length === 0) {
        console.log(`No valid vendors to save expense data for ${version}`)
        return
      }

      for (const vendorId of validVendorIds) {
        await db.deleteExpenseData(vendorId, version)
      }

      const batch: Omit<DbExpenseData, "id" | "created_at" | "updated_at">[] = []
      for (const vendorId of validVendorIds) {
        for (const [month, amount] of Object.entries(expenses[vendorId])) {
          batch.push({ vendor_id: vendorId, version, month, amount })
        }
      }

      if (batch.length > 0) {
        console.log(`Saving ${batch.length} expense entries for ${version}`)
        await db.saveExpenseDataBatch(batch)
      }
    } catch (error) {
      console.error(`Error saving expense data for ${version}:`, error)
      throw new Error(`Failed to save expense data for ${version}: ${errorMessage(error)}`)
    }
  },
}
