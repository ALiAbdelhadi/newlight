import { notFound } from "next/navigation";
import UserClient from "./user-client";
import { prisma } from "@repo/database";

const UserPage = async ({ params }: { params: Promise<{ userId: string }> }) => {
  const resolvedParams = await params;
  console.log("Received params:", resolvedParams);
  console.log("Searching for user with ID:", resolvedParams.userId);

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: resolvedParams.userId,
      },
      include: {
        shippingAddress: true,
        product: true,
        orders: {
          where: {
            isCompleted: true,
          },
          include: {
            configuration: true,
            shippingAddress: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    console.log("Database query result:", user);
    if (!user) {
      console.log("User not found!");
      return notFound();
    }
    console.log("Returning user data:", {
      id: user.id,
      email: user.email,
      shippingAddress: user.shippingAddress,
    });
    return <UserClient user={user} />;
  } catch (error) {
    console.error("Error fetching user:", error);
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Error loading customer data.
      </div>
    );
  }
};

export default UserPage;
