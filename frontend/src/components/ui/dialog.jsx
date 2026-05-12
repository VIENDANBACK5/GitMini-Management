import * as React from "react"

import { cn } from "../../lib/utils"

const DialogContext = React.createContext(null)

function Dialog({ open, onOpenChange, children }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

function DialogPortal({ children }) {
  return children
}

function DialogOverlay({ className, ...props }) {
  return <div className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", className)} {...props} />
}

function DialogContent({ className, children, onEscapeKeyDown, width = 520, ...props }) {
  const context = React.useContext(DialogContext)

  React.useEffect(() => {
    if (!context?.open) return undefined
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onEscapeKeyDown?.(event)
        context.onOpenChange?.(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [context, onEscapeKeyDown])

  if (!context?.open) return null

  return (
    <DialogPortal>
      <DialogOverlay onClick={() => context.onOpenChange?.(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full rounded-lg border border-slate-800 bg-slate-950 shadow-2xl",
            className
          )}
          style={{ maxWidth: width }}
          {...props}
        >
          {children}
        </div>
      </div>
    </DialogPortal>
  )
}

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 border-b border-slate-800 px-6 py-4 text-left", className)} {...props} />
)

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse gap-2 border-t border-slate-800 px-6 py-4 sm:flex-row sm:justify-end", className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

function DialogClose({ className, children = "×", ...props }) {
  const context = React.useContext(DialogContext)
  return (
    <button
      type="button"
      className={cn("absolute right-4 top-4 text-xl leading-none text-slate-400 transition-colors hover:text-slate-100", className)}
      onClick={() => context?.onOpenChange?.(false)}
      {...props}
    >
      {children}
    </button>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
