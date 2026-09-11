"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bed,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Receipt,
  PlusCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  CreditCard,
  Utensils,
  CheckCircle2,
  RefreshCw,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentQrModal } from "@/components/billing/payment-qr-modal";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics?mode=dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load dashboard metrics");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const { roomOverview, todayOperations, financialOverview, currentGuests } =
    data || {
      roomOverview: { total: 7, available: 6, occupied: 1, reserved: 0, maintenance: 0, occupancyRate: 14 },
      todayOperations: { checkIns: 0, checkOuts: 0, currentGuestsHeadcount: 0, activeStaysCount: 0 },
      financialOverview: { todayRevenue: 0, weeklyRevenue: 0, monthlyRevenue: 0, todayExpenses: 0, monthlyExpenses: 0, monthlyNetIncome: 0, outstandingPayments: 0 },
      currentGuests: [],
    };

  return (
    <div className="space-y-6">
      {/* Header Bar with Refresh & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            NEW HOTEL SURYA Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Live operational dashboard and room status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQrModal(true)}
            className="h-9 gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payment QR</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/check-in">
            <Button size="sm" className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserPlus className="w-4 h-4" />
              <span>New Check-in</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        <Link href="/restaurant">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs border-orange-500/30 hover:bg-orange-50 dark:hover:bg-orange-950/30">
            <Utensils className="w-4 h-4 text-orange-600" />
            <span>Cabins & Dining</span>
          </Button>
        </Link>
        <Link href="/check-in">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Check In</span>
          </Button>
        </Link>
        <Link href="/guests">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs">
            <Bed className="w-4 h-4 text-purple-600" />
            <span>Current Guests</span>
          </Button>
        </Link>
        <Link href="/rooms">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs">
            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
            <span>View 7 Rooms</span>
          </Button>
        </Link>
        <Link href="/customers">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Customers</span>
          </Button>
        </Link>
        <Link href="/expenses">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>Add Expense</span>
          </Button>
        </Link>
        <Link href="/analytics">
          <Button variant="outline" className="w-full justify-start gap-2 h-11 text-xs">
            <TrendingUp className="w-4 h-4 text-rose-600" />
            <span>Analytics</span>
          </Button>
        </Link>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Room Status KPI */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Room Inventory (7 Total)
            </CardTitle>
            <Bed className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {roomOverview.available}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  / {roomOverview.total} Available
                </span>
              </div>
              <Badge variant="info">{roomOverview.occupancyRate}% Occupied</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">
                {roomOverview.available} free
              </span>
              <span>•</span>
              <span className="text-blue-600 font-medium">
                {roomOverview.occupied} occupied
              </span>
              {roomOverview.maintenance > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 font-medium">
                    {roomOverview.maintenance} maint.
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Operations KPI */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Operations
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayOperations.currentGuestsHeadcount}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                In-house Guests
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{todayOperations.checkIns} check-in today</span>
              <span>•</span>
              <span>{todayOperations.checkOuts} check-out today</span>
            </div>
          </CardContent>
        </Card>

        {/* Month Revenue KPI */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(financialOverview.monthlyRevenue)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Today: {formatCurrency(financialOverview.todayRevenue)}</span>
              <span>Week: {formatCurrency(financialOverview.weeklyRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Operational Result KPI */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Result (This Month)
            </CardTitle>
            {financialOverview.monthlyNetIncome >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                financialOverview.monthlyNetIncome >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(financialOverview.monthlyNetIncome)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Expenses: {formatCurrency(financialOverview.monthlyExpenses)}</span>
              {financialOverview.outstandingPayments > 0 && (
                <span className="text-amber-600 font-medium">
                  Due: {formatCurrency(financialOverview.outstandingPayments)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances Warning Banner (if any) */}
      {financialOverview.outstandingPayments > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                Outstanding Balance Due: {formatCurrency(financialOverview.outstandingPayments)}
              </span>
              <p className="text-xs text-muted-foreground">
                There are active stays with unsettled balances. Collect payments before checkout.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQrModal(true)}
              className="border-emerald-600/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-xs font-semibold gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scan QR to Settle</span>
            </Button>
            <Link href="/guests">
              <Button size="sm" variant="outline" className="border-amber-500/40 text-xs">
                View Guests
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Current Guests Live Table Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Current Active Guests</CardTitle>
            <CardDescription>
              Guests currently checked into rooms with live balance calculations
            </CardDescription>
          </div>
          <Link href="/guests">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent>
          {currentGuests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Bed className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div className="font-medium text-foreground">No Current Guests</div>
              <p className="text-xs max-w-sm mx-auto">
                All 7 rooms are currently vacant and ready for new guest check-ins.
              </p>
              <Link href="/check-in" className="inline-block pt-2">
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <UserPlus className="w-4 h-4" />
                  <span>Check In Guest</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-2.5">Room</th>
                    <th className="px-3 py-2.5">Guest Name</th>
                    <th className="px-3 py-2.5">People</th>
                    <th className="px-3 py-2.5">Check-In Time</th>
                    <th className="px-3 py-2.5">Expected Checkout</th>
                    <th className="px-3 py-2.5">Total Bill</th>
                    <th className="px-3 py-2.5">Paid</th>
                    <th className="px-3 py-2.5">Balance</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentGuests.map((guest: any) => (
                    <tr key={guest.stayId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 font-semibold">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-mono">
                          {guest.roomNumber}
                        </span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({guest.roomType})
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{guest.guestName}</div>
                        <div className="text-xs text-muted-foreground">{guest.contactNumber}</div>
                      </td>
                      <td className="px-3 py-3">{guest.numberOfPeople}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatNepalDateTime(guest.checkInAt)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatNepalDateTime(guest.expectedCheckoutDate)}
                      </td>
                      <td className="px-3 py-3 font-semibold">
                        {formatCurrency(guest.currentBill)}
                      </td>
                      <td className="px-3 py-3 text-emerald-600 font-medium">
                        {formatCurrency(guest.paid)}
                      </td>
                      <td className="px-3 py-3">
                        {guest.balance > 0 ? (
                          <Badge variant="warning" className="font-mono">
                            {formatCurrency(guest.balance)} Due
                          </Badge>
                        ) : (
                          <Badge variant="success" className="font-mono">
                            PAID
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/stays/${guest.stayId}/bill`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              Live Bill
                            </Button>
                          </Link>
                          <Link href={`/stays/${guest.stayId}/checkout`}>
                            <Button size="sm" className="h-7 px-2 text-xs bg-primary">
                              Checkout
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentQrModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        dueAmount={financialOverview?.outstandingPayments || 0}
      />
    </div>
  );
}
