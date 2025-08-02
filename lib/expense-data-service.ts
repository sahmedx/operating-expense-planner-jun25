import { db, type Vendor as DbVendor, type ExpenseData as DbExpenseData, generateVendorCode } from "./supabase"

// Application data types
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
type Version = "Actuals" | "Live Forecast" | "Budget"

export type AppVendor = {
  id: string
  name: string
  category: string
  vendorCode: string // Added vendor code
}

export type ExpenseDataState = {
  vendors: AppVendor[]
  glAccounts: Record<string, string>
  costCenters: Record<string, string>
  expenses: Record<string, Record<string, number>>
}

// Convert database vendor to application vendor
const dbVendorToAppVendor = (
  dbVendor: DbVendor,
): {
  vendor: AppVendor
  glAccount: string
  costCenter: string
} => {
  return {
    vendor: {
      id: dbVendor.id,
      name: dbVendor.name,
      category: dbVendor.category,
      vendorCode: dbVendor.vendor_code || generateVendorCode(), // Use existing code or generate new one
    },
    glAccount: dbVendor.gl_account,
    costCenter: dbVendor.cost_center,
  }
}

// Convert application vendor to database vendor
const appVendorToDbVendor = (
  vendor: AppVendor,
  glAccount: string,
  costCenter: string,
): Omit<DbVendor, "id" | "created_at" | "updated_at"> => {
  return {
    name: vendor.name,
    category: vendor.category,
    gl_account: glAccount,
    cost_center: costCenter,
    vendor_code: vendor.vendorCode,
  }
}

