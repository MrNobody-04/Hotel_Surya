"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Users,
  Bed,
  Receipt,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadDataset = async (type: "customers" | "stays" | "expenses") => {
    setDownloading(type);
    try {
      if (type === "customers") {
        const res = await fetch("/api/customers?take=1000");
        const data = await res.json();
        const headers = ["ID", "Full Name", "Gender", "Contact Number", "Citizenship", "Address", "Created At"];
        const rows = (data.customers || []).map((c: any) => [
          c.id,
          `"${c.fullName}"`,
          c.gender,
          c.contactNumber,
          `"${c.citizenshipNumber || ""}"`,
          `"${c.address || ""}"`,
          `"${c.createdAt}"`,
        ]);
        triggerDownload(headers, rows, "hotel_surya_customers");
      } else if (type === "stays") {
        const res = await fetch("/api/stays?take=1000&status=CHECKED_OUT");
        const data = await res.json();
        const headers = ["ID", "Guest", "Room", "People", "Check In", "Check Out", "Room Price", "Status"];
        const rows = (data.stays || []).map((s: any) => [
          s.id,
          `"${s.customer.fullName}"`,
          s.room.roomNumber,
          s.numberOfPeople,
          `"${s.checkInAt}"`,
          `"${s.checkoutAt || ""}"`,
          s.roomPrice,
          s.status,
        ]);
        triggerDownload(headers, rows, "hotel_surya_stay_history");
      } else if (type === "expenses") {
        const res = await fetch("/api/expenses?take=1000");
        const data = await res.json();
        const headers = ["ID", "Title", "Category", "Amount (NPR)", "Date", "Method", "Notes"];
        const rows = (data.expenses || []).map((e: any) => [
          e.id,
          `"${e.title}"`,
          e.category,
          e.amount,
          `"${e.date}"`,
          e.paymentMethod,
          `"${e.notes || ""}"`,
        ]);
        triggerDownload(headers, rows, "hotel_surya_expenses");
      }
      toast.success(`Exported ${type} to CSV successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    } finally {
      setDownloading(null);
    }
  };

  const triggerDownload = (headers: string[], rows: any[][], filename: string) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reports & Data Exports
        </h1>
        <p className="text-sm text-muted-foreground">
          Download structured CSV reports for accounting, auditing, and tax compliance
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customers Export */}
        <Card className="shadow-sm border">
          <CardHeader>
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 w-fit mb-2">
              <Users className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Customer Master Report</CardTitle>
            <CardDescription className="text-xs">
              Complete guest directory with contact numbers, addresses, and registration history.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              className="w-full gap-2 text-xs"
              onClick={() => downloadDataset("customers")}
              disabled={downloading === "customers"}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading === "customers" ? "Exporting..." : "Download Customers (CSV)"}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Stays Export */}
        <Card className="shadow-sm border">
          <CardHeader>
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit mb-2">
              <Bed className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Stays & Revenue Report</CardTitle>
            <CardDescription className="text-xs">
              Historical stays with check-in/checkout dates, room rates, and total settled revenue.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              className="w-full gap-2 text-xs"
              onClick={() => downloadDataset("stays")}
              disabled={downloading === "stays"}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading === "stays" ? "Exporting..." : "Download Stays (CSV)"}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Expenses Export */}
        <Card className="shadow-sm border">
          <CardHeader>
            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 w-fit mb-2">
              <Receipt className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Operational Expenses Report</CardTitle>
            <CardDescription className="text-xs">
              Itemized hotel operational expenses categorized by salaries, kitchen groceries, utilities, and maintenance.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              className="w-full gap-2 text-xs"
              onClick={() => downloadDataset("expenses")}
              disabled={downloading === "expenses"}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading === "expenses" ? "Exporting..." : "Download Expenses (CSV)"}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Hotel Surya Certified Reporting Notice */}
      <Card className="p-6 bg-muted/30 border text-xs text-muted-foreground space-y-2">
        <div className="font-semibold text-sm text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span>Hotel Surya Financial Reporting Standards</span>
        </div>
        <p>
          All exported records maintain historical data integrity. Changing catalog prices or room defaults does not retroactively alter checked-out bills or historical ledger statements. Timestamps represent official Nepal Standard Time (NPT, UTC+5:45).
        </p>
      </Card>
    </div>
  );
}
