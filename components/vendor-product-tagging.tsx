"use client"

import { useState, useEffect } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import { ExpensePlannerSidebar } from "./expense-planner-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingOverlay } from "./loading-overlay"
import { Search, Save, Filter, AlertCircle, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define the available products
const PRODUCTS = ["Trading", "Card", "Commerce", "Custody", "Markets"]

// Define the vendor product tags type
type VendorProductTags = {
  [vendorId: string]: string[] // Array of product names
}

export function VendorProductTagging() {
  const { expenseData, isLoading, glAccount, setGLAccount } = useExpensePlanner()
  const [searchQuery, setSearchQuery] = useState("")
  const [productTags, setProductTags] = useState<VendorProductTags>({})
  const [filteredVendors, setFilteredVendors] = useState(expenseData.vendors)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize product tags from localStorage on component mount
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

  // Filter vendors based on search query and GL Account
  useEffect(() => {
    let filtered = [...expenseData.vendors]

    // Filter by GL Account if not "All"
    if (glAccount !== "All") {
      filtered = filtered.filter((vendor) => expenseData.glAccounts[vendor.id] === glAccount)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((vendor) => vendor.name.toLowerCase().includes(query))
    }

    setFilteredVendors(filtered)
  }, [expenseData.vendors, expenseData.glAccounts, glAccount, searchQuery])

  // Handle checkbox change
  const handleProductTagChange = (vendorId: string, product: string, checked: boolean) => {
    setProductTags((prev) => {
      const vendorTags = prev[vendorId] || []

      if (checked) {
        // Add product to vendor's tags if not already present
        return {
          ...prev,
          [vendorId]: [...vendorTags, product].filter((v, i, a) => a.indexOf(v) === i),
        }
      } else {
        // Remove product from vendor's tags
        return {
          ...prev,
          [vendorId]: vendorTags.filter((tag) => tag !== product),
        }
      }
    })
  }

  // Check if a vendor has a specific product tag
  const hasProductTag = (vendorId: string, product: string) => {
    return productTags[vendorId]?.includes(product) || false
  }

  // Save product tags
  const saveProductTags = () => {
    try {
      setIsSaving(true)
      setError(null)

      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem("vendorProductTags", JSON.stringify(productTags))

      // Show success message
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("Error saving vendor product tags:", err)
      setError("Failed to save vendor product tags. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <LoadingOverlay isLoading={isLoading} message="Loading vendor data..." />
      <ExpensePlannerSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="flex flex-col md:flex-row h-auto md:h-16 items-start md:items-center justify-between p-4">
            <h1 className="text-lg md:text-xl font-semibold mb-2 md:mb-0">Vendor-Product Tagging</h1>
            <div className="flex items-center space-x-2">
              <Button onClick={saveProductTags} disabled={isSaving} className="flex items-center">
                {isSaving ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Tags
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center border-t px-4 py-3 gap-3">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full md:w-[250px]"
              />
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={glAccount} onValueChange={(v) => setGLAccount(v as any)}>
                <SelectTrigger className="h-8 w-full md:w-[180px]">
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
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Assign Products to Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Instructions: Select which products each vendor should be associated with. A vendor can be tagged to multiple
                products. After tagging vendors, click save. Then go to the Product Cost Allocation dashboard to allocate costs to
                products.
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Vendor</TableHead>
                      {PRODUCTS.map((product) => (
                        <TableHead key={product} className="text-center">
                          {product}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3 + PRODUCTS.length} className="text-center py-8 text-muted-foreground">
                          No vendors found matching your search criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          {PRODUCTS.map((product) => (
                            <TableCell key={`${vendor.id}-${product}`} className="text-center">
                              <Checkbox
                                checked={hasProductTag(vendor.id, product)}
                                onCheckedChange={(checked) =>
                                  handleProductTagChange(vendor.id, product, checked === true)
                                }
                                aria-label={`Tag ${vendor.name} to ${product}`}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
