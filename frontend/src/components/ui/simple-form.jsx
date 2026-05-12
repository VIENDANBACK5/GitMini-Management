import * as React from "react"

import { cn } from "../../lib/utils"
import { Checkbox } from "./checkbox"
import { Label } from "./label"

const FormContext = React.createContext(null)

function Form({ initialValues = {}, onSubmit, onFinish, className, children }) {
  const [values, setValues] = React.useState(initialValues)

  React.useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  const setValue = React.useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    ;(onSubmit || onFinish)?.(values)
  }

  return (
    <FormContext.Provider value={{ values, setValue }}>
      <form className={cn("space-y-4", className)} onSubmit={handleSubmit}>
        {children}
      </form>
    </FormContext.Provider>
  )
}

function FormField({ name, label, children, className, valuePropName }) {
  const context = React.useContext(FormContext)
  const child = React.Children.only(children)

  if (!React.isValidElement(child) || !context) {
    return <div className={className}>{children}</div>
  }

  const isCheckbox = valuePropName === "checked" || child.type === Checkbox
  const value = context.values[name]
  const controlProps = isCheckbox
    ? {
        checked: Boolean(value),
        onCheckedChange: (nextValue) => {
          context.setValue(name, nextValue)
          child.props.onCheckedChange?.(nextValue)
        },
      }
    : {
        value: value ?? "",
        onChange: (event) => {
          const nextValue = event?.target ? event.target.value : event
          context.setValue(name, nextValue)
          child.props.onChange?.(event)
        },
        onValueChange: (nextValue) => {
          context.setValue(name, nextValue)
          child.props.onValueChange?.(nextValue)
        },
      }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label>{label}</Label> : null}
      {React.cloneElement(child, controlProps)}
    </div>
  )
}

function FormActions({ className, ...props }) {
  return <div className={cn("pt-2", className)} {...props} />
}

export { Form, FormActions, FormField }

Form.Item = FormField
