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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/price";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { MoveHorizontalIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ViewType = 'all' | 'sold';

const Products = async ({
  searchParams,
}: {
  searchParams: Promise<{ view?: ViewType }>;
}) => {
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

  const params = await searchParams;
  const view = params.view || 'all';

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
      hasSales: totalQuantity > 0,
    };
  });

  const filteredProducts = view === 'sold' 
    ? productsWithStats.filter(p => p.hasSales)
    : productsWithStats;

  const totalProducts = productsWithStats.length;
  const soldProducts = productsWithStats.filter(p => p.hasSales).length;
  const totalSoldQuantity = productsWithStats.reduce(
    (sum, p) => sum + p.totalQuantity,
    0
  );

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route="Products" />
      <div className="mt-8">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">Total Products</p>
              <p className="text-2xl font-bold">{totalProducts}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">Products with Sales</p>
              <p className="text-2xl font-bold text-green-600">{soldProducts}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">Total Units Sold</p>
              <p className="text-2xl font-bold text-blue-600">{totalSoldQuantity}</p>
            </div>
          </div>
          <div className="mb-6">
            <Tabs defaultValue={view} className="w-full">
              <TabsList>
                <TabsTrigger value="all" asChild>
                  <Link href="/admin/products?view=all">
                    All Products ({totalProducts})
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="sold" asChild>
                  <Link href="/admin/products?view=sold">
                    Sold Products ({soldProducts})
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <h1 className="font-semibold text-lg mb-4">
            {view === 'sold' ? 'Products with Sales' : 'All Products'}
          </h1>
          <div className="overflow-x-auto border rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Total Sold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody  className="bg-transparent">
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {view === 'sold' 
                        ? 'No products with sales found' 
                        : 'No products found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
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
                      <TableCell>
                        <span className={product.inventory < 10 ? 'text-red-600 font-medium' : ''}>
                          {product.inventory}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={product.totalQuantity > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {product.totalQuantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.hasSales ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active Sales
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                            No Sales
                          </span>
                        )}
                      </TableCell>
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
                              <Link href={`/admin/products/${product.id}`}>
                                View Product
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Product</DropdownMenuItem>
                            {product.hasSales && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/orders?product=${product.productId}`}>
                                  View Orders
                                </Link>
                              </DropdownMenuItem>
                            )}
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