"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { AuditLogDTO } from "@/types";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url =
        actionFilter !== "ALL"
          ? `/api/audit-logs?action=${actionFilter}&take=100`
          : `/api/audit-logs?take=100`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else if (res.status === 403) {
        toast.error("Access denied: Insufficient privileges to view system audit logs.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes("CHECKIN")) return <Badge variant="success">{action}</Badge>;
    if (action.includes("CHECKOUT")) return <Badge variant="purple">{action}</Badge>;
    if (action.includes("PAYMENT")) return <Badge variant="info">{action}</Badge>;
    if (action.includes("EXPENSE")) return <Badge variant="warning">{action}</Badge>;
    if (action.includes("DELETED")) return <Badge variant="destructive">{action}</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Immutable chronological audit records of all operational, staff, and financial events
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 border rounded-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Action Filter:</span>
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 w-60 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All System Actions</SelectItem>
            <SelectItem value="CHECKIN_CREATED">CHECKIN_CREATED</SelectItem>
            <SelectItem value="CHECKOUT_COMPLETED">CHECKOUT_COMPLETED</SelectItem>
            <SelectItem value="PAYMENT_CREATED">PAYMENT_CREATED</SelectItem>
            <SelectItem value="ITEM_ADDED">ITEM_ADDED</SelectItem>
            <SelectItem value="EXPENSE_CREATED">EXPENSE_CREATED</SelectItem>
            <SelectItem value="EXPENSE_DELETED">EXPENSE_DELETED</SelectItem>
            <SelectItem value="CUSTOMER_CREATED">CUSTOMER_CREATED</SelectItem>
            <SelectItem value="STAFF_CREATED">STAFF_CREATED</SelectItem>
            <SelectItem value="LOGIN">LOGIN</SelectItem>
            <SelectItem value="LOGOUT">LOGOUT</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto text-xs text-muted-foreground">
          Showing {logs.length} of {total} events
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div className="font-semibold text-foreground">No Audit Records</div>
              <p className="text-xs">No records match the selected action filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Timestamp (Nepal Time)</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Actor / Staff</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Event Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => {
                    let parsedMetadata = null;
                    if (log.metadata) {
                      try {
                        parsedMetadata =
                          typeof log.metadata === "string"
                            ? JSON.parse(log.metadata)
                            : log.metadata;
                      } catch {
                        parsedMetadata = log.metadata;
                      }
                    }

                    return (
                      <tr key={log.id} className="hover:bg-muted/20 text-xs">
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                          {formatNepalDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {log.userName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-muted-foreground">
                            {log.entity}
                            {log.entityId && ` (#${log.entityId.slice(0, 6)})`}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground max-w-md truncate">
                          {parsedMetadata ? JSON.stringify(parsedMetadata) : "-"}
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
    </div>
  );
}
