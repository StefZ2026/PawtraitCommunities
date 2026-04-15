import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dog, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Step = "code" | "details" | "done";

export default function JoinCommunity() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("code");
  const [loading, setLoading] = useState(false);
  const [communityCode, setCommunityCode] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [homeNumber, setHomeNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [communitySlug, setCommunitySlug] = useState("");

  const token = session?.access_token;

  // Pre-fill code from URL param (e.g., /join?code=SOLEIL-26)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setCommunityCode(code.toUpperCase());
    }
  }, []);

  if (!authLoading && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  async function validateCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/communities/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: communityCode.trim() }),
      });
      const data = await res.json();
      if (!data.valid) {
        toast({ title: "Invalid code", description: data.error || "Please check your community code.", variant: "destructive" });
        return;
      }
      setCommunityName(data.communityName);
      setCommunityId(data.communityId);
      setStep("details");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/communities/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ communityCode: communityCode.trim(), homeNumber: homeNumber.trim(), displayName: displayName.trim() || null, phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setCommunitySlug(data.communitySlug);
      setStep("done");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Dog className="h-10 w-10 mx-auto mb-2 text-primary" />
          <h1 className="text-2xl font-serif font-bold">Join Your Community</h1>
          {step === "code" && <p className="text-sm text-muted-foreground">Enter the code your community provided</p>}
          {step === "details" && <p className="text-sm text-muted-foreground">Welcome to {communityName}!</p>}
        </CardHeader>
        <CardContent>
          {step === "code" && (
            <form onSubmit={validateCode} className="space-y-4">
              <div>
                <Label htmlFor="community-code">Community Code</Label>
                <Input id="community-code" value={communityCode} onChange={(e) => setCommunityCode(e.target.value.toUpperCase())} placeholder="e.g. SOLEIL-26" required className="text-center text-lg tracking-wider" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Validating..." : "Continue"}</Button>
            </form>
          )}
          {step === "details" && (
            <form onSubmit={register} className="space-y-4">
              <div>
                <Label htmlFor="home-number">Home / Unit Number</Label>
                <Input id="home-number" value={homeNumber} onChange={(e) => setHomeNumber(e.target.value)} placeholder="e.g. 147" required />
              </div>
              <div>
                <Label htmlFor="display-name">Display Name (optional)</Label>
                <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder='e.g. "The Hendersons"' />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For notifications" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Joining..." : "Join Community"}</Button>
            </form>
          )}
          {step === "done" && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-lg font-semibold">You're in!</h2>
              <p className="text-muted-foreground">Welcome to {communityName}. Add your pets and start generating portraits.</p>
              <Button className="w-full" onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
