import { UserButton } from "@clerk/nextjs";
interface UserAvatarProps {
    isMobile?: boolean
}

export default function AuthAvatar({ isMobile = false }: UserAvatarProps) {
    return (
        <>
            <UserButton
                afterSignOutUrl="/"
                appearance={{
                    elements: {
                        avatarBox: `${isMobile ? "w-9 h-9" : "w-11 h-11"} transition-opacity hover:opacity-80`,
                        userButtonPopoverCard: "border border-border",
                        userButtonPopoverFooter: "hidden",
                    },
                    variables: {
                        fontSize: isMobile ? "13px" : "14px",
                        borderRadius: "0.5rem",
                    },
                }}
            />
        </>
    )
}