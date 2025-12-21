import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import AdminClient from './admin-client';

const AdminPage = async () => {
    const user = await currentUser();
    const { userId } = await auth();

    if (!userId || !user) {
        return redirect("/sign-in");
    }

    const isAdminEmail = user?.emailAddresses?.[0]?.emailAddress === process.env.ADMIN_EMAIL;

    if (!isAdminEmail) {
        return redirect("/unauthorized");
    }

    return <AdminClient />;
};

export default AdminPage;