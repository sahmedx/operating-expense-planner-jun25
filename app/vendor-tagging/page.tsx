import { VendorProductTagging } from "@/components/vendor-product-tagging"
import { ExpensePlannerProvider } from "@/components/expense-planner-context"

export default function VendorTaggingPage() {
  return (
    <ExpensePlannerProvider>
      <VendorProductTagging />
    </ExpensePlannerProvider>
  )
}
