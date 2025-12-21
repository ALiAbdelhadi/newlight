import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string;
  email: string;
  imageUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function UserAvatar({
  name,
  email,
  imageUrl,
  className = "",
  size = "md",
}: UserAvatarProps) {
  const initials =
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage
        src={
          imageUrl || `https://api.dicebear.com/6.x/initials/svg?seed=${email}`
        }
        alt={name || email}
      />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};