import * as React from "react"

import { cn } from "../../lib/utils"

function Select({ value, onValueChange, options = [], placeholder, className, disabled, style, allowClear }) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value || null)}
      style={style}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-slate-900 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {(allowClear || placeholder) ? <option value="">{placeholder || "Select an option"}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export { Select }
