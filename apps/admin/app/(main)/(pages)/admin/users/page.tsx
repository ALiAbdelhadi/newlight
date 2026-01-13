import { prisma } from "@repo/database";
import UsersClient from "./users-client";

export const dynamic = 'force-dynamic'
export const revalidate = 0

const UsersPage = async () => {
  let users;

  try {
    users = await prisma.user.findMany({
      include: {
        shippingAddress: true,
        orders: {
          select: {
            id: true,
            status: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to load users data");
  }

  return <UsersClient users={users} />;
};

export default UsersPage;