import * as React from "react"

import { cn } from "../../lib/utils"

let pushToast = null

function toast({ title, description, variant = "default" }) {
  pushToast?.({
    id: Date.now() + Math.random(),
    title,
    description,
    variant,
  })
}

const variantClasses = {
  default: "border-slate-800 bg-slate-900 text-slate-100",
  destructive: "border-red-500/30 bg-red-500/10 text-red-100",
  success: "border-green-500/30 bg-green-500/10 text-green-100",
}

function Toaster() {
  const [toasts, setToasts] = React.useState([])

  React.useEffect(() => {
    pushToast = (entry) => {
      setToasts((current) => [...current, entry])
      window.setTimeout(() => {
        setToasts((current) => current.filter((toastItem) => toastItem.id !== entry.id))
      }, 3000)
    }
    return () => {
      pushToast = null
    }
  }, [])

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "pointer-events-auto rounded-lg border px-4 py-3 shadow-xl animate-in slide-in-from-bottom-2",
            variantClasses[entry.variant] || variantClasses.default
          )}
        >
          {entry.title ? <p className="text-sm font-semibold">{entry.title}</p> : null}
          {entry.description ? <p className="mt-1 text-sm opacity-90">{entry.description}</p> : null}
        </div>
      ))}
    </div>
  )
}

export { Toaster, toast }
