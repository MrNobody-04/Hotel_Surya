"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bed,
  CheckCircle2,
  AlertCircle,
  Wrench,
  User,
  Clock,
  DollarSign,
  Edit2,
  Filter,
  UserPlus,
  ArrowUpRight,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNepalDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { RoomDTO, RoomStatus, RoomType } from "@/types";

const ROOM_IMAGES: Record<string, string> = {
  "101": "/images/rooms/room-101.jpg",
  "102": "/images/rooms/room-102.jpg",
  "103": "/images/rooms/room-103.jpg",
  "104": "/images/rooms/room-104.jpg",
  "105": "/images/rooms/room-105.jpg",
  "106": "/images/rooms/room-106.jpg",
  "107": "/images/rooms/room-107.jpg",
};

function getRoomImageUrl(roomNumber: string, type: string = "NON_AC"): string {
  if (ROOM_IMAGES[roomNumber]) return ROOM_IMAGES[roomNumber];
  return type === "AC" ? "/images/rooms/room-101.jpg" : "/images/rooms/room-105.jpg";
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Add Room Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newType, setNewType] = useState<RoomType>("NON_AC");
  const [newNotes, setNewNotes] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Edit Modal State
  const [editingRoom, setEditingRoom] = useState<RoomDTO | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editType, setEditType] = useState<RoomType>("NON_AC");
  const [editStatus, setEditStatus] = useState<RoomStatus>("AVAILABLE");
  const [editNotes, setEditNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete Room Modal State
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<RoomDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleOpenEdit = (room: RoomDTO) => {
    setEditingRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditType(room.type);
    setEditStatus(room.status);
    setEditNotes(room.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingRoom) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: editRoomNumber,
          type: editType,
          status: editStatus,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update room");
      }

      toast.success(`Room ${editRoomNumber} updated successfully`);
      setEditingRoom(null);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) {
      toast.error("Please enter a room number");
      return;
    }

    setCreatingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: newRoomNumber.trim(),
          type: newType,
          notes: newNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add room");
      }

      toast.success(`Room ${newRoomNumber.trim()} added successfully`);
      setAddModalOpen(false);
      setNewRoomNumber("");
      setNewType("NON_AC");
      setNewNotes("");
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoom) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${deletingRoom.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete room");
      }

      toast.success(`Room ${deletingRoom.roomNumber} deleted successfully`);
      setConfirmDeleteOpen(false);
      setEditingRoom(null);
      setDeletingRoom(null);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterType !== "ALL" && r.type !== filterType) return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge variant="success">AVAILABLE</Badge>;
      case "OCCUPIED":
        return <Badge variant="info">OCCUPIED</Badge>;
      case "RESERVED":
        return <Badge variant="warning">RESERVED</Badge>;
      case "MAINTENANCE":
        return <Badge variant="destructive">MAINTENANCE</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Room Management
          </h1>
          <p className="text-sm text-muted-foreground">
            NEW HOTEL SURYA Inventory • {rooms.length} Rooms ({rooms.filter((r) => r.type === "AC").length} AC, {rooms.filter((r) => r.type === "NON_AC").length} Non-AC)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(!currentUser || currentUser.role === "OWNER" || currentUser.role === "MANAGER") && (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Room</span>
            </Button>
          )}

          <Link href="/check-in">
            <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <UserPlus className="w-4 h-4" />
              <span>Check In Guest</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 border rounded-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Type:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="AC">AC</SelectItem>
              <SelectItem value="NON_AC">Non-AC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="OCCUPIED">Occupied</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto text-xs text-muted-foreground">
          Showing {filteredRooms.length} of {rooms.length} rooms
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const isOccupied = room.status === "OCCUPIED" && room.currentStay;

            return (
              <Card
                key={room.id}
                className={cn(
                  "card-3d group overflow-hidden flex flex-col border-2 transition-all duration-300 select-none",
                  room.status === "OCCUPIED"
                    ? "border-blue-500/40 bg-blue-50/10 dark:bg-blue-950/10 shadow-xs"
                    : room.status === "MAINTENANCE"
                    ? "border-destructive/40 bg-destructive/5 shadow-xs"
                    : "border-border/80 hover:border-emerald-500/50 shadow-xs"
                )}
              >
                {/* Room Photo Banner */}
                <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-muted">
                  <img
                    src={getRoomImageUrl(room.roomNumber, room.type)}
                    alt={`Room ${room.roomNumber}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35 pointer-events-none" />

                  {/* Top Badges & Edit Button */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <Badge variant={room.type === "AC" ? "purple" : "secondary"} className="shadow-xs font-semibold backdrop-blur-xs">
                      {room.type === "AC" ? "AC Room" : "Non-AC"}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(room.status)}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background/80 hover:bg-background shadow-xs backdrop-blur-xs text-foreground hover:scale-110 active:scale-95 transition-transform"
                        onClick={() => handleOpenEdit(room)}
                        title="Edit Room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Room Title & Description */}
                  <div className="absolute bottom-2.5 left-3 right-3 z-10 text-white">
                    <div className="text-xl sm:text-2xl font-black font-mono tracking-tight drop-shadow-md transition-transform duration-200 group-hover:translate-x-0.5">
                      Room {room.roomNumber}
                    </div>
                    <p className="text-xs text-white/90 line-clamp-1 drop-shadow-sm font-medium">
                      {room.notes || `${room.type === "AC" ? "Air Conditioned" : "Standard"} Room`}
                    </p>
                  </div>
                </div>

                <CardContent className="space-y-3 pt-3 flex-1 flex flex-col justify-between">
                  {isOccupied && room.currentStay ? (
                    <div className="p-3 bg-muted/40 rounded-lg space-y-2 border text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate max-w-[150px]">
                            {room.currentStay.customer.fullName}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {room.currentStay.numberOfPeople} Person(s)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Check-In:</span>
                        <span>{formatNepalDateTime(room.currentStay.checkInAt)}</span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Exp. Checkout:</span>
                        <span>{formatNepalDateTime(room.currentStay.expectedCheckoutDate)}</span>
                      </div>

                      <div className="pt-1.5 border-t flex items-center justify-between font-semibold">
                        <span>Balance Due:</span>
                        <span
                          className={
                            room.currentStay.balance > 0
                              ? "text-amber-600 dark:text-amber-400 font-bold"
                              : "text-emerald-600"
                          }
                        >
                          {formatCurrency(room.currentStay.balance)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 flex flex-col justify-center items-center text-center p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
                      {room.status === "MAINTENANCE" ? (
                        <>
                          <Wrench className="w-6 h-6 text-destructive/70 mb-1" />
                          <span>Under Maintenance</span>
                          <span className="text-[10px]">Temporarily unavailable</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-emerald-600/70 mb-1" />
                          <span>Vacant & Clean</span>
                          <span className="text-[10px]">Ready for check-in</span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0 flex items-center justify-between gap-2 border-t p-3 bg-muted/10">
                  {isOccupied && room.currentStay ? (
                    <>
                      <Link
                        href={`/stays/${room.currentStay.id}/bill`}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                          Unified Bill
                        </Button>
                      </Link>
                      <Link
                        href={`/stays/${room.currentStay.id}/checkout`}
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full text-xs h-8 bg-primary">
                          Checkout
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`/check-in?roomId=${room.id}`}
                      className="w-full"
                    >
                      <Button
                        variant={room.status === "AVAILABLE" ? "default" : "outline"}
                        size="sm"
                        disabled={room.status !== "AVAILABLE"}
                        className="w-full text-xs h-8 gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Check In To {room.roomNumber}</span>
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Room Dialog */}
      <Dialog
        open={Boolean(editingRoom)}
        onOpenChange={(open) => !open && setEditingRoom(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room Details</DialogTitle>
            <DialogDescription>
              Modify room configuration or status. Room number must remain unique.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingRoom && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border shadow-inner">
                <img
                  src={getRoomImageUrl(editingRoom.roomNumber, editingRoom.type)}
                  alt={`Room ${editingRoom.roomNumber}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs text-white font-medium flex items-center gap-1.5">
                  <span className="font-bold">Room {editingRoom.roomNumber}</span>
                  <span className="text-white/70">• {editingRoom.type === "AC" ? "AC Deluxe" : "Non-AC Standard"}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="roomNumber">Room Number</Label>
              <Input
                id="roomNumber"
                value={editRoomNumber}
                onChange={(e) => setEditRoomNumber(e.target.value)}
                placeholder="e.g. 101"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editType">Room Type</Label>
              <Select
                value={editType}
                onValueChange={(val: any) => setEditType(val)}
              >
                <SelectTrigger id="editType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AC">AC (Air Conditioned)</SelectItem>
                  <SelectItem value="NON_AC">Non-AC (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(val: any) => setEditStatus(val)}
                disabled={editingRoom?.status === "OCCUPIED"}
              >
                <SelectTrigger id="editStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                </SelectContent>
              </Select>
              {editingRoom?.status === "OCCUPIED" && (
                <p className="text-[11px] text-muted-foreground">
                  Status cannot be changed while a guest is occupying this room.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editNotes">Notes / Description</Label>
              <Input
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Balcony view, twin beds"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full">
            {currentUser?.role === "OWNER" && editingRoom?.status !== "OCCUPIED" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeletingRoom(editingRoom);
                  setConfirmDeleteOpen(true);
                }}
                className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-9 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Room</span>
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRoom(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Room Dialog (Owner & Manager) */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-primary" />
                <span>Add New Room</span>
              </DialogTitle>
              <DialogDescription>
                Register a new room in NEW HOTEL SURYA inventory. Room number must remain unique.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="newRoomNumber">Room Number *</Label>
                <Input
                  id="newRoomNumber"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="e.g. 108 or 201"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newType">Room Type</Label>
                <Select
                  value={newType}
                  onValueChange={(val: any) => setNewType(val)}
                >
                  <SelectTrigger id="newType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NON_AC">Non-AC (Standard)</SelectItem>
                    <SelectItem value="AC">AC (Air Conditioned Deluxe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newNotes">Notes / Amenities (Optional)</Label>
                <Input
                  id="newNotes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. 2nd floor, balcony view, double bed"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                disabled={creatingRoom}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingRoom} className="bg-primary">
                {creatingRoom ? "Adding Room..." : "Add Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Room Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              <span>Delete Room {deletingRoom?.roomNumber}</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete Room {deletingRoom?.roomNumber} from inventory?
              Rooms with existing stay history cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRoom}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
