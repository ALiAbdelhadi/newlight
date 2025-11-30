"use client"

import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

type LocaleType = "ar" | "en" | string

const DrawerLocaleContext = React.createContext<LocaleType>("en")
const useDrawerLocale = () => React.useContext(DrawerLocaleContext)

const Drawer = ({
  shouldScaleBackground = true,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  const locale = useLocale()

  return (
    <DrawerLocaleContext.Provider value={locale}>
      <DrawerPrimitive.Root
        shouldScaleBackground={shouldScaleBackground}
        {...props}
      >
        {children}
      </DrawerPrimitive.Root>
    </DrawerLocaleContext.Provider>
  )
}
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-sm", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    description?: string
  }
>(({ className, children, description, ...props }, ref) => {
  const locale = useDrawerLocale()
  const dir = locale === "ar" ? "rtl" : "ltr"

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        dir={dir}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl bg-background border border-b-0",
          className
        )}
        aria-describedby={description ? "drawer-description" : undefined}
        {...props}
      >
        <div className="mx-auto mt-4 w-[100px] min-h-1! bg-muted rounded-full" />
        {description && (
          <div id="drawer-description" className="sr-only">
            {description}
          </div>
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "grid gap-1.5 p-4 text-center sm:text-start",
      className
    )}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger
}
