"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

interface FYEMonthDetail {
  month: string
  amount: number
  source: "Actuals" | "Forecast"
}

interface VendorRow {
  id: string
  name: string
  forecast: number
  budget: number
  variance: number
  variancePercent: number
  fye?: number
  fyeVariance?: number
  fyeVariancePercent?: number
  fyeMonthDetail?: FYEMonthDetail[]
}

interface VendorBreakdownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  glAccount: string
  vendors: VendorRow[]
  period: string
  mode?: "forecast" | "fye"
}

export function VendorBreakdownDialog({
  open,
  onOpenChange,
  glAccount,
  vendors,
  period,
  mode = "forecast",
}: VendorBreakdownDialogProps) {
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set())

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const toggleVendor = (vendorId: string) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev)
      if (next.has(vendorId)) {
        next.delete(vendorId)
      } else {
        next.add(vendorId)
      }
      return next
    })
  }

  // FYE mode: 7 columns (chevron + vendor + fye + forecast + budget + fye var + f var%)
  // Forecast mode: 5 columns (vendor + forecast + budget + variance + var%)
  const colSpan = mode === "fye" ? 7 : 5

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {glAccount} — Vendor Breakdown for {period}
          </DialogTitle>
          <DialogDescription>
            {mode === "fye"
              ? "Full Year Estimate: Actuals (Jan–Mar) blended with Live Forecast (Apr–Dec). Click a vendor row to see month detail."
              : "Detailed breakdown of vendors by forecast and budget amounts."}
          </DialogDescription>
        </DialogHeader>

        {vendors.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No vendors found for this GL account and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {mode === "fye" && <TableHead className="w-8" />}
                  <TableHead>Vendor</TableHead>
                  {mode === "fye" ? (
                    <>
                      <TableHead className="text-right">FYE</TableHead>
                      <TableHead className="text-right">Forecast</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">FYE vs B Var</TableHead>
                      <TableHead className="text-right">F vs B Var%</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right">Live Forecast</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => {
                  const isExpanded = expandedVendors.has(vendor.id)
                  const canExpand = mode === "fye" && !!vendor.fyeMonthDetail?.length
                  const fyeVar = vendor.fyeVariance ?? 0

                  return (
                    <React.Fragment key={vendor.id}>
                      <TableRow
                        className={canExpand ? "cursor-pointer hover:bg-muted/50" : undefined}
                        onClick={canExpand ? () => toggleVendor(vendor.id) : undefined}
                      >
                        {mode === "fye" && (
                          <TableCell className="w-8">
                            {canExpand ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : null}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <span className="mr-1">{vendor.name}</span>
                            {mode === "forecast" && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        {mode === "fye" ? (
                          <>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(vendor.fye ?? 0)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(vendor.forecast)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(vendor.budget)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                fyeVar < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {fyeVar < 0 ? "▼ " : "▲ "}{formatCurrency(Math.abs(fyeVar))}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                vendor.variance < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {Math.abs(vendor.variancePercent).toFixed(1)}%
                              </span>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-right">{formatCurrency(vendor.forecast)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vendor.budget)}</TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                vendor.variance < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {vendor.variance < 0 ? "▼ " : "▲ "}{formatCurrency(Math.abs(vendor.variance))}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                vendor.variance < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {Math.abs(vendor.variancePercent).toFixed(1)}%
                              </span>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                      {canExpand && isExpanded && vendor.fyeMonthDetail && (
                        <TableRow>
                          <TableCell colSpan={colSpan} className="p-0 bg-muted/20">
                            <div className="px-10 py-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left py-1 font-normal w-24">Month</th>
                                    <th className="text-right py-1 font-normal">Amount</th>
                                    <th className="text-left py-1 pl-6 font-normal">Source</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vendor.fyeMonthDetail.map((detail) => (
                                    <tr key={detail.month} className="border-t border-muted">
                                      <td className="py-1 text-muted-foreground">{detail.month}</td>
                                      <td className="py-1 text-right">{formatCurrency(detail.amount)}</td>
                                      <td className="py-1 pl-6">
                                        <span
                                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                            detail.source === "Actuals"
                                              ? "bg-muted text-muted-foreground"
                                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                          }`}
                                        >
                                          {detail.source}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
