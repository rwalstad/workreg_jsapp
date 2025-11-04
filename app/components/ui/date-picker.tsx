"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react" // Import the X icon for the clear button

import { cn } from "../../../lib/utils"
import { Button } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover"

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({ date, onSelect, placeholder = "Pick a date" }: DatePickerProps) {
  const handleClear = () => {
    onSelect(undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 inline" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white">
        <div className="flex flex-col space-y-2 p-2"> {/* Container for Calendar and Button */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            initialFocus
          />
          {date && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="mr-2 h-4 w-4 inline" />
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}