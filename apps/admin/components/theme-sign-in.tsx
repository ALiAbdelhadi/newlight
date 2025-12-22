"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemedSignIn() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);


  if (!mounted) return null

  return (
    <div className="w-full">
      <ScrollArea className="max-h-[80vh]">
        <div className="pr-4">
          <SignIn
            appearance={{
              baseTheme: theme === "dark" ? dark : undefined,
              elements: {
                formButtonPrimary: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  fontSize: "14px",
                  fontWeight: "500",
                  letterSpacing: "0.05em",
                  borderRadius: "0px",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: "hsl(var(--primary) / 0.9)",
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0px)",
                  },
                },
                card: {
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  // border: "1px solid hsl(var(--border))",
                  borderRadius: "0px",
                },
                headerTitle: {
                  fontSize: "24px",
                  fontWeight: "300",
                  letterSpacing: "0.05em",
                  color: "hsl(var(--foreground))",
                  marginBottom: "8px",
                },
                headerSubtitle: {
                  fontSize: "14px",
                  fontWeight: "300",
                  letterSpacing: "0.05em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "24px",
                },
                socialButtonsBlockButton: {
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "14px",
                  fontWeight: "300",
                  borderRadius: "0px",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: "hsl(var(--secondary))",
                    borderColor: "hsl(var(--primary))",
                  },
                },
                formFieldLabel: {
                  fontSize: "14px",
                  fontWeight: "400",
                  letterSpacing: "0.05em",
                  color: "hsl(var(--foreground))",
                  textTransform: "capitalize",
                },
                formFieldInput: {
                  backgroundColor: theme === "dark" ? "hsl(var(--primary) / 0.1)" : "hsl(var(--primary) / 0.05)",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "14px",
                  borderRadius: "0px",
                  transition: "all 0.3s ease",
                  "&::placeholder": {
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: "300",
                    letterSpacing: "0.02em",
                  },
                  "&:focus": {
                    backgroundColor: theme === "dark" ? "hsl(var(--primary) / 0.2)" : "hsl(var(--primary) / 0.1)",
                    borderColor: "hsl(var(--primary))",
                    boxShadow: "none",
                  },
                },
                footerActionLink: {
                  color: "hsl(var(--primary))",
                  fontSize: "14px",
                  fontWeight: "300",
                  letterSpacing: "0.05em",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    color: "hsl(var(--primary) / 0.8)",
                  },
                },
                dividerLine: {
                  backgroundColor: "hsl(var(--border))",
                },
                dividerText: {
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "12px",
                  fontWeight: "300",
                  letterSpacing: "0.05em",
                },
              },
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
