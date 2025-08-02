import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if the environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are not defined. Please check your .env file.")
}

// Create the Supabase client with error handling
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Test the connection to ensure it's working
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Error connecting to Supabase:", error)
  } else {
    console.log("Supabase client initialized successfully")
  }
})

// Types for our database tables
export type Vendor = {
  id: string
  name: string
  category: string
  gl_account: string
  cost_center: string
  vendor_code: string // Added vendor code field
  created_at?: string
  updated_at?: string
}

export type ExpenseData = {
  id?: string
  vendor_id: string
  version: string
  month: string
  amount: number
  created_at?: string
  updated_at?: string
}

export type ExpenseView = {
  vendor_id: string
  vendor_name: string
  category: string
  gl_account: string
  cost_center: string
  version: string
  month: string
  amount: number
}

// Generate a unique vendor code
export function generateVendorCode(): string {
  // Format: VND-XXXX where X is alphanumeric
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "VND-"
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Database service functions
export const db = {
  supabase,

  // Fetch all vendors
  async getVendors(): Promise<Vendor[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }

      const { data, error } = await this.supabase.from("vendors").select("*").order("name")

      if (error) {
        console.error("Error fetching vendors:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Error in getVendors:", error)
      throw new Error(`Failed to fetch vendors: ${error.message}`)
    }
  },

  // Fetch expense data for all vendors
  async getExpenseData(version?: string): Promise<ExpenseData[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }

      let query = this.supabase.from("expense_data").select("*")

      if (version) {
        query = query.eq("version", version)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching expense data:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Error in getExpenseData:", error)
      throw new Error(`Failed to fetch expense data: ${error.message}`)
    }
  },

  // Save a vendor
  async saveVendor(vendor: Omit<Vendor, "id" | "created_at" | "updated_at">, id?: string): Promise<Vendor> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }
      console.log("Saving vendor to database:", vendor.name)

      // Ensure vendor has a vendor_code
      if (!vendor.vendor_code) {
        vendor.vendor_code = generateVendorCode()
      }

      // If an ID is provided, use it
      const vendorToSave = id ? { id, ...vendor } : vendor

      // Insert the vendor and return the result
      const { data, error } = await this.supabase.from("vendors").insert([vendorToSave]).select().single()

      if (error) {
        console.error("Error saving vendor:", error)
        throw error
      }

      if (!data) {
        throw new Error("No data returned after saving vendor")
      }

      console.log("Vendor saved successfully:", data.id)
      return data
    } catch (error) {
      console.error("Error in saveVendor:", error)
      throw new Error(`Failed to save vendor: ${error.message}`)
    }
  },

  // Update a vendor
  async updateVendor(id: string, vendor: Partial<Omit<Vendor, "id" | "created_at" | "updated_at">>): Promise<Vendor> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }

      // First check if the vendor exists
      const { data: existingVendor, error: checkError } = await this.supabase
        .from("vendors")
        .select("id")
        .eq("id", id)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking vendor existence:", checkError)
        throw checkError
      }

      if (!existingVendor) {
        // If vendor doesn't exist, insert it instead
        console.log(`Vendor with ID ${id} doesn't exist, creating new record`)
        const fullVendor = {
          id,
          ...vendor,
          vendor_code: vendor.vendor_code || generateVendorCode(),
        }

        const { data: insertedVendor, error: insertError } = await this.supabase
          .from("vendors")
          .insert([fullVendor])
          .select()
          .single()

        if (insertError) {
          console.error("Error inserting vendor:", insertError)
          throw insertError
        }

        return insertedVendor
      }

      // Update the existing vendor
      const { data, error } = await this.supabase.from("vendors").update(vendor).eq("id", id).select().single()

      if (error) {
        console.error("Error updating vendor:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("Error in updateVendor:", error)
      throw new Error(`Failed to update vendor: ${error.message}`)
    }
  },

  // Delete a vendor
  async deleteVendor(id: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }
      console.log(`Attempting to delete vendor with ID: ${id}`)

      // First delete all expense data for this vendor
      const { error: expenseError } = await this.supabase.from("expense_data").delete().eq("vendor_id", id)

      if (expenseError) {
        console.error("Error deleting vendor expense data:", expenseError)
        throw expenseError
      }

      // Then delete the vendor
      const { error } = await this.supabase.from("vendors").delete().eq("id", id)

      if (error) {
        console.error("Error deleting vendor:", error)
        throw error
      }

      console.log(`Successfully deleted vendor with ID: ${id} and its expense data`)
    } catch (error) {
      console.error("Error in deleteVendor:", error)
      throw new Error(`Failed to delete vendor: ${error.message}`)
    }
  },

  // Save expense data
  async saveExpenseData(expenseData: Omit<ExpenseData, "id" | "created_at" | "updated_at">): Promise<ExpenseData> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }

      // First verify that the vendor exists
      const { data: vendorExists, error: vendorCheckError } = await this.supabase
        .from("vendors")
        .select("id")
        .eq("id", expenseData.vendor_id)
        .maybeSingle()

      if (vendorCheckError) {
        console.error("Error checking vendor existence:", vendorCheckError)
        throw vendorCheckError
      }

      if (!vendorExists) {
        throw new Error(`Vendor with ID ${expenseData.vendor_id} does not exist in the database`)
      }

      // Check if the record exists
      const { data: existingData } = await this.supabase
        .from("expense_data")
        .select("id")
        .eq("vendor_id", expenseData.vendor_id)
        .eq("version", expenseData.version)
        .eq("month", expenseData.month)
        .maybeSingle()

      if (existingData) {
        // Update existing record
        const { data, error } = await this.supabase
          .from("expense_data")
          .update({ amount: expenseData.amount })
          .eq("id", existingData.id)
          .select()
          .single()

        if (error) {
          console.error("Error updating expense data:", error)
          throw error
        }

        return data
      } else {
        // Insert new record
        const { data, error } = await this.supabase.from("expense_data").insert([expenseData]).select().single()

        if (error) {
          console.error("Error saving expense data:", error)
          throw error
        }

        return data
      }
    } catch (error) {
      console.error("Error in saveExpenseData:", error)
      throw new Error(`Failed to save expense data: ${error.message}`)
    }
  },

  // Save multiple expense data entries at once
  async saveExpenseDataBatch(expenseDataList: Omit<ExpenseData, "id" | "created_at" | "updated_at">[]): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }
      if (expenseDataList.length === 0) return

      // Process in smaller batches to avoid potential issues
      const batchSize = 50
      const failedItems: Omit<ExpenseData, "id" | "created_at" | "updated_at">[] = []

      for (let i = 0; i < expenseDataList.length; i += batchSize) {
        const batch = expenseDataList.slice(i, i + batchSize)
        const validBatch: Omit<ExpenseData, "id" | "created_at" | "updated_at">[] = []

        // For each item in the batch, verify the vendor exists
        for (const item of batch) {
          const { data: vendorExists, error: vendorCheckError } = await this.supabase
            .from("vendors")
            .select("id")
            .eq("id", item.vendor_id)
            .maybeSingle()

          if (vendorCheckError) {
            console.error("Error checking vendor existence:", vendorCheckError)
            failedItems.push(item)
            continue
          }

          if (!vendorExists) {
            console.warn(`Vendor with ID ${item.vendor_id} does not exist in the database. Skipping this expense data.`)
            failedItems.push(item)
            continue
          }

          validBatch.push(item)
        }

        // Only process if we have valid items
        if (validBatch.length > 0) {
          const { error } = await this.supabase.from("expense_data").insert(validBatch)

          if (error) {
            console.error("Error saving expense data batch:", error)
            failedItems.push(...validBatch)
          }
        }

        console.log(
          `Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(expenseDataList.length / batchSize)}`,
        )
      }

      // Report on failed items
      if (failedItems.length > 0) {
        console.warn(`Failed to save ${failedItems.length} expense data items`)
      }
    } catch (error) {
      console.error("Error in saveExpenseDataBatch:", error)
      throw new Error(`Failed to save expense data batch: ${error.message}`)
    }
  },

  // Delete expense data for a vendor
  async deleteExpenseData(vendorId: string, version?: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }
      let query = this.supabase.from("expense_data").delete().eq("vendor_id", vendorId)

      if (version) {
        query = query.eq("version", version)
      }

      const { error } = await query

      if (error) {
        console.error("Error deleting expense data:", error)
        throw error
      }
    } catch (error) {
      console.error("Error in deleteExpenseData:", error)
      throw new Error(`Failed to delete expense data: ${error.message}`)
    }
  },

  // Get all expense data with vendor information using the view
  async getExpenseView(version?: string): Promise<ExpenseView[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client is not initialized")
      }
      let query = this.supabase.from("expense_view").select("*")

      if (version) {
        query = query.eq("version", version)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching expense view:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Error in getExpenseView:", error)
      throw new Error(`Failed to fetch expense view: ${error.message}`)
    }
  },
}
