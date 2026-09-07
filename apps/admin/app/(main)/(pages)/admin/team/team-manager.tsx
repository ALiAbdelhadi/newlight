"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createAdmin, revokeAdminSessions, setAdminRole } from "@/app/action/admin-user-actions"

type Role = "ADMIN" | "SUPER_ADMIN"

interface Admin {
    id: string
    name: string
    email: string
    role: Role
    sessions: number
    createdAt: string
}

export function TeamManager({
    me,
    admins,
}: {
    me: { id: string; role: string }
    admins: Admin[]
}) {
    const router = useRouter()
    const [pending, start] = useTransition()
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [role, setRole] = useState<Role>("ADMIN")
    /** Shown once, never stored. Cleared when the page reloads. */
    const [issued, setIssued] = useState<{ email: string; password: string } | null>(null)

    const isSuper = me.role === "SUPER_ADMIN"
    const superAdmins = admins.filter((a) => a.role === "SUPER_ADMIN").length

    const call = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
        start(async () => {
            const result = await fn()
            if (result.ok) {
                toast.success(result.message ?? "Done.")
                router.refresh()
            } else {
                toast.error(result.error ?? "Something went wrong.")
            }
        })

    const submit = () =>
        start(async () => {
            const result = await createAdmin({ email, name, role })
            if (result.ok && result.password && result.email) {
                setIssued({ email: result.email, password: result.password })
                setEmail("")
                setName("")
                toast.success(result.message ?? "Created.")
                router.refresh()
            } else if (!result.ok) {
                toast.error(result.error)
            }
        })

    return (
        <div className="space-y-8">
            {!isSuper && (
                <p className="rounded-lg border border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/10 p-4 text-sm">
                    You can see who the administrators are. Only a SUPER_ADMIN can add or change them.
                </p>
            )}

            {issued && (
                <section className="rounded-lg border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-900/10 p-4 space-y-2">
                    <h2 className="font-semibold">Password for {issued.email}</h2>
                    <p className="font-mono text-lg break-all select-all">{issued.password}</p>
                    <p className="text-sm text-muted-foreground">
                        {/* It is shown once because it is stored nowhere — the account holds a hash,
                            the audit log deliberately holds neither. */}
                        This is shown once and is stored nowhere. Give it to them directly and have them change it.
                        When the sending domain is verified this becomes an emailed link instead.
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => setIssued(null)}>
                        I have passed it on
                    </Button>
                </section>
            )}

            {isSuper && (
                <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4 max-w-2xl">
                    <h2 className="font-semibold">Add an administrator</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="role">Role</Label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value as Role)}
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="ADMIN">ADMIN</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        SUPER_ADMIN can add and remove administrators. ADMIN can do everything else.
                    </p>
                    <Button disabled={pending || !email.trim() || !name.trim()} onClick={submit}>
                        {pending ? "Creating…" : "Create"}
                    </Button>
                </section>
            )}

            <div className="overflow-x-auto border rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Administrator</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Signed in</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {admins.map((admin) => {
                            const isMe = admin.id === me.id
                            const isLastSuper = admin.role === "SUPER_ADMIN" && superAdmins === 1
                            return (
                                <TableRow key={admin.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {admin.name} {isMe && <Badge variant="secondary" className="ml-2">you</Badge>}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{admin.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={admin.role === "SUPER_ADMIN" ? "default" : "outline"}>
                                            {admin.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {admin.sessions} device{admin.sessions === 1 ? "" : "s"}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        {/* Both refusals are enforced by the service; drawing them here as
                                            explanations rather than disabled buttons means the reason is
                                            visible before the click, not after. */}
                                        {isMe ? (
                                            <span className="text-sm text-muted-foreground">
                                                Ask another SUPER_ADMIN to change your own role
                                            </span>
                                        ) : !isSuper ? null : isLastSuper ? (
                                            <span className="text-sm text-muted-foreground">
                                                The last SUPER_ADMIN — promote someone else first
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={pending}
                                                    onClick={() =>
                                                        call(() =>
                                                            setAdminRole(
                                                                admin.id,
                                                                admin.role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN"
                                                            )
                                                        )
                                                    }
                                                >
                                                    {admin.role === "SUPER_ADMIN" ? "Make ADMIN" : "Make SUPER_ADMIN"}
                                                </Button>

                                                {admin.sessions > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        disabled={pending}
                                                        onClick={() => call(() => revokeAdminSessions(admin.id))}
                                                    >
                                                        Sign out
                                                    </Button>
                                                )}

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={pending}>
                                                            Remove access
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Remove {admin.name}&rsquo;s access?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                They become a customer and are signed out of every device
                                                                immediately. The account and its order history stay.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-destructive text-white hover:bg-destructive/90"
                                                                onClick={() => call(() => setAdminRole(admin.id, "CUSTOMER"))}
                                                            >
                                                                Remove access
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
