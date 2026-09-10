"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Shield,
  MapPin,
  Calendar,
  Eye,
  Camera,
  Upload,
  X,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { CustomerDTO, Gender } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [contactNumber, setContactNumber] = useState("");
  const [citizenshipNumber, setCitizenshipNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Optional Photo
  const [citizenshipFile, setCitizenshipFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // View Photo Modal
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  const fetchCustomers = async (searchQuery = "") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(query);
  }, [query]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size exceeds 5MB limit");
      return;
    }
    setCitizenshipFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !contactNumber.trim()) {
      toast.error("Full name and contact number are required");
      return;
    }

    setSubmitting(true);
    try {
      let citizenshipPhotoUrl = null;

      if (citizenshipFile) {
        const formData = new FormData();
        formData.append("file", citizenshipFile);
        formData.append("category", "citizenship");

        const uploadRes = await fetch("/api/uploads/citizenship", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          citizenshipPhotoUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          gender,
          contactNumber: contactNumber.trim(),
          citizenshipNumber: citizenshipNumber.trim() || null,
          citizenshipPhotoUrl,
          address: address.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      toast.success("Customer profile registered successfully");
      setCreateModalOpen(false);
      setFullName("");
      setContactNumber("");
      setCitizenshipNumber("");
      setAddress("");
      setNotes("");
      setCitizenshipFile(null);
      setPhotoPreview(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Customer Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Guest database, identity verification records, and stay history
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 border rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, contact phone, or citizenship number..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          {customers.length} customer record{customers.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Customers Found</h3>
          <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
            {query
              ? `No records found matching "${query}".`
              : "No customers registered yet."}
          </p>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Register First Customer
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((cust) => (
            <Card
              key={cust.id}
              className="shadow-sm border-border hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3 border-b bg-muted/10">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {cust.fullName}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {cust.gender}
                    </Badge>
                  </div>
                  {cust.staysCount !== undefined && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {cust.staysCount} Stay{cust.staysCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="py-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{cust.contactNumber}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Citizenship:{" "}
                    <strong className="text-foreground">
                      {cust.citizenshipNumber || "Not recorded"}
                    </strong>
                  </span>
                </div>

                {cust.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{cust.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Registered: {formatNepalDateTime(cust.createdAt)}</span>
                </div>

                {/* Citizenship Photo status */}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-muted-foreground">ID Photo:</span>
                  {cust.citizenshipPhotoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewPhotoUrl(cust.citizenshipPhotoUrl || null)}
                      className="h-6 text-[11px] text-emerald-600 gap-1 px-2"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Private Photo</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      None (Optional)
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-3 px-4 border-t bg-muted/10">
                <Link
                  href={`/check-in`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs h-8">
                    Check In Guest
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle>Register New Customer</DialogTitle>
              <DialogDescription>
                Add guest profile to Hotel Surya database. Citizenship photo is optional.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="custName">Full Name *</Label>
                <Input
                  id="custName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Shyam Sundar"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="custGender">Gender *</Label>
                  <Select
                    value={gender}
                    onValueChange={(val: any) => setGender(val)}
                  >
                    <SelectTrigger id="custGender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custPhone">Phone Number *</Label>
                  <Input
                    id="custPhone"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="9841000000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custCitizenship">Citizenship / Passport No. (Optional)</Label>
                <Input
                  id="custCitizenship"
                  value={citizenshipNumber}
                  onChange={(e) => setCitizenshipNumber(e.target.value)}
                  placeholder="e.g. 27-01-75-04321"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custAddress">Address</Label>
                <Input
                  id="custAddress"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, District"
                />
              </div>

              {/* Optional Citizenship Photo */}
              <div className="space-y-2 p-3 bg-muted/40 border border-dashed rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Citizenship Photo (Optional)
                  </Label>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCitizenshipFile(null);
                        setPhotoPreview(null);
                      }}
                      className="h-6 text-xs text-destructive hover:text-destructive"
                    >
                      <X className="w-3 h-3 mr-1" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>

                {photoPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-20 w-32 object-cover rounded border"
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="create-cust-file"
                    />
                    <label htmlFor="create-cust-file">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer text-xs gap-1 h-7"
                        asChild
                      >
                        <span>
                          <Upload className="w-3 h-3" />
                          <span>Upload Photo</span>
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Private Photo Viewer Modal */}
      <Dialog
        open={Boolean(viewPhotoUrl)}
        onOpenChange={(open) => !open && setViewPhotoUrl(null)}
      >
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Private Identity Document</span>
            </DialogTitle>
            <DialogDescription>
              Stored privately in secure storage. Authorized staff access only.
            </DialogDescription>
          </DialogHeader>

          {viewPhotoUrl && (
            <div className="py-2 flex justify-center bg-black/5 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewPhotoUrl}
                alt="Citizenship Document"
                className="max-h-96 object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
