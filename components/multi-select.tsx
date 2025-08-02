"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type Option = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  allText?: string // Add this new prop
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items",
  className,
  allText = "All Items", // Add this default value
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const handleSelect = (value: string) => {
    if (value === "All") {
      // If "All" is selected, clear other selections
      onChange(["All"])
    } else {
      // If a specific item is selected, remove "All" if present
      const newSelected = selected.includes("All")
        ? [value]
        : selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value]

      onChange(newSelected.length ? newSelected : ["All"])
    }

    // Don't close the popover when selecting
  }

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            onClick={() => setOpen(!open)}
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selected.includes("All") ? (
                <div className="flex items-center">
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {allText}
                  </Badge>
                </div>
              ) : (
                selected.map((item) => (
                  <Badge
                    variant="secondary"
                    key={item}
                    className="rounded-sm px-1 font-normal"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                  >
                    {options.find((option) => option.value === item)?.label || item}
                    <X className="ml-1 h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </Badge>
                ))
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="flex items-center"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selected.includes(option.value)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <X className="h-3 w-3" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}
