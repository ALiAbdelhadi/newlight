"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, LockKeyhole, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

const adminSchema = z.object({
    role: z
        .string()
        .min(3, "Admin role must be at least 3 characters")
        .max(50, "Admin role too long")
        .trim()
        .refine((val) => val.length > 0, "Admin role is required"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password too long")
        .refine((val) => val.length > 0, "Password is required"),
})

type AdminFormData = z.infer<typeof adminSchema>

export default function AdminClient() {
    const router = useRouter()
    const [formData, setFormData] = useState<AdminFormData>({
        role: "",
        password: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof AdminFormData, string>>>({})

    const validateForm = (): boolean => {
        try {
            adminSchema.parse(formData)
            setErrors({})
            return true
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Partial<Record<keyof AdminFormData, string>> = {}
                error.issues.forEach((issue) => {
                    if (issue.path[0]) {
                        fieldErrors[issue.path[0] as keyof AdminFormData] = issue.message
                    }
                })
                setErrors(fieldErrors)
            }
            return false
        }
    }

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error("Validation Failed", {
                description: "Please check your input fields",
            })
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch("/api/verify-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                toast.success("Access Granted", {
                    description: "Redirecting to dashboard...",
                })
                setTimeout(() => {
                    router.push("/admin/dashboard")
                }, 500)
            } else {
                toast.error("Authentication Failed", {
                    description: "Invalid credentials. Please verify and try again.",
                })
            }
        } catch (error) {
            console.error("Admin verification error:", error)
            toast.error("System Error", {
                description: "Unable to verify credentials. Please try again later.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (field: keyof AdminFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md shadow-lg border-muted">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Admin Access</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to access the admin dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="admin-role" className={errors.role ? "text-destructive" : ""}>
                            Admin Role
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="admin-role"
                                placeholder="Enter admin role"
                                type="text"
                                className={`pl-10 ${errors.role ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                value={formData.role}
                                onChange={(e) => handleInputChange("role", e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        {errors.role && (
                            <p className="text-sm text-destructive">{errors.role}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="admin-password" className={errors.password ? "text-destructive" : ""}>
                            Admin Password
                        </Label>
                        <div className="relative">
                            <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="admin-password"
                                placeholder="Enter admin password"
                                type="password"
                                className={`pl-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                value={formData.password}
                                onChange={(e) => handleInputChange("password", e.target.value)}
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isLoading) {
                                        handleSubmit()
                                    }
                                }}
                            />
                        </div>
                        {errors.password && (
                            <p className="text-sm text-destructive">{errors.password}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            "Access Dashboard"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}