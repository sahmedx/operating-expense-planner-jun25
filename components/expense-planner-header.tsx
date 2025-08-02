"use client"

import { useExpensePlanner } from "./expense-planner-context"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Download, Upload, Settings, Loader2, X } from "lucide-react"
import { MultiSelect } from "./multi-select"

// Import the Dropdown components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ExpensePlannerHeader() {
  const {
    version,
    setVersion,
    glAccount,
    setGLAccount,
    selectedCostCenters,
    setSelectedCostCenters,
    year,
    setYear,
    saveData,
    loadData,
    isLoading,
    isSaving,
    error,
    clearError,
    synchronizeVersions,
  } = useExpensePlanner()

  const costCenterOptions = [
    { label: "All Cost Centers", value: "All" },
    { label: "Finance", value: "Finance" },
    { label: "HR", value: "HR" },
    { label: "Engineering", value: "Engineering" },
    { label: "Marketing", value: "Marketing" },
    { label: "Sales", value: "Sales" },
  ]

  return (
    <div className="border-b bg-background">
      <div className="flex flex-col md:flex-row h-auto md:h-16 items-start md:items-center justify-between p-4">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 w-full md:w-auto mb-4 md:mb-0">
          <h1 className="text-lg md:text-xl font-semibold mb-2 md:mb-0">Operating Expense Planner</h1>
          <Tabs defaultValue={version} onValueChange={(v) => setVersion(v as any)} className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="Actuals" className="flex-1 md:flex-none">
                Actuals
              </TabsTrigger>
              <TabsTrigger value="Live Forecast" className="flex-1 md:flex-none">
                Live Forecast
              </TabsTrigger>
              <TabsTrigger value="Budget" className="flex-1 md:flex-none">
                Budget
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={saveData}
            disabled={isSaving || isLoading}
            className="text-xs md:text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Save</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading || isSaving}
            className="text-xs md:text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Loading...</span>
                <span className="sm:hidden">Load</span>
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Load</span>
                <span className="sm:hidden">Load</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" className="text-xs md:text-sm">
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={synchronizeVersions}>Synchronize All Versions</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {error && (
            <div
              className={`ml-2 flex items-center gap-2 text-sm ${error.code === "SUCCESS" ? "bg-green-100 text-green-600 px-3 py-1 rounded-md" : "bg-red-100 text-red-600 px-3 py-1 rounded-md"}`}
            >
              <span>{error.message}</span>
              <button
                onClick={clearError}
                className="hover:bg-opacity-20 hover:bg-gray-500 rounded-full p-1"
                aria-label="Dismiss message"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between border-t px-4 py-3 overflow-x-auto">
        <div className="flex flex-wrap gap-4 w-full">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Year:</span>
            <Select value={year.toString()} onValueChange={(v) => setYear(Number.parseInt(v))}>
              <SelectTrigger className="h-8 w-[100px] text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">FY 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">GL Account:</span>
            <Select value={glAccount} onValueChange={(v) => setGLAccount(v as any)}>
              <SelectTrigger className="h-8 w-[180px] text-sm">
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
              className="h-8 w-[200px] text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
