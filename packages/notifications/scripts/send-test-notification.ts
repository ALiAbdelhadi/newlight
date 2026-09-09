import { prisma } from "@repo/database"

import { adminRecipients, dispatchPush, isPushConfigured, notifyRecipients } from "../index"

const TITLE = "Push test"

async function main() {
    if (!isPushConfigured()) {
        console.error("VAPID is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.")
        process.exitCode = 1
        return
    }

    const recipients = await adminRecipients(prisma)
    if (recipients.length === 0) {
        console.error("No ADMIN or SUPER_ADMIN exists. Seed one first.")
        process.exitCode = 1
        return
    }

    const subscriptions = await prisma.pushSubscription.count({ where: { userId: { in: recipients } } })
    console.log(`${recipients.length} administrator(s), ${subscriptions} subscribed browser(s).`)
    if (subscriptions === 0) {
        console.error("Nobody has enabled browser notifications yet — open the bell in the admin panel first.")
        process.exitCode = 1
        return
    }

    await prisma.$transaction((tx) =>
        notifyRecipients(tx, recipients, {
            type: "SYSTEM_ALERT",
            title: TITLE,
            message: `Sent at ${new Date().toLocaleTimeString()}. If you can read this as a banner, push works.`,
            actionUrl: "/admin/dashboard",
            priority: "HIGH",
        })
    )

    const summary = await dispatchPush(prisma)
    console.log("sweep:", summary)

    if (summary.delivered > 0) console.log(`\nDelivered to ${summary.delivered} browser(s). Look for the banner.`)
    else if (summary.pruned > 0) console.log("\nEvery subscription was dead and has been removed. Enable notifications again.")
    else console.log("\nNothing was delivered. The summary above says why.")

    console.log("cleaned up:", (await prisma.notification.deleteMany({ where: { title: TITLE } })).count)
    await prisma.$disconnect()
}

main()
