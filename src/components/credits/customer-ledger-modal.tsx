"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCw, FileText } from "lucide-react";
import { CreditAccountDTO, CreditLedgerEntryDTO } from "@/types";

interface CustomerLedgerModalProps {
  account: CreditAccountDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerLedgerModal({
  account,
  isOpen,
  onClose,
}: CustomerLedgerModalProps) {
  const [entries, setEntries] = useState<CreditLedgerEntryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    if (!account) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/credits/ledger/${account.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load ledger");
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && account) {
      fetchLedger();
    }
  }, [isOpen, account]);

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden sm:rounded-2xl shadow-2xl border-amber-500/20 max-h-[92dvh] flex flex-col">
        <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Customer Credit Ledger
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete chronological transaction history for{" "}
                  <span className="font-semibold text-foreground">
                    {account.customer?.fullName}
                  </span>{" "}
                  ({account.customer?.contactNumber})
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchLedger}
              disabled={loading}
              className="text-xs gap-1.5 h-8 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Account Summary Cards */}
          <div className="grid grid-cols-3 gap-3 pt-3">
            <div className="p-3 rounded-xl bg-card border">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Total Credit Charged
              </span>
              <span className="font-mono font-bold text-sm text-foreground">
                Rs. {account.totalCharged.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card border">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Total Payments Received
              </span>
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                Rs. {account.totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card border">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Current Balance Due
              </span>
              <span className="font-mono font-black text-base text-rose-500">
                Rs. {account.currentBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Ledger Table Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">Loading financial ledger entries...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FileText className="w-10 h-10 stroke-[1.5] text-muted-foreground/50" />
              <p className="text-sm font-semibold">No transactions recorded yet.</p>
              <p className="text-xs">Ledger entries appear when credit purchases or payments are made.</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit (+Rs.)</th>
                    <th className="py-2.5 px-3 text-right">Credit (-Rs.)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                    <th className="py-2.5 px-3">Ref #</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {entries.map((entry) => {
                    const formattedDate = new Date(entry.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground font-sans">
                          {formattedDate}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              entry.type === "CHARGE"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : entry.type === "PAYMENT"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : entry.type === "ADJUSTMENT"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {entry.type === "CHARGE" && <ArrowUpRight className="w-2.5 h-2.5" />}
                            {entry.type === "PAYMENT" && <ArrowDownLeft className="w-2.5 h-2.5" />}
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-foreground max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-500">
                          {entry.debit > 0 ? `+${entry.debit.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? `-${entry.credit.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-foreground">
                          Rs. {entry.runningBalance.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {entry.referenceNumber || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/30 border-t flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Close Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
