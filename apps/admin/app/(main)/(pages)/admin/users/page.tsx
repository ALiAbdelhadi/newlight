import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import UsersClient from "./users-client";

const Users = async () => {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return notFound();
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (user.emailAddresses[0].emailAddress !== ADMIN_EMAIL) {
    return notFound();
  }

  let users;
  let error;

  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        shippingAddress: {
          select: {
            fullName: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
            total: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      "Found users:",
      users.map((u) => ({ id: u.id, email: u.email }))
    );
  } catch (err) {
    console.error("Error fetching users:", err);
    error = err;
  }

  if (error) {
    return <div>Error loading customers</div>;
  }

  return (
    <div>
      <UsersClient users={users} />
    </div>
  );
};

export default Users;