import { ExpensePlannerWithProduct } from "@/components/expense-planner-with-product"
import { ExpensePlannerProvider } from "@/components/expense-planner-context"

export default function OperatingExpensesWithProductPage() {
  return (
    <ExpensePlannerProvider>
      <ExpensePlannerWithProduct />
    </ExpensePlannerProvider>
  )
}
