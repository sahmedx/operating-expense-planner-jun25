import { SummaryDashboard } from "@/components/summary-dashboard"
import { ExpensePlannerProvider } from "@/components/expense-planner-context"

export default function SummaryDashboardPage() {
  return (
    <ExpensePlannerProvider>
      <SummaryDashboard />
    </ExpensePlannerProvider>
  )
}
