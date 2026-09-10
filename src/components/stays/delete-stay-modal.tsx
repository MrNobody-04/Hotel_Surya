"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface DeleteStayTarget {
  id: string;
  roomNumber?: string;
  guestName?: string;
  status?: string;
}

interface DeleteStayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: DeleteStayTarget | null;
  onSuccess: () => void;
}

export function DeleteStayModal({
  open,
  onOpenChange,
  stay,
  onSuccess,
}: DeleteStayModalProps) {
  const [deleteCustomer, setDeleteCustomer] = useState(true);
  const [deleting, setDeleting] = useState(false);

  if (!stay) return null;

  const isActive = stay.status === "ACTIVE";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/stays/${stay.id}?deleteCustomer=${deleteCustomer}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete stay record");
      }

      toast.success(
        `Stay record for ${stay.guestName || "guest"} (Room ${stay.roomNumber || ""}) deleted successfully.${
          data.customerDeleted ? " Customer profile was also removed." : ""
        }`
      );

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete stay record");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !deleting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {isActive ? "Delete Active Check-In?" : "Delete Stay Record?"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            This action will permanently delete this stay and all linked charges, food & drink bills, and payment records.
          </DialogDescription>
        </DialogHeader>

        {/* Stay Summary Info Box */}
        <div className="my-2 p-3 bg-muted/40 rounded-xl border space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Guest Name:</span>
            <span className="font-bold text-foreground">{stay.guestName || "N/A"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Room:</span>
            <span className="font-mono font-bold text-foreground">
              Room {stay.roomNumber || "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stay ID:</span>
            <span className="font-mono text-muted-foreground text-[11px]">
              #{stay.id.slice(0, 8)}
            </span>
          </div>
          {isActive && (
            <div className="pt-1 border-t text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Room {stay.roomNumber} will immediately revert to AVAILABLE.</span>
            </div>
          )}
        </div>

        {/* Option to also delete customer */}
        <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer text-xs select-none">
          <input
            type="checkbox"
            checked={deleteCustomer}
            onChange={(e) => setDeleteCustomer(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
          />
          <div className="space-y-0.5">
            <span className="font-medium text-foreground">
              Also delete customer profile
            </span>
            <p className="text-[11px] text-muted-foreground">
              If this guest has no other historical stays, delete their profile and contact info as well.
            </p>
          </div>
        </label>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-bold"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Record</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
