"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { cn } from "cn"
import { buttonVariants } from "@/components/ui/button"

function ToggleGroup({
  className,
  variant = "outline",
  size = "sm",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof buttonVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex w-fit items-center rounded-lg border border-border/60 bg-muted/40 p-1 dark:border-border/40 dark:bg-muted/20",
        className,
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "outline",
  size = "sm",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof buttonVariants>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant: "ghost", size }),
        "rounded-md border-0 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground",
        "data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-xs",
        "dark:data-[state=on]:bg-muted/90 dark:data-[state=on]:text-foreground dark:data-[state=on]:shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}



export { ToggleGroup, ToggleGroupItem }
