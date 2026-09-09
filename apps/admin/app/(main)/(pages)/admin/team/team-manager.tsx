"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InlineAlert, PageStack, Section, TableFrame } from "@/components/page"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { NativeSelect } from "@/components/ui/native-select"

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
        <PageStack>
            {!isSuper && (
                <InlineAlert tone="info">
                    You can see who the administrators are. Only a SUPER_ADMIN can add, promote or remove one.
                </InlineAlert>
            )}

            {issued && (
                <InlineAlert
                    tone="warning"
                    title={`Password for ${issued.email}`}
                    action={
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIssued(null)}>
                            I have passed it on
                        </Button>
                    }
                >
                    <p className="mb-1.5 font-mono text-base break-all text-foreground select-all">
                        {issued.password}
                    </p>
                    This is shown once and is stored nowhere. Give it to them directly and have them change it. When
                    the sending domain is verified this becomes an emailed link instead.
                </InlineAlert>
            )}

            {isSuper && (
                <Section title="Add an administrator" className="max-w-2xl" framed>
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
                            <NativeSelect
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value as Role)}
                                >
                                <option value="ADMIN">ADMIN</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </NativeSelect>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        SUPER_ADMIN can add and remove administrators. ADMIN can do everything else.
                    </p>
                    <Button size="sm" disabled={pending || !email.trim() || !name.trim()} onClick={submit}>
                        {pending ? "Creating…" : "Create"}
                    </Button>
                </Section>
            )}

            <TableFrame>
                <Table>
                    <caption className="sr-only">Everyone who can sign into this panel</caption>
                    <TableHeader>
                        <TableRow>
                            <TableHead scope="col">Administrator</TableHead>
                            <TableHead scope="col">Role</TableHead>
                            <TableHead scope="col" className="text-right">
                                Signed in
                            </TableHead>
                            <TableHead scope="col">
                                <span className="sr-only">Actions</span>
                            </TableHead>
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
                                            {admin.name}
                                            {isMe && (
                                                <span className="ml-2 rounded border border-neutral-border bg-neutral-bg px-1.5 py-0.5 text-2xs font-medium text-neutral">
                                                    you
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-2xs text-muted-foreground">{admin.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge kind="role" value={admin.role} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {admin.sessions} device{admin.sessions === 1 ? "" : "s"}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        {isMe ? (
                                            <span className="text-2xs text-muted-foreground">
                                                Ask another SUPER_ADMIN to change your own role
                                            </span>
                                        ) : !isSuper ? null : isLastSuper ? (
                                            <span className="text-2xs text-muted-foreground">
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
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            </TableFrame>
        </PageStack>
    )
}
