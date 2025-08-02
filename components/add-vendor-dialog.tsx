"use client"

import type React from "react"

import { useState } from "react"
import { useExpensePlanner } from "./expense-planner-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, X } from "lucide-react"

interface AddVendorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddVendorDialog({ open, onOpenChange }: AddVendorDialogProps) {
  const { addVendor } = useExpensePlanner()
  const [vendorName, setVendorName] = useState("")
  const [glAccount, setGLAccount] = useState<string>("")
  const [costCenter, setCostCenter] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!vendorName.trim()) {
      setError("Vendor name is required")
      return
    }

    if (!glAccount) {
      setError("GL Account is required")
      return
    }

    if (!costCenter) {
      setError("Cost Center is required")
      return
    }

    setIsSubmitting(true)

    try {
      addVendor(vendorName, glAccount as any, costCenter as any)

      // Reset form
      setVendorName("")
      setGLAccount("")
      setCostCenter("")

      // Close dialog
      onOpenChange(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add vendor. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>Enter the details for the new vendor you want to add.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3 flex-grow">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Dismiss error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor-name" className="text-right">
                Vendor Name
              </Label>
              <Input
                id="vendor-name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="col-span-3"
                placeholder="Enter vendor name"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gl-account" className="text-right">
                GL Account
              </Label>
              <Select value={glAccount} onValueChange={setGLAccount} required>
                <SelectTrigger id="gl-account" className="col-span-3">
                  <SelectValue placeholder="Select GL Account" />
                </SelectTrigger>
                <SelectContent>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost-center" className="text-right">
                Cost Center
              </Label>
              <Select value={costCenter} onValueChange={setCostCenter} required>
                <SelectTrigger id="cost-center" className="col-span-3">
                  <SelectValue placeholder="Select Cost Center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