export const expenseDataService = {
  // Load all expense data from the database
  async loadExpenseData(): Promise<ExpenseDataState> {
    try {
      // Fetch vendors and expense data
      const dbVendors = await db.getVendors()
      const dbExpenseData = await db.getExpenseData()

      // Initialize the application state
      const vendors: AppVendor[] = []
      const glAccounts: Record<string, string> = {}
      const costCenters: Record<string, string> = {}
      const expenses: Record<string, Record<string, number>> = {}

      // Convert vendors
      dbVendors.forEach((dbVendor) => {
        const { vendor, glAccount, costCenter } = dbVendorToAppVendor(dbVendor)
        vendors.push(vendor)
        glAccounts[vendor.id] = glAccount
        costCenters[vendor.id] = costCenter
        expenses[vendor.id] = {}
      })

      // Convert expense data
      dbExpenseData.forEach((data) => {
        if (!expenses[data.vendor_id]) {
          expenses[data.vendor_id] = {}
        }

        expenses[data.vendor_id][data.month] = Number(data.amount)
      })

      return {
        vendors,
        glAccounts,
        costCenters,
        expenses,
      }
    } catch (error) {
      console.error("Error loading expense data:", error)
      throw new Error(`Failed to load expense data: ${error.message}`)
    }
  },

  // Save expense data to the database
  async saveExpenseData(version: Version, data: ExpenseDataState): Promise<void> {
    try {
      console.log(`Saving ${version} data to database...`)
      console.log(`Vendors to save: ${data.vendors.length}`)

      // Verify Supabase connection before proceeding
      if (!db.supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.")
      }

      // Get current vendors from the database to track deletions
      const currentDbVendors = await db.getVendors()
      const currentVendorIds = new Set(currentDbVendors.map((v) => v.id))
      const newVendorIds = new Set(data.vendors.map((v) => v.id))

      console.log(`Current vendors in DB: ${currentVendorIds.size}`)
      console.log(`New vendors to save: ${newVendorIds.size}`)

      // Find vendors that need to be deleted (in DB but not in current state)
      const vendorsToDelete = Array.from(currentVendorIds).filter((id) => !newVendorIds.has(id))
      console.log(`Vendors to delete: ${vendorsToDelete.length}`)

      // Delete vendors that are no longer in the state
      for (const vendorId of vendorsToDelete) {
        await db.deleteVendor(vendorId)
        console.log(`Deleted vendor with ID ${vendorId} from database`)
      }

      // Create a map to store the mapping between client-side IDs and server-side IDs
      const idMapping: Record<string, string> = {}

      // First, save all vendors to ensure they exist before saving expense data
      for (const vendor of data.vendors) {
        try {
          console.log(`Processing vendor: ${vendor.name} (${vendor.id})`)

          // Check if vendor exists in the database
          const { data: existingVendor, error: queryError } = await db.supabase
            .from("vendors")
            .select("id")
            .eq("id", vendor.id)
            .maybeSingle()

          if (queryError) {
            console.error(`Error checking if vendor exists: ${queryError.message}`)
            throw queryError
          }

          let savedVendorId: string

          if (existingVendor) {
            // Update existing vendor
            console.log(`Updating existing vendor: ${vendor.name}`)
            const updatedVendor = await db.updateVendor(
              vendor.id,
              appVendorToDbVendor(vendor, data.glAccounts[vendor.id], data.costCenters[vendor.id]),
            )
            savedVendorId = updatedVendor.id
          } else {
            // Create new vendor
            console.log(`Creating new vendor: ${vendor.name}`)
            const dbVendor = await db.saveVendor(
              appVendorToDbVendor(vendor, data.glAccounts[vendor.id], data.costCenters[vendor.id]),
            )
            savedVendorId = dbVendor.id
            console.log(`Created vendor with ID: ${dbVendor.id}`)
          }

          // Store the mapping between client-side ID and server-side ID
          idMapping[vendor.id] = savedVendorId
        } catch (vendorError) {
          console.error(`Error processing vendor ${vendor.name}:`, vendorError)
          throw vendorError
        }
      }

      // Now save expense data for all vendors
      for (const vendor of data.vendors) {
        try {
          // Get the server-side vendor ID
          const serverVendorId = idMapping[vendor.id] || vendor.id

          // Prepare expense data for this vendor
          const expenseDataBatch: Omit<DbExpenseData, "id" | "created_at" | "updated_at">[] = []

          // Get all months for this vendor
          const months = Object.keys(data.expenses[vendor.id] || {})

          // Create expense data entries for each month
          for (const month of months) {
            const amount = data.expenses[vendor.id][month] || 0

            expenseDataBatch.push({
              vendor_id: serverVendorId, // Use the server-side vendor ID
              version,
              month,
              amount,
            })
          }

          // Save expense data batch
          if (expenseDataBatch.length > 0) {
            console.log(`Saving ${expenseDataBatch.length} expense entries for vendor ${vendor.name}`)
            await db.saveExpenseDataBatch(expenseDataBatch)
          }
        } catch (expenseError) {
          console.error(`Error saving expense data for vendor ${vendor.name}:`, expenseError)
          throw expenseError
        }
      }

      console.log(`Successfully saved ${version} data`)
    } catch (error) {
      console.error(`Error saving ${version} expense data:`, error)
      throw new Error(`Failed to save ${version} expense data: ${error.message}`)
    }
  },

  // Load expense data for a specific version
  async loadExpenseDataForVersion(version: Version): Promise<Record<string, Record<string, number>>> {
    try {
      const dbExpenseData = await db.getExpenseData(version)
      const expenses: Record<string, Record<string, number>> = {}

      dbExpenseData.forEach((data) => {
        if (!expenses[data.vendor_id]) {
          expenses[data.vendor_id] = {}
        }

        expenses[data.vendor_id][data.month] = Number(data.amount)
      })

      return expenses
    } catch (error) {
      console.error(`Error loading ${version} expense data:`, error)
      throw new Error(`Failed to load ${version} expense data: ${error.message}`)
    }
  },

  // Delete a vendor and all its expense data
  async deleteVendor(vendorId: string): Promise<void> {
    try {
      await db.deleteVendor(vendorId)
      console.log(`Vendor with ID "${vendorId}" deleted successfully from the database.`)
    } catch (error) {
      console.error("Error deleting vendor:", error)
      throw new Error(`Failed to delete vendor: ${error.message}`)
    }
  },

  // Edit a vendor
  async editVendor(vendorId: string, name: string, glAccount: string, costCenter: string): Promise<void> {
    try {
      const vendorData = {
        name,
        category: glAccount,
        gl_account: glAccount,
        cost_center: costCenter,
      }

      await db.updateVendor(vendorId, vendorData)
      console.log(`Vendor with ID "${vendorId}" updated successfully in the database.`)
    } catch (error) {
      console.error("Error updating vendor:", error)
      throw new Error(`Failed to update vendor: ${error.message}`)
    }
  },

  // Save all vendors at once
  async saveVendors(
    vendors: Array<{
      id: string
      name: string
      category: string
      vendorCode: string
      gl_account: string
      cost_center: string
    }>,
  ): Promise<void> {
    try {
      console.log(`Saving ${vendors.length} vendors to database...`)

      // Verify Supabase connection before proceeding
      if (!db.supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.")
      }

      // Get current vendors from the database
      const currentDbVendors = await db.getVendors()
      const currentVendorIds = new Set(currentDbVendors.map((v) => v.id))
      const newVendorIds = new Set(vendors.map((v) => v.id))

      console.log(`Current vendors in DB: ${currentVendorIds.size}`)
      console.log(`New vendors to save: ${newVendorIds.size}`)

      // IMPORTANT: We're removing the automatic deletion of vendors not in the current state
      // This prevents accidental deletion of vendors that might be in use

      // Save or update each vendor
      for (const vendor of vendors) {
        try {
          console.log(`Processing vendor: ${vendor.name} (${vendor.id})`)

          // Check if vendor exists in the database
          const { data: existingVendor, error: queryError } = await db.supabase
            .from("vendors")
            .select("id")
            .eq("id", vendor.id)
            .maybeSingle()

          if (queryError) {
            console.error(`Error checking if vendor exists: ${queryError.message}`)
            throw queryError
          }

          if (existingVendor) {
            // Update existing vendor
            console.log(`Updating existing vendor: ${vendor.name}`)
            await db.updateVendor(vendor.id, {
              name: vendor.name,
              category: vendor.category,
              gl_account: vendor.gl_account,
              cost_center: vendor.cost_center,
              vendor_code: vendor.vendorCode,
            })
          } else {
            // Create new vendor
            console.log(`Creating new vendor: ${vendor.name}`)
            await db.saveVendor(
              {
                name: vendor.name,
                category: vendor.category,
                gl_account: vendor.gl_account,
                cost_center: vendor.cost_center,
                vendor_code: vendor.vendorCode,
              },
              vendor.id,
            ) // Pass the ID to ensure it's used
          }
        } catch (vendorError) {
          console.error(`Error processing vendor ${vendor.name}:`, vendorError)
          throw vendorError
        }
      }

      console.log(`Successfully saved ${vendors.length} vendors`)
    } catch (error) {
      console.error(`Error saving vendors:`, error)
      throw new Error(`Failed to save vendors: ${error.message}`)
    }
  },

  // Save expense data for a specific version
  async saveVersionExpenseData(version: Version, expenses: Record<string, Record<string, number>>): Promise<void> {
    try {
      console.log(`Saving expense data for ${version}...`)

      // Verify Supabase connection before proceeding
      if (!db.supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.")
      }

      // First, verify all vendors exist in the database
      const vendorIds = Object.keys(expenses)
      const existingVendorIds = new Set<string>()

      // Check all vendors in a single query for efficiency
      if (vendorIds.length > 0) {
        const { data: existingVendors, error: checkError } = await db.supabase
          .from("vendors")
          .select("id")
          .in("id", vendorIds)

        if (checkError) {
          console.error(`Error checking vendors existence:`, checkError)
          throw checkError
        }

        // Create a set of existing vendor IDs
        existingVendors?.forEach((vendor) => existingVendorIds.add(vendor.id))

        console.log(`Found ${existingVendorIds.size} of ${vendorIds.length} vendors in database`)
      }

      // Filter expenses to only include vendors that exist in the database
      const validExpenses: Record<string, Record<string, number>> = {}
      for (const vendorId of vendorIds) {
        if (existingVendorIds.has(vendorId)) {
          validExpenses[vendorId] = expenses[vendorId]
        } else {
          console.warn(`Vendor with ID ${vendorId} not found in database. Skipping expense data for this vendor.`)
        }
      }

      // If no vendors remain after filtering, exit early
      if (Object.keys(validExpenses).length === 0) {
        console.log(`No valid vendors to save expense data for ${version}`)
        return
      }

      // Delete existing expense data for this version but only for the vendors we're updating
      for (const vendorId of Object.keys(validExpenses)) {
        const { error: deleteError } = await db.supabase
          .from("expense_data")
          .delete()
          .eq("version", version)
          .eq("vendor_id", vendorId)

        if (deleteError) {
          console.error(`Error deleting existing expense data for ${version} and vendor ${vendorId}:`, deleteError)
          throw deleteError
        }
      }

      // Prepare expense data for all vendors
      const expenseDataBatch: Omit<DbExpenseData, "id" | "created_at" | "updated_at">[] = []

      // For each vendor
      for (const vendorId of Object.keys(validExpenses)) {
        // For each month
        for (const month of Object.keys(validExpenses[vendorId])) {
          const amount = validExpenses[vendorId][month]

          expenseDataBatch.push({
            vendor_id: vendorId,
            version,
            month,
            amount,
          })
        }
      }

      // Save expense data batch
      if (expenseDataBatch.length > 0) {
        console.log(`Saving ${expenseDataBatch.length} expense entries for ${version}`)

        // Process in smaller batches to avoid potential issues
        const batchSize = 50
        for (let i = 0; i < expenseDataBatch.length; i += batchSize) {
          const batch = expenseDataBatch.slice(i, i + batchSize)
          const { error: insertError } = await db.supabase.from("expense_data").insert(batch)

          if (insertError) {
            console.error(`Error inserting expense data batch for ${version}:`, insertError)
            throw insertError
          }
        }
      }

      console.log(`Successfully saved expense data for ${version}`)
    } catch (error) {
      console.error(`Error saving expense data for ${version}:`, error)
      throw new Error(`Failed to save expense data for ${version}: ${error.message}`)
    }
  },
}
