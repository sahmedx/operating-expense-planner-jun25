"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { seedDatabase } from "@/lib/seed-database"
import { Loader2 } from "lucide-react"

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleSeed = async () => {
    setIsSeeding(true)
    setResult(null)

    try {
      const seedResult = await seedDatabase()
      setResult(seedResult)
    } catch (error) {
      setResult({ success: false, message: `Error: ${error.message}` })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Seed Database</CardTitle>
          <CardDescription>This will populate your database with sample expense data for testing.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">This action will:</p>
          <ul className="space-y-2 text-sm list-disc pl-5 mb-4">
            <li>Clear all existing vendors and expense data</li>
            <li>Create 10 sample vendors across different categories</li>
            <li>Generate expense data for all vendors across all versions</li>
            <li>Set up proper relationships between Actuals and Forecast data</li>
          </ul>

          {result && (
            <div
              className={`p-3 mt-4 rounded-md ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              {result.message}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSeed} disabled={isSeeding} className="w-full">
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Database...
              </>
            ) : (
              "Seed Database"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
