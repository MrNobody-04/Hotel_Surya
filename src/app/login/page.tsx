"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel, Lock, Mail, ArrowRight, ShieldCheck, Key, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      toast.success(`Welcome back, ${data.user.name}!`);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Hotel className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            HOTEL SURYA
          </h1>
          <p className="text-sm text-muted-foreground">
            Hotel Operations & Management Platform
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-xl border-border/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Staff Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access hotel operations
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address / User ID</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="gcsujan321@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In to Operations"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Internal authorized access only • IP logged & rate-limited</span>
        </div>
      </div>
    </div>
  );
}
