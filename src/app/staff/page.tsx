"use client";

import React, { useEffect, useState } from "react";
import {
  UserCog,
  UserPlus,
  ShieldCheck,
  Key,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Role } from "@/types";

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Staff Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [submitting, setSubmitting] = useState(false);

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("RECEPTIONIST");
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      } else if (res.status === 403) {
        toast.error("Access denied: Only Hotel Owner can view and manage staff accounts.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff");

      toast.success(`Staff user ${name} created successfully`);
      setCreateOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: any) => {
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff status");

      toast.success(
        `Staff account ${member.name} ${!member.isActive ? "activated" : "deactivated"}`
      );
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setUpdating(true);
    try {
      const payload: any = {
        name: editName.trim(),
        role: editRole,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/staff/${editingStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff member");

      toast.success(`Updated ${editName}`);
      setEditingStaff(null);
      setEditPassword("");
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Staff & Access Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Hotel Owner control panel to create staff accounts, assign RBAC roles, and manage access
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 bg-primary text-primary-foreground"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {/* Staff Table Card */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading staff directory...
            </div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No staff records accessible. Ensure you are signed in with the Hotel Owner account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Staff Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            member.role === "OWNER"
                              ? "purple"
                              : member.role === "MANAGER"
                              ? "info"
                              : "success"
                          }
                          className="text-[10px] font-bold"
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {member.isActive ? (
                          <Badge variant="success" className="text-[10px]">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            DEACTIVATED
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatNepalDateTime(member.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingStaff(member);
                            setEditName(member.name);
                            setEditRole(member.role);
                          }}
                          className="h-7 text-xs"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          <span>Edit</span>
                        </Button>

                        {member.role !== "OWNER" && (
                          <Button
                            variant={member.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleActive(member)}
                            className="h-7 text-xs"
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateStaff}>
            <DialogHeader>
              <DialogTitle>Add New Hotel Staff</DialogTitle>
              <DialogDescription>
                Create a login account for manager or front desk receptionist.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="staffName">Full Name *</Label>
                <Input
                  id="staffName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Shrestha"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staffEmail">Email Address *</Label>
                <Input
                  id="staffEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@hotelsurya.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staffPassword">Password *</Label>
                <Input
                  id="staffPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staffRole">Role *</Label>
                <Select
                  value={role}
                  onValueChange={(val: any) => setRole(val)}
                >
                  <SelectTrigger id="staffRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEPTIONIST">
                      Receptionist (Front Desk, Check-In, Bills, Payments)
                    </SelectItem>
                    <SelectItem value="MANAGER">
                      Manager (Operations, Analytics, Expenses)
                    </SelectItem>
                    <SelectItem value="OWNER">
                      Owner (Full Platform Administration)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog
        open={Boolean(editingStaff)}
        onOpenChange={(open) => !open && setEditingStaff(null)}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit Staff Account</DialogTitle>
              <DialogDescription>
                Update details or reset credentials for {editingStaff?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="editStaffName">Full Name</Label>
                <Input
                  id="editStaffName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editStaffRole">Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(val: any) => setEditRole(val)}
                >
                  <SelectTrigger id="editStaffRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="editStaffPassword">
                  Reset Password (Leave blank to keep unchanged)
                </Label>
                <Input
                  id="editStaffPassword"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (optional)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingStaff(null)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
