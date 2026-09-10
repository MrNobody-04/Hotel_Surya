"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserPlus,
  Users,
  Bed,
  Calendar,
  DollarSign,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  ArrowRight,
  Shield,
  CreditCard,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { CustomerDTO, Gender, PaymentMethod, RoomDTO } from "@/types";

export default function CheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoomId = searchParams.get("roomId");

  // Available Rooms
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Mode: "NEW_CUSTOMER" vs "EXISTING_CUSTOMER"
  const [customerMode, setCustomerMode] = useState<"NEW" | "EXISTING">("NEW");

  // Customer search (for existing mode)
  const [customerSearch, setCustomerSearch] = useState("");
  const [foundCustomers, setFoundCustomers] = useState<CustomerDTO[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDTO | null>(null);

  // New Customer Fields
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [contactNumber, setContactNumber] = useState("");
  const [citizenshipNumber, setCitizenshipNumber] = useState("");
  const [address, setAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Citizenship Photo (OPTIONAL)
  const [citizenshipFile, setCitizenshipFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stay Details Fields
  const [selectedRoomId, setSelectedRoomId] = useState<string>(preselectedRoomId || "");
  const [numberOfPeople, setNumberOfPeople] = useState<string>("1");
  const [roomPrice, setRoomPrice] = useState<string>("3500");
  const [expectedCheckoutDate, setExpectedCheckoutDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16); // format YYYY-MM-DDTHH:mm
  });
  const [stayNotes, setStayNotes] = useState("");

  // Accompanying Guests
  const [accompanyingGuests, setAccompanyingGuests] = useState<
    Array<{ fullName: string; gender: Gender }>
  >([]);

  // Prepayment at Check-in (Optional)
  const [hasPrepayment, setHasPrepayment] = useState(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [prepaymentMethod, setPrepaymentMethod] = useState<PaymentMethod>("CASH");
  const [prepaymentNotes, setPrepaymentNotes] = useState("Prepayment at check-in");

  const [submitting, setSubmitting] = useState(false);

  // Fetch available rooms
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      try {
        setLoadingRooms(true);
        const res = await fetch("/api/rooms?status=AVAILABLE");
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms || []);
          if (preselectedRoomId) {
            setSelectedRoomId(preselectedRoomId);
          } else if (data.rooms?.length > 0 && !selectedRoomId) {
            setSelectedRoomId(data.rooms[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchAvailableRooms();
  }, [preselectedRoomId]);

  // Search existing customers
  useEffect(() => {
    if (customerMode !== "EXISTING" || !customerSearch.trim()) {
      setFoundCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(customerSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setFoundCustomers(data.customers || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch, customerMode]);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size exceeds 5MB limit");
      return;
    }

    setCitizenshipFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleRemovePhoto = () => {
    setCitizenshipFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Add accompanying guest row
  const addAccompanyingGuest = () => {
    setAccompanyingGuests([...accompanyingGuests, { fullName: "", gender: "OTHER" }]);
  };

  const removeAccompanyingGuest = (index: number) => {
    setAccompanyingGuests(accompanyingGuests.filter((_, i) => i !== index));
  };

  const updateAccompanyingGuest = (
    index: number,
    field: "fullName" | "gender",
    val: string
  ) => {
    const next = [...accompanyingGuests];
    next[index] = { ...next[index], [field]: val };
    setAccompanyingGuests(next);
  };

  // Submit Check-In
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId) {
      toast.error("Please select an available room");
      return;
    }

    if (customerMode === "EXISTING" && !selectedCustomer) {
      toast.error("Please select an existing customer from the search");
      return;
    }

    if (customerMode === "NEW") {
      if (!fullName.trim()) {
        toast.error("Guest full name is required");
        return;
      }
      if (!contactNumber.trim()) {
        toast.error("Contact number is required");
        return;
      }
    }

    const priceNum = Number(roomPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid negotiated room price");
      return;
    }

    setSubmitting(true);

    try {
      let citizenshipPhotoUrl = null;

      // Upload optional photo if provided
      if (customerMode === "NEW" && citizenshipFile) {
        setUploadingPhoto(true);
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
        setUploadingPhoto(false);
      }

      // Payload
      const payload: any = {
        roomId: selectedRoomId,
        numberOfPeople: Math.max(1, parseInt(numberOfPeople) || 1),
        expectedCheckoutDate: new Date(expectedCheckoutDate).toISOString(),
        roomPrice: priceNum,
        notes: stayNotes || null,
        accompanyingGuests: accompanyingGuests.filter((g) => g.fullName.trim()),
      };

      if (customerMode === "EXISTING" && selectedCustomer) {
        payload.customerId = selectedCustomer.id;
      } else {
        payload.newCustomer = {
          fullName: fullName.trim(),
          gender,
          contactNumber: contactNumber.trim(),
          citizenshipNumber: citizenshipNumber.trim() || null,
          citizenshipPhotoUrl,
          address: address.trim() || null,
          notes: customerNotes.trim() || null,
        };
      }

      // Prepayment
      if (hasPrepayment && Number(prepaymentAmount) > 0) {
        payload.prepayment = {
          amount: Number(prepaymentAmount),
          method: prepaymentMethod,
          notes: prepaymentNotes,
        };
      }

      const res = await fetch("/api/stays/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Check-in failed");
      }

      toast.success("Guest checked in successfully!");
      router.push(`/stays/${data.stay.id}/bill`);
    } catch (err: any) {
      console.error("Check-in submission failed:", err);
      toast.error(err.message || "Failed to complete check-in");
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          New Guest Check-In
        </h1>
        <p className="text-sm text-muted-foreground">
          Register guest details, assign room, and establish negotiated room rate
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer Details */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <CardTitle className="text-base">Customer / Guest Information</CardTitle>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-muted p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("NEW");
                    setSelectedCustomer(null);
                  }}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    customerMode === "NEW"
                      ? "bg-background font-semibold shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  New Guest
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("EXISTING")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    customerMode === "EXISTING"
                      ? "bg-background font-semibold shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Existing Customer
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {customerMode === "EXISTING" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name, phone number, or citizenship..."
                    className="pl-9"
                  />
                </div>

                {searchingCustomer && (
                  <p className="text-xs text-muted-foreground">Searching customer database...</p>
                )}

                {foundCustomers.length > 0 && !selectedCustomer && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {foundCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => setSelectedCustomer(cust)}
                        className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between text-sm"
                      >
                        <div>
                          <div className="font-semibold">{cust.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            Phone: {cust.contactNumber} • Citizenship: {cust.citizenshipNumber || "N/A"}
                          </div>
                        </div>
                        <Button type="button" size="sm" variant="outline" className="text-xs h-7">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-950 dark:text-emerald-300">
                        Selected: {selectedCustomer.fullName} ({selectedCustomer.gender})
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Phone: {selectedCustomer.contactNumber} • Address: {selectedCustomer.address || "N/A"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs"
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ram Bahadur Thapa"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={gender} onValueChange={(val: any) => setGender(val)}>
                    <SelectTrigger id="gender">
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
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. 9841234567"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="citizenshipNumber">Citizenship / Passport No. (Optional)</Label>
                  <Input
                    id="citizenshipNumber"
                    value={citizenshipNumber}
                    onChange={(e) => setCitizenshipNumber(e.target.value)}
                    placeholder="e.g. 27-01-75-04321"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address">Address / City</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Pokhara-8, Kaski, Nepal"
                  />
                </div>

                {/* Citizenship Photo - OPTIONAL */}
                <div className="space-y-2 md:col-span-2 p-3.5 bg-muted/20 border border-dashed rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>Citizenship Photo (Optional)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Not mandatory. Upload or capture with mobile camera if guest provides ID.
                      </p>
                    </div>
                    {photoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="text-xs text-destructive hover:text-destructive h-7"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        <span>Remove</span>
                      </Button>
                    )}
                  </div>

                  {photoPreview ? (
                    <div className="mt-2 flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="ID Preview"
                        className="h-24 w-36 object-cover rounded-md border shadow-sm"
                      />
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{citizenshipFile?.name}</div>
                        <div>
                          Size: {citizenshipFile ? Math.round(citizenshipFile.size / 1024) : 0} KB
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ✓ Ready for private secure storage
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="citizenship-upload"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="citizenship-camera"
                      />
                      <label htmlFor="citizenship-upload">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer text-xs gap-1.5 h-8"
                          asChild
                        >
                          <span>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload File</span>
                          </span>
                        </Button>
                      </label>
                      <label htmlFor="citizenship-camera">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer text-xs gap-1.5 h-8"
                          asChild
                        >
                          <span>
                            <Camera className="w-3.5 h-3.5" />
                            <span>Capture Photo</span>
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Stay Configuration */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <CardTitle className="text-base">Stay Details & Room Assignment</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="roomSelect">Available Room (7 Total) *</Label>
                {loadingRooms ? (
                  <div className="h-9 bg-muted animate-pulse rounded" />
                ) : rooms.length === 0 ? (
                  <div className="p-2.5 text-xs text-destructive bg-destructive/10 border rounded-md">
                    No rooms currently available. All rooms are occupied or in maintenance.
                  </div>
                ) : (
                  <Select
                    value={selectedRoomId}
                    onValueChange={setSelectedRoomId}
                  >
                    <SelectTrigger id="roomSelect">
                      <SelectValue placeholder="Select available room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Room {r.roomNumber} ({r.type === "AC" ? "AC Room" : "Non-AC"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedRoom && (
                  <p className="text-[11px] text-muted-foreground">
                    Selected: Room {selectedRoom.roomNumber} • {selectedRoom.type} • {selectedRoom.notes || "Clean"}
                  </p>
                )}
              </div>

              {/* Number of People */}
              <div className="space-y-1.5">
                <Label htmlFor="peopleCount">How many people are staying? *</Label>
                <Input
                  id="peopleCount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(e.target.value)}
                  onBlur={() => {
                    if (!numberOfPeople || parseInt(numberOfPeople) < 1) {
                      setNumberOfPeople("1");
                    }
                  }}
                  placeholder="1"
                  required
                />
              </div>

              {/* Negotiated Room Price */}
              <div className="space-y-1.5">
                <Label htmlFor="roomPrice">Negotiated Room Price (NPR) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">
                    NPR
                  </span>
                  <Input
                    id="roomPrice"
                    type="number"
                    inputMode="numeric"
                    step="50"
                    min="0"
                    className="pl-12 font-mono font-bold"
                    value={roomPrice}
                    onChange={(e) => setRoomPrice(e.target.value)}
                    placeholder="5000"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Manually negotiated rate for this stay. Stored permanently for this bill.
                </p>
              </div>

              {/* Expected Checkout */}
              <div className="space-y-1.5">
                <Label htmlFor="expectedCheckout">Expected Checkout Date & Time *</Label>
                <Input
                  id="expectedCheckout"
                  type="datetime-local"
                  value={expectedCheckoutDate}
                  onChange={(e) => setExpectedCheckoutDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Accompanying Guests (Optional) */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Accompanying Guests (Optional)</div>
                  <p className="text-xs text-muted-foreground">
                    Additional guests staying in the same room
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAccompanyingGuest}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Person</span>
                </Button>
              </div>

              {accompanyingGuests.length > 0 && (
                <div className="space-y-2 pt-1">
                  {accompanyingGuests.map((guest, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Accompanying Guest Full Name"
                        value={guest.fullName}
                        onChange={(e) =>
                          updateAccompanyingGuest(idx, "fullName", e.target.value)
                        }
                        className="flex-1 text-sm h-8"
                      />
                      <Select
                        value={guest.gender}
                        onValueChange={(val: any) =>
                          updateAccompanyingGuest(idx, "gender", val)
                        }
                      >
                        <SelectTrigger className="w-32 text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAccompanyingGuest(idx)}
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Prepayment at Check-in */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasPrepayment"
                  checked={hasPrepayment}
                  onChange={(e) => {
                    setHasPrepayment(e.target.checked);
                    if (e.target.checked && !prepaymentAmount) {
                      setPrepaymentAmount(roomPrice);
                    }
                  }}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <Label htmlFor="hasPrepayment" className="cursor-pointer font-semibold">
                  Record Advance / Prepayment at Check-in
                </Label>
              </div>

              {hasPrepayment && (
                <div className="p-3 bg-muted/40 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="prepaymentAmount" className="text-xs">
                      Prepayment Amount (NPR)
                    </Label>
                    <Input
                      id="prepaymentAmount"
                      type="number"
                      inputMode="numeric"
                      value={prepaymentAmount}
                      onChange={(e) => setPrepaymentAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="h-8 text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="prepaymentMethod" className="text-xs">
                      Payment Method
                    </Label>
                    <Select
                      value={prepaymentMethod}
                      onValueChange={(val: any) => setPrepaymentMethod(val)}
                    >
                      <SelectTrigger id="prepaymentMethod" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="QR_PAYMENT">Fonepay / QR Payment</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CARD">Debit/Credit Card</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">
              Check-in timestamp will be automatically generated by server (Asia/Kathmandu).
            </div>

            <Button
              type="submit"
              disabled={submitting || rooms.length === 0}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {submitting ? "Processing Check-In..." : "Confirm & Check In Guest"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
