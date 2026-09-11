"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Calendar,
  Bed,
  Utensils,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("month");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let url = "/api/analytics?mode=detailed";

      const now = new Date();
      if (dateRange === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        url += `&startDate=${start}`;
      } else if (dateRange === "week") {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        url += `&startDate=${start}`;
      } else if (dateRange === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        url += `&startDate=${start}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading && !data) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const {
    revenueByCategory = {},
    totalCollectedRevenue = 0,
    totalExpenses = 0,
    netOperationalResult = 0,
    roomUsageCount = {},
    topSellingItems = [],
  } = data || {};

  // Chart Data: Revenue vs Expense
  const comparisonData = [
    {
      name: "Financial Overview",
      Revenue: totalCollectedRevenue,
      Expenses: totalExpenses,
      Net: netOperationalResult,
    },
  ];

  // Pie Data: Revenue by Category
  const categoryPieData = Object.entries(revenueByCategory)
    .filter(([_, val]: any) => Number(val) > 0)
    .map(([cat, val]) => ({
      name: cat,
      value: Number(val),
    }));

  // Room Utilization Bar Data
  const roomBarData = Object.entries(roomUsageCount).map(([room, count]) => ({
    room: `Room ${room}`,
    stays: count,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial & Operational Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Performance metrics, revenue sources, and room utilization for NEW HOTEL SURYA
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center bg-muted p-1 rounded-lg text-xs">
          {(["today", "week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                dateRange === range
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range === "all" ? "All Time" : range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Total Revenue Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totalCollectedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From guest stays & payments</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Total Expenses Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Salaries, groceries, utilities</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Net Operational Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black font-mono ${
                netOperationalResult >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(netOperationalResult)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue minus Expenses</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Total Stays in Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono">
              {data?.staysCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Guest stays recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown by Category (Pie Chart) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              <span>Revenue by Service Category</span>
            </CardTitle>
            <CardDescription>
              Distribution between Room charges, Food, Drinks, and Services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryPieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                No revenue category data available for this range
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) =>
                        `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {categoryPieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Result (Bar Chart) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Revenue vs Expenses Comparison</span>
            </CardTitle>
            <CardDescription>
              Operational balance sheet comparison in NPR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `रू ${v / 1000}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Utilization & Top Selling Food/Drinks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bed className="w-4 h-4 text-blue-600" />
              <span>Room Utilization (7 Rooms)</span>
            </CardTitle>
            <CardDescription>
              Number of bookings / stays hosted per room
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roomBarData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No room stay data in selected range
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roomBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="room" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="stays" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top F&B Items */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-600" />
              <span>Top-Selling Food & Beverages</span>
            </CardTitle>
            <CardDescription>
              Most frequently ordered items by guests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topSellingItems.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No F&B items ordered yet
              </div>
            ) : (
              <div className="space-y-3">
                {topSellingItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-muted-foreground font-mono w-4">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{item.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-foreground">
                        {item.count} ordered
                      </span>
                      <span className="text-muted-foreground block text-[10px]">
                        {formatCurrency(item.revenue)} revenue
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
