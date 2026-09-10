"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bed, User, Receipt, FileText, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "room":
        return <Bed className="w-4 h-4 text-blue-500" />;
      case "customer":
        return <User className="w-4 h-4 text-emerald-500" />;
      case "stay":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "expense":
        return <Receipt className="w-4 h-4 text-rose-500" />;
      default:
        return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted rounded-lg border border-input transition-colors w-64 justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          <span>Search Hotel Surya...</span>
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-xl overflow-hidden shadow-2xl border-border">
          <div className="flex items-center border-b px-4 py-3 bg-muted/20">
            <Search className="w-4 h-4 mr-2.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guests, room numbers, stays, expenses..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Searching records...
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No matching results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {!query && (
              <div className="p-3">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Quick Navigation
                </div>
                <div className="space-y-1">
                  {[
                    { title: "Dashboard Overview", url: "/", icon: <Search className="w-4 h-4" /> },
                    { title: "New Guest Check-in", url: "/check-in", icon: <User className="w-4 h-4 text-emerald-500" /> },
                    { title: "Room Inventory (7 Rooms)", url: "/rooms", icon: <Bed className="w-4 h-4 text-blue-500" /> },
                    { title: "Current Guests List", url: "/guests", icon: <FileText className="w-4 h-4 text-amber-500" /> },
                    { title: "Hotel Expenses", url: "/expenses", icon: <Receipt className="w-4 h-4 text-rose-500" /> },
                  ].map((item) => (
                    <button
                      key={item.url}
                      onClick={() => handleSelect(item.url)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent text-left transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.title}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-1">
                {results.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => handleSelect(item.url)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-muted/80">
                        {getIcon(item.type)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Hotel Surya Operations Search</span>
            <span>Esc to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
