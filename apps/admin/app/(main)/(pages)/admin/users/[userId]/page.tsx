import { notFound } from "next/navigation";
import UserClient from "./user-client";
import { prisma } from "@repo/database";

const UserPage = async ({ params }: { params: Promise<{ userId: string }> }) => {
  const resolvedParams = await params;

  console.log("Received params:", resolvedParams);
  console.log("Searching for user with ID:", resolvedParams.userId);

  let user;
  let fetchError = false;

  try {
    user = await prisma.user.findUnique({
      where: {
        id: resolvedParams.userId,
      },
      include: {
        shippingAddress: true,
        product: true,
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            shippingAddress: true,
            configuration: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    console.log("Database query result:", user);
  } catch (error) {
    console.error("Error fetching user:", error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600">Error loading customer data.</p>
      </div>
    );
  }

  if (!user) {
    console.log("User not found!");
    return notFound();
  }

  console.log("Returning user data:", {
    id: user.id,
    email: user.email,
    shippingAddress: user.shippingAddress,
    ordersCount: user.orders.length,
  });

  return <UserClient user={user} />;
};

export default UserPage;