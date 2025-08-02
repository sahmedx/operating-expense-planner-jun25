import { db } from "./supabase"

// Define the months
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

// Define the versions
const versions = ["Actuals", "Live Forecast", "Budget"]

// Sample vendors data
const vendors = [
  { name: "Salesforce", category: "Software", gl_account: "Software", cost_center: "Sales" },
  { name: "Accenture", category: "Professional Services", gl_account: "Professional Services", cost_center: "Finance" },
  { name: "AWS", category: "Software", gl_account: "Software", cost_center: "Engineering" },
  { name: "Slack", category: "Software", gl_account: "Software", cost_center: "Sales" },
  { name: "Deloitte", category: "Professional Services", gl_account: "Professional Services", cost_center: "Finance" },
  { name: "Zoom", category: "Software", gl_account: "Software", cost_center: "Engineering" },
  { name: "Adobe", category: "Software", gl_account: "Software", cost_center: "Marketing" },
  { name: "WeWork", category: "Facilities", gl_account: "Facilities", cost_center: "Finance" },
  { name: "Delta Airlines", category: "Travel", gl_account: "Travel", cost_center: "Sales" },
  { name: "Microsoft", category: "Software", gl_account: "Software", cost_center: "Engineering" },
]

// Function to generate expense data for a vendor
function generateExpenseData(vendorId: string, version: string) {
  const expenseData = []

  // Different expense patterns based on version
  if (version === "Actuals") {
    // For Actuals, only Jan-Mar have values, rest are 0
    for (const month of months) {
      const isClosedPeriod = ["Jan'25", "Feb'25", "Mar'25"].includes(month)
      const amount = isClosedPeriod ? Math.floor(Math.random() * 40000) + 5000 : 0

      expenseData.push({
        vendor_id: vendorId,
        version,
        month,
        amount,
      })
    }
  } else if (version === "Live Forecast") {
    // For Live Forecast, Jan-Mar match Actuals, Apr-Dec have forecast values
    for (const month of months) {
      let amount

      if (["Jan'25", "Feb'25", "Mar'25"].includes(month)) {
        // Find the corresponding Actuals amount
        const actualAmount =
          expenseData.find((data) => data.vendor_id === vendorId && data.version === "Actuals" && data.month === month)
            ?.amount || Math.floor(Math.random() * 40000) + 5000

        amount = actualAmount
      } else {
        amount = Math.floor(Math.random() * 50000) + 10000
      }

      expenseData.push({
        vendor_id: vendorId,
        version,
        month,
        amount,
      })
    }
  } else {
    // For Budget, all months have values
    for (const month of months) {
      const amount = Math.floor(Math.random() * 45000) + 15000

      expenseData.push({
        vendor_id: vendorId,
        version,
        month,
        amount,
      })
    }
  }

  return expenseData
}

// Main seed function
export async function seedDatabase() {
  try {
    console.log("Starting database seeding...")

    // Clear existing data
    console.log("Clearing existing data...")
    await db.supabase.from("expense_data").delete().neq("vendor_id", "00000000-0000-0000-0000-000000000000")
    await db.supabase.from("vendors").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    // Insert vendors
    console.log("Inserting vendors...")
    const { data: insertedVendors, error: vendorError } = await db.supabase.from("vendors").insert(vendors).select()

    if (vendorError) {
      throw new Error(`Error inserting vendors: ${vendorError.message}`)
    }

    console.log(`Inserted ${insertedVendors.length} vendors`)

    // Generate and insert expense data
    console.log("Generating expense data...")
    let allExpenseData = []

    for (const vendor of insertedVendors) {
      for (const version of versions) {
        const expenseData = generateExpenseData(vendor.id, version)
        allExpenseData = [...allExpenseData, ...expenseData]
      }
    }

    // Insert expense data in batches to avoid request size limits
    const batchSize = 100
    console.log(`Inserting ${allExpenseData.length} expense records in batches of ${batchSize}...`)

    for (let i = 0; i < allExpenseData.length; i += batchSize) {
      const batch = allExpenseData.slice(i, i + batchSize)
      const { error: expenseError } = await db.supabase.from("expense_data").insert(batch)

      if (expenseError) {
        throw new Error(`Error inserting expense data batch: ${expenseError.message}`)
      }

      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allExpenseData.length / batchSize)}`)
    }

    console.log("Database seeding completed successfully!")
    return { success: true, message: "Database seeded successfully" }
  } catch (error) {
    console.error("Error seeding database:", error)
    return { success: false, message: `Error seeding database: ${error.message}` }
  }
}
