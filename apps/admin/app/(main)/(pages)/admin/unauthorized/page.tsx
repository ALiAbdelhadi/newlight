"use client";

import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#f8f8f8] dark:bg-[#000] text-[#1d1d1f] dark:text-white px-4">
            <div className="text-center max-w-xl">
                <h1 className="text-5xl font-semibold tracking-tight mb-4">
                    Access Denied
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                    You’re not authorized to access this area. This section is limited to
                    administrators only.
                </p>
                <Link
                    href="/auth/sign-in"
                    className="inline-block px-6 py-3 text-sm font-medium text-white bg-black rounded-full hover:bg-neutral-800 transition duration-200"
                >
                    Return to Sign In
                </Link>
            </div>
        </main>
    );
}
