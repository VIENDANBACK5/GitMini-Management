import { cva } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const statusVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-1 font-medium text-xs transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-muted-foreground [--status-color:theme(colors.slate.400)]",
        success: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400 [--status-color:theme(colors.green.500)]",
        error: "border-destructive/20 bg-destructive/10 text-destructive [--status-color:theme(colors.red.500)]",
        warning: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400 [--status-color:theme(colors.orange.500)]",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 [--status-color:theme(colors.blue.500)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Status(props) {
  const { className, variant = "default", asChild, ...rootProps } = props;

  const RootPrimitive = asChild ? SlotPrimitive.Slot : "div";

  return (
    <RootPrimitive
      data-slot="status"
      data-variant={variant}
      {...rootProps}
      className={cn(statusVariants({ variant }), className)} />
  );
}

function StatusIndicator({className, ...props }) {
  return (
    <div
      data-slot="status-indicator"
      {...props}
      style={{ backgroundColor: 'var(--status-color)', ...props.style }}
      className={cn(
        "relative flex size-2 shrink-0 rounded-full",
        "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-inherit",
        "after:absolute after:inset-[2px] after:rounded-full after:bg-inherit",
        className
      )}
    />
  );
}

function StatusLabel(props) {
  const { className, ...labelProps } = props;

  return (
    <div
      data-slot="status-label"
      {...labelProps}
      className={cn("leading-none", className)} />
  );
}

export { Status, StatusIndicator, StatusLabel, statusVariants };
