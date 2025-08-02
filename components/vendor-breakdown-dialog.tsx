"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react"

interface VendorBreakdownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  glAccount: string
  vendors: Array<{
    id: string
    name: string
    forecast: number
    budget: number
    variance: number
    variancePercent: number
  }>
  period: string
}

export function VendorBreakdownDialog({ open, onOpenChange, glAccount, vendors, period }: VendorBreakdownDialogProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Colors for charts
  const COLORS = {
    forecast: "hsl(215, 100%, 50%)",
    budget: "hsl(142, 76%, 36%)",
    positive: "hsl(142, 76%, 36%)",
    negative: "hsl(0, 84%, 60%)",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {glAccount} - Vendor Breakdown for {period}
          </DialogTitle>
          <DialogDescription>Detailed breakdown of vendors by forecast and budget amounts.</DialogDescription>
        </DialogHeader>

        {vendors.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No vendors found for this GL account and filter criteria.
          </div>
        ) : (
          <>
            {/* Vendor table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Live Forecast</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <span className="mr-1">{vendor.name}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(vendor.forecast)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(vendor.budget)}</TableCell>
                      <TableCell className={`text-right ${vendor.variance < 0 ? "text-green-600" : "text-red-600"}`}>
                        <div className="flex items-center justify-end">
                          {vendor.variance < 0 ? (
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                          )}
                          {formatCurrency(Math.abs(vendor.variance))}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right ${vendor.variance < 0 ? "text-green-600" : "text-red-600"}`}>
                        {Math.abs(vendor.variancePercent).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
