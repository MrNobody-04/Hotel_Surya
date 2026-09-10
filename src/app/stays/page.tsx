"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Bed,
  Phone,
  Clock,
  DollarSign,
  Download,
  Filter,
  Search,
  Receipt,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { StayDTO } from "@/types";
import { DeleteStayModal, DeleteStayTarget } from "@/components/stays/delete-stay-modal";

export default function StaysHistoryPage() {
  const [stays, setStays] = useState<StayDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteStayTarget | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stays?status=CHECKED_OUT&take=100");
      if (res.ok) {
        const data = await res.json();
        setStays(data.stays || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stay history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const exportCSV = () => {
    if (stays.length === 0) {
      toast.error("No stays to export");
      return;
    }

    const headers = [
      "Stay ID",
      "Guest Name",
      "Contact",
      "Room",
      "Type",
      "People",
      "Check In",
      "Check Out",
      "Room Price",
      "Total Bill",
      "Total Paid",
      "Status",
    ];

    const rows = stays.map((s) => [
      s.id,
      `"${s.customer.fullName}"`,
      s.customer.contactNumber,
      s.room.roomNumber,
      s.room.type,
      s.numberOfPeople,
      `"${formatNepalDateTime(s.checkInAt)}"`,
      `"${formatNepalDateTime(s.checkoutAt)}"`,
      s.roomPrice,
      s.billCalculation?.totalAmount || s.roomPrice,
      s.billCalculation?.paidAmount || s.roomPrice,
      s.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hotel_surya_stays_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Stay history exported to CSV");
  };

  const filtered = stays.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.customer.fullName.toLowerCase().includes(q) ||
      s.room.roomNumber.toLowerCase().includes(q) ||
      s.customer.contactNumber.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Stay History & Archives
          </h1>
          <p className="text-sm text-muted-foreground">
            Historical guest stays with fully preserved charges, bills, and payments
          </p>
        </div>

        <Button
          variant="outline"
          onClick={exportCSV}
          className="gap-1.5"
          disabled={stays.length === 0}
        >
          <Download className="w-4 h-4" />
          <span>Export Stays (CSV)</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 border rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search historical stays by guest name, room, or contact..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          {filtered.length} past stay{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading historical records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <History className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div className="font-semibold text-foreground">No Historical Stays</div>
              <p className="text-xs max-w-sm mx-auto">
                {search ? "No records matched your search." : "Completed stays will appear here after checkout."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Stay ID</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Guest Name</th>
                    <th className="px-4 py-3">Stay Duration</th>
                    <th className="px-4 py-3">Charges Breakdown</th>
                    <th className="px-4 py-3">Total Billed</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((stay) => {
                    const calc = stay.billCalculation;

                    return (
                      <tr key={stay.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          #{stay.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {stay.room.roomNumber}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({stay.room.type})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {stay.customer.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stay.customer.contactNumber} • {stay.numberOfPeople} Person(s)
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground space-y-0.5">
                          <div>In: {formatNepalDateTime(stay.checkInAt)}</div>
                          <div>Out: {formatNepalDateTime(stay.checkoutAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-xs space-y-0.5">
                          <div>Room: {formatCurrency(stay.roomPrice)}</div>
                          <div className="text-muted-foreground">
                            F&B / Extra:{" "}
                            {formatCurrency(
                              (calc?.totalAmount || stay.roomPrice) - stay.roomPrice
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {formatCurrency(calc?.totalAmount || stay.roomPrice)}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-mono font-bold">
                          {formatCurrency(calc?.paidAmount || stay.roomPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/stays/${stay.id}/bill`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Receipt className="w-3 h-3" />
                                <span>View Receipt</span>
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDeleteTarget({
                                  id: stay.id,
                                  roomNumber: stay.room.roomNumber,
                                  guestName: stay.customer.fullName,
                                  status: stay.status,
                                })
                              }
                              className="h-7 px-2 text-xs gap-1 border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700"
                              title="Delete Stay Record"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteStayModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        stay={deleteTarget}
        onSuccess={fetchHistory}
      />
    </div>
  );
}
