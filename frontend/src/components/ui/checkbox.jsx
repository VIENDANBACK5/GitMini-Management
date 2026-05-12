import * as React from "react"

import { cn } from "../../lib/utils"

function Checkbox({ checked = false, onCheckedChange, className, children, ...props }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "peer flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          className
        )}
        {...props}
      >
        {checked ? <span className="block text-[10px] leading-none">✓</span> : null}
      </button>
      {children ? <span>{children}</span> : null}
    </label>
  )
}

export { Checkbox }
