"use client";

import DashboardHeader from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserAvatar from "@/components/user-avatar";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type UserWithShipping = {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  createdAt: Date;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  } | null;
  orders: {
    id: string;
    status: string;
    total: number;
  }[];
};

const UsersClient = ({ users }: { users: UserWithShipping[] }) => {
  const [searchItem, setSearchItem] = useState<string>("");
  const [filteredUsers, setFilteredUsers] = useState<UserWithShipping[]>(users);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchItem(searchValue);
    setLoading(true);
    setError(null);
    try {
      const filteredItems = users.filter(
        (user: UserWithShipping) =>
          user.shippingAddress?.phone?.includes(searchValue) ||
          user.phoneNumber?.includes(searchValue) ||
          user.shippingAddress?.fullName
            .toLowerCase()
            .includes(searchValue.toLowerCase()) ||
          user.shippingAddress?.addressLine1
            .toLowerCase()
            .includes(searchValue.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchValue.toLowerCase()),
      );
      setFilteredUsers(filteredItems);
    } catch (error) {
      setError("Error filtering customers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: UserWithShipping["shippingAddress"]) => {
    if (!address) return "N/A";
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route="Customers">
        <div className="flex items-center gap-4 md:ml-auto">
          <form className="ml-auto flex-1 sm:flex-initial">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchItem}
                onChange={handleInputChange}
                type="text"
                placeholder="Search customers..."
                className="pl-8 w-full sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </form>
        </div>
      </DashboardHeader>
      <div className="mt-10 px-6">
        <h2 className="text-xl font-semibold mb-4">All Customers</h2>
        <Card className="overflow-hidden">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-lg sm:text-xl">Customers</CardTitle>
          </CardHeader>
          <CardContent className="px-4 p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Id</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Orders Count</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {error && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-red-600"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No Customers Found
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    !error &&
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Link
                            href={`/admin/dashboard/users/${user.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {user.id.slice(0, 8)}...
                          </Link>
                        </TableCell>
                        <TableCell className="flex items-center text-nowrap">
                          <UserAvatar email={user.email ?? ""} className="mr-1.5" />
                          {user.shippingAddress?.fullName || "N/A"}
                        </TableCell>
                        <TableCell>
                          {user.shippingAddress?.phone ||
                            user.phoneNumber ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {formatAddress(user.shippingAddress)}
                        </TableCell>
                        <TableCell>{user.email || "N/A"}</TableCell>
                        <TableCell>{user.orders.length}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsersClient;
