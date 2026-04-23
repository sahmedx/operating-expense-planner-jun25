export type Vendor = {
  id: string
  name: string
  category: string
  gl_account: string
  cost_center: string
  vendor_code: string
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

export function generateVendorCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "VND-"
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const VENDORS_KEY = "opex_vendors"
const EXPENSE_DATA_KEY = "opex_expense_data"

const SEED_VENDORS: Vendor[] = [
  { id: "v1",  name: "Salesforce",    category: "Software",             gl_account: "Software",             cost_center: "Sales",       vendor_code: "VND-SF01" },
  { id: "v2",  name: "Accenture",     category: "Professional Services", gl_account: "Professional Services", cost_center: "Finance",     vendor_code: "VND-AC01" },
  { id: "v3",  name: "AWS",           category: "Software",             gl_account: "Software",             cost_center: "Engineering", vendor_code: "VND-AWS1" },
  { id: "v4",  name: "Slack",         category: "Software",             gl_account: "Software",             cost_center: "Sales",       vendor_code: "VND-SL01" },
  { id: "v5",  name: "Deloitte",      category: "Professional Services", gl_account: "Professional Services", cost_center: "Finance",     vendor_code: "VND-DL01" },
  { id: "v6",  name: "Zoom",          category: "Software",             gl_account: "Software",             cost_center: "Engineering", vendor_code: "VND-ZM01" },
  { id: "v7",  name: "Adobe",         category: "Software",             gl_account: "Software",             cost_center: "Marketing",   vendor_code: "VND-AD01" },
  { id: "v8",  name: "WeWork",        category: "Facilities",           gl_account: "Facilities",           cost_center: "Finance",     vendor_code: "VND-WW01" },
  { id: "v9",  name: "Delta Airlines", category: "Travel",              gl_account: "Travel",               cost_center: "Sales",       vendor_code: "VND-DA01" },
  { id: "v10", name: "Microsoft",     category: "Software",             gl_account: "Software",             cost_center: "Engineering", vendor_code: "VND-MS01" },
]

function buildSeedExpenses(): ExpenseData[] {
  const MONTHS = ["Jan'25","Feb'25","Mar'25","Apr'25","May'25","Jun'25","Jul'25","Aug'25","Sep'25","Oct'25","Nov'25","Dec'25"]

  const versionAmounts: Record<string, Record<string, number[]>> = {
    "Actuals": {
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
    "Budget": {
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

  const result: ExpenseData[] = []
  let idCounter = 1

  for (const [version, vendorAmounts] of Object.entries(versionAmounts)) {
    for (const [vendorId, amounts] of Object.entries(vendorAmounts)) {
      for (let i = 0; i < MONTHS.length; i++) {
        if (amounts[i] !== 0) {
          result.push({ id: `seed-${idCounter++}`, vendor_id: vendorId, version, month: MONTHS[i], amount: amounts[i] })
        }
      }
    }
  }

  return result
}

function readVendors(): Vendor[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(VENDORS_KEY)
    return raw ? (JSON.parse(raw) as Vendor[]) : []
  } catch {
    return []
  }
}

function writeVendors(data: Vendor[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(VENDORS_KEY, JSON.stringify(data))
}

function readExpenseData(): ExpenseData[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(EXPENSE_DATA_KEY)
    return raw ? (JSON.parse(raw) as ExpenseData[]) : []
  } catch {
    return []
  }
}

function writeExpenseData(data: ExpenseData[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(EXPENSE_DATA_KEY, JSON.stringify(data))
}

function ensureSeeded(): void {
  if (typeof window === "undefined") return
  if (localStorage.getItem(VENDORS_KEY) === null) {
    writeVendors(SEED_VENDORS)
    writeExpenseData(buildSeedExpenses())
  }
}

export const db = {
  async getVendors(): Promise<Vendor[]> {
    ensureSeeded()
    return readVendors().sort((a, b) => a.name.localeCompare(b.name))
  },

  async getExpenseData(version?: string): Promise<ExpenseData[]> {
    ensureSeeded()
    const all = readExpenseData()
    return version ? all.filter((e) => e.version === version) : all
  },

  async saveVendor(vendor: Omit<Vendor, "id" | "created_at" | "updated_at">, id?: string): Promise<Vendor> {
    ensureSeeded()
    const all = readVendors()
    const newVendor: Vendor = { ...vendor, vendor_code: vendor.vendor_code || generateVendorCode(), id: id || generateId() }
    all.push(newVendor)
    writeVendors(all)
    return newVendor
  },

  async updateVendor(id: string, vendor: Partial<Omit<Vendor, "id" | "created_at" | "updated_at">>): Promise<Vendor> {
    ensureSeeded()
    const all = readVendors()
    const idx = all.findIndex((v) => v.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...vendor }
      writeVendors(all)
      return all[idx]
    }
    const newVendor: Vendor = {
      id,
      name: vendor.name || "",
      category: vendor.category || "",
      gl_account: vendor.gl_account || "",
      cost_center: vendor.cost_center || "",
      vendor_code: vendor.vendor_code || generateVendorCode(),
    }
    all.push(newVendor)
    writeVendors(all)
    return newVendor
  },

  async deleteVendor(id: string): Promise<void> {
    ensureSeeded()
    writeVendors(readVendors().filter((v) => v.id !== id))
    writeExpenseData(readExpenseData().filter((e) => e.vendor_id !== id))
  },

  async saveExpenseData(expenseData: Omit<ExpenseData, "id" | "created_at" | "updated_at">): Promise<ExpenseData> {
    ensureSeeded()
    const all = readExpenseData()
    const idx = all.findIndex(
      (e) => e.vendor_id === expenseData.vendor_id && e.version === expenseData.version && e.month === expenseData.month,
    )
    const record: ExpenseData = { ...expenseData, id: idx >= 0 ? all[idx].id : generateId() }
    if (idx >= 0) {
      all[idx] = record
    } else {
      all.push(record)
    }
    writeExpenseData(all)
    return record
  },

  async saveExpenseDataBatch(items: Omit<ExpenseData, "id" | "created_at" | "updated_at">[]): Promise<void> {
    if (items.length === 0) return
    ensureSeeded()
    const all = readExpenseData()
    for (const item of items) {
      const idx = all.findIndex(
        (e) => e.vendor_id === item.vendor_id && e.version === item.version && e.month === item.month,
      )
      if (idx >= 0) {
        all[idx] = { ...all[idx], amount: item.amount }
      } else {
        all.push({ ...item, id: generateId() })
      }
    }
    writeExpenseData(all)
  },

  async deleteExpenseData(vendorId: string, version?: string): Promise<void> {
    ensureSeeded()
    const filtered = readExpenseData().filter((e) => {
      if (e.vendor_id !== vendorId) return true
      if (version && e.version !== version) return true
      return false
    })
    writeExpenseData(filtered)
  },

  async getExpenseView(version?: string): Promise<ExpenseView[]> {
    ensureSeeded()
    const vendors = readVendors()
    const expenseData = readExpenseData()
    const vendorMap = new Map(vendors.map((v) => [v.id, v]))
    const filtered = version ? expenseData.filter((e) => e.version === version) : expenseData
    return filtered.map((e) => {
      const vendor = vendorMap.get(e.vendor_id)
      return {
        vendor_id: e.vendor_id,
        vendor_name: vendor?.name ?? "",
        category: vendor?.category ?? "",
        gl_account: vendor?.gl_account ?? "",
        cost_center: vendor?.cost_center ?? "",
        version: e.version,
        month: e.month,
        amount: e.amount,
      }
    })
  },
}
