"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Home,
  PieChart,
  Search,
  Settings,
  Users,
} from "lucide-react"

export function ExpensePlannerSidebar() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    planning: true,
    reporting: true,
    admin: true,
  })

  // Add state for sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Add state for active path
  const [activePath, setActivePath] = useState<string>("/")

  // Update active path on client side only
  useEffect(() => {
    setActivePath(window.location.pathname)
  }, [])

  const toggleExpanded = (section: string) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <div
      className={`flex h-full ${
        sidebarCollapsed ? "w-14 md:w-16" : "w-20 md:w-64"
      } flex-col border-r bg-muted/40 transition-all duration-300 overflow-hidden`}
    >
      <div className="flex h-16 items-center border-b px-6">
        {!sidebarCollapsed && (
          <h2 className="flex items-center text-base md:text-lg font-semibold">
            <DollarSign className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5 text-primary" />
            <span className="hidden md:inline">FinancePro</span>
            <span className="md:hidden">FP</span>
          </h2>
        )}
        {sidebarCollapsed && <DollarSign className="h-5 w-5 text-primary mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          className={`${sidebarCollapsed ? "ml-auto" : "ml-auto"} h-8 w-8`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <div className="flex items-center gap-2 p-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="h-9 pl-8" />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="mr-2 h-4 w-4" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </Button>

          <div>
            <Button
              variant="ghost"
              className="w-full justify-start font-medium"
              onClick={() => toggleExpanded("reporting")}
            >
              {expanded.reporting && !sidebarCollapsed ? (
                <ChevronDown className="mr-2 h-4 w-4" />
              ) : (
                <ChevronRight className="mr-2 h-4 w-4" />
              )}
              {!sidebarCollapsed && <span>Reporting</span>}
            </Button>
            {expanded.reporting && !sidebarCollapsed && (
              <div className="ml-4 mt-1 space-y-1">
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${activePath === "/reporting/summary-dashboard" ? "bg-accent" : ""}`}
                  onClick={() => (window.location.href = "/reporting/summary-dashboard")}
                >
                  <PieChart className="mr-2 h-4 w-4" />
                  Summary Dashboard
                </Button>
              </div>
            )}
          </div>

          <div>
            <Button
              variant="ghost"
              className="w-full justify-start font-medium"
              onClick={() => toggleExpanded("planning")}
            >
              {expanded.planning && !sidebarCollapsed ? (
                <ChevronDown className="mr-2 h-4 w-4" />
              ) : (
                <ChevronRight className="mr-2 h-4 w-4" />
              )}
              {!sidebarCollapsed && <span>Planning</span>}
            </Button>
            {expanded.planning && !sidebarCollapsed && (
              <div className="ml-4 mt-1 space-y-1">
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${activePath === "/" ? "bg-accent" : ""}`}
                  onClick={() => (window.location.href = "/")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Operating Expenses
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${activePath === "/vendor-tagging" ? "bg-accent" : ""}`}
                  onClick={() => (window.location.href = "/vendor-tagging")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Vendor-Product Tagging
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${activePath === "/vendor-product-allocation" ? "bg-accent" : ""}`}
                  onClick={() => (window.location.href = "/vendor-product-allocation")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Product Cost Allocation
                </Button>
              </div>
            )}
          </div>

          <div>
            <Button
              variant="ghost"
              className="w-full justify-start font-medium"
              onClick={() => toggleExpanded("admin")}
            >
              {expanded.admin && !sidebarCollapsed ? (
                <ChevronDown className="mr-2 h-4 w-4" />
              ) : (
                <ChevronRight className="mr-2 h-4 w-4" />
              )}
              {!sidebarCollapsed && <span>Administration</span>}
            </Button>
            {expanded.admin && !sidebarCollapsed && (
              <div className="ml-4 mt-1 space-y-1">
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {!sidebarCollapsed && (
        <>
          <Separator />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                FT
              </div>
              <div>
                <p className="text-sm font-medium">Finance Team</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
