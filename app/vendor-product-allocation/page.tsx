import { VendorProductAllocation } from "@/components/vendor-product-allocation"
import { ExpensePlannerProvider } from "@/components/expense-planner-context"

export default function VendorProductAllocationPage() {
  return (
    <ExpensePlannerProvider>
      <VendorProductAllocation />
    </ExpensePlannerProvider>
  )
}
