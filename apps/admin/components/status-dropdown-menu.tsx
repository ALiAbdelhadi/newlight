"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/status";
import { allowedTransitionsFrom, OrderStatus } from "@repo/database";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeOrderStatus } from "../app/action/action";

/*
 * The private LABEL_MAP that lived here is gone. It was the SECOND copy of the order
 * labels — lib/utils.ts had the other — and the two had already diverged: this one said
 * "Awaiting Shipment", so the same order read differently here than on the dashboard.
 * One vocabulary now, in lib/status.ts.
 */

/**
 * Moving an order through the state machine.
 *
 * Three things were wrong with this, and they compounded:
 *
 *   IT OFFERED EVERY STATUS. `Object.values(OrderStatus)` put "Delivered" in front of an order
 *   that had not shipped and "Awaiting Shipment" in front of one already delivered. The machine
 *   refused them correctly — so the menu offered eleven choices of which most were errors.
 *
 *   THE REFUSAL WAS SILENT. `mutate` had no `onError`, and until A101 the app had no Toaster
 *   either, so choosing an illegal status did nothing at all. Nothing moved, nothing said why.
 *
 *   THERE WAS NOWHERE TO PUT A TRACKING NUMBER. `shipOrder(id, actor, trackingNumber?)` takes
 *   one, `changeOrderStatus` passes one through, and no caller ever supplied it — which is why
 *   `/admin/shipping` counts "shipped, untracked" as a number.
 *
 * `allowedTransitionsFrom` is the same table the machine enforces, so the menu cannot drift
 * from it. Shipping asks for the number, and lets you skip: under COD it usually arrives later,
 * and refusing to ship without one would just teach people to type a placeholder.
 */
const StatusDropdown = ({
  id,
  orderStatus,
  compact = false,
}: {
  id: string;
  orderStatus: OrderStatus;
  /**
   * A 30px, content-width trigger for a table cell. The default 208px control is right on a
   * record header, where the status is one of three things on the screen, and wrong in a
   * 34px row where it would set the width of the whole column.
   */
  compact?: boolean;
}) => {
  const router = useRouter();
  const [shipping, setShipping] = useState(false);
  const [tracking, setTracking] = useState("");

  const { mutate, isPending } = useMutation({
    mutationKey: ["change-order-status"],
    mutationFn: changeOrderStatus,
    onSuccess: (result) => {
      // The action returns a result rather than throwing, so a refusal arrives here as data.
      if (result && typeof result === "object" && "success" in result && !result.success) {
        toast.error(("error" in result && String(result.error)) || "That change was refused.");
        return;
      }
      toast.success("Order updated.");
      setShipping(false);
      setTracking("");
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "That change was refused."),
  });

  const allowed = allowedTransitionsFrom(orderStatus, "ADMIN");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(
              "flex items-center justify-between border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
              compact ? "h-7 w-auto min-w-36 px-2 text-xs" : "w-52"
            )}
            variant="outline"
            disabled={isPending}
          >
            {statusLabel("order", orderStatus)}
            <ChevronsUpDown className={cn("shrink-0 opacity-50", compact ? "ml-1.5 size-3" : "ml-2 h-4 w-4")} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-popover text-popover-foreground border-border w-52">
          <DropdownMenuItem disabled className="flex text-sm gap-1 items-center p-2.5">
            <Check className="mr-2 h-4 w-4 text-primary" />
            {statusLabel("order", orderStatus)}
          </DropdownMenuItem>

          {allowed.length === 0 ? (
            <DropdownMenuItem disabled className="p-2.5 text-sm text-muted-foreground">
              {/* delivered and cancelled are terminal — saying so beats an empty menu. */}
              Nothing follows this
            </DropdownMenuItem>
          ) : (
            allowed.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => {
                  if (status === "shipped") setShipping(true);
                  else mutate({ id, newStatus: status });
                }}
                className={cn(
                  "flex text-sm gap-1 items-center p-2.5 cursor-default",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Check className="mr-2 h-4 w-4 opacity-0" />
                {statusLabel("order", status)}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={shipping} onOpenChange={setShipping}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this order shipped?</AlertDialogTitle>
            <AlertDialogDescription>
              Stock leaves the ledger and the customer is notified. Under cash on delivery the
              tracking number usually arrives after the parcel does — you can add it later from
              the order or from Shipping.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="tracking">Tracking number (optional)</Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="leave blank if you do not have it yet"
              className="font-mono"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                mutate({ id, newStatus: "shipped", trackingNumber: tracking.trim() || undefined });
              }}
            >
              {isPending ? "Shipping…" : "Mark shipped"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StatusDropdown;
