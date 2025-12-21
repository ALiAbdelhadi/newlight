import { Container } from "@/components/container";
import DashboardHeader from "@/components/dashboard-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/price";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { MoveHorizontalIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic'
export const revalidate = 0

const Products = async () => {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    console.log("User Not Found.");
    return notFound();
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (user.emailAddresses[0].emailAddress !== ADMIN_EMAIL) {
    console.log("User Not authorized");
    return notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    include: {
      translations: {
        take: 1,
      },
      subCategory: {
        include: {
          translations: {
            take: 1,
          },
          category: {
            include: {
              translations: {
                take: 1,
              },
            },
          },
        },
      },
      orderItems: {
        select: {
          quantity: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const productsWithStats = products.map((product) => {
    const totalQuantity = product.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    return {
      ...product,
      totalQuantity,
    };
  });

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route="Products" />
      <div className="mt-8">
        <Container>
          <h1 className="font-semibold text-lg mb-4">Products</h1>
          <div className="overflow-x-auto border rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Total Sold</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsWithStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  productsWithStats.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="flex items-center">
                        {product.images && product.images.length > 0 && (
                          <Image
                            src={product.images[0]}
                            alt={product.translations[0]?.name || product.productId}
                            width={60}
                            height={60}
                            className="rounded-lg mr-2 object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {product.translations[0]?.name || product.productId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {product.productId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.subCategory?.translations[0]?.name ||
                          product.subCategory?.slug ||
                          "N/A"}
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.inventory}</TableCell>
                      <TableCell>{product.totalQuantity}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoveHorizontalIcon className="w-4 h-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/dashboard/products/${product.id}`}>
                                View Product
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Product</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Products;