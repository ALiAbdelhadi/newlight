"use client";

import { formatPrice } from "../lib/utils";
import SummaryCard from "./summary-card";

const DashboardSummary = ({
  totalSales,
  totalCustomers,
  totalOrders,
}: {
  totalSales: number | null;
  totalCustomers: number;
  totalOrders: number;
}) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <SummaryCard
      title="Total Sales"
      description="Overview of total sales on the website."
      value={formatPrice(totalSales ?? 0)}
      percentage="+15% from last month"
      valueClass="text-green-600"
    />
    <SummaryCard
      title="Customers"
      description="List of customers with search functionality."
      value={totalCustomers}
      percentage="+5% from last month"
    />
    <SummaryCard
      title="Orders"
      description="List of Orders that have sold out."
      value={totalOrders}
      percentage="-10% from last month"
    />
  </div>
);

export default DashboardSummary;
