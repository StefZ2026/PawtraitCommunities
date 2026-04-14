import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, Dog, Image, CreditCard, Gift, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "default" : status === "trial" ? "outline" : "secondary";
  const label = status === "trial" ? "Free Trial" : status || "pending";
  const className = status === "active" ? "bg-green-600 hover:bg-green-700" : status === "trial" ? "border-blue-500 text-blue-600" : "";
  return <Badge variant={variant} className={className}>{label}</Badge>;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { isAdmin, isAuthenticated, isLoading: authLoading, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [totalHomes, setTotalHomes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const token = session?.access_token;

  const { data: communities, isLoading } = useQuery({
    queryKey: ["/api/admin/communities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/communities", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!token && isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/[^a-z0-9]/g, ""), totalHomes: parseInt(totalHomes), contactName: contactName || undefined, contactEmail: contactEmail || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communities"] });
      setCreateOpen(false);
      setName(""); setSlug(""); setTotalHomes(""); setContactName(""); setContactEmail("");
      toast({ title: "Community created!", description: `Code: ${data.communityCode}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  async function startFreeTrial(orgId: number) {
    try {
      const res = await fetch("/api/billing/free-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Free trial activated!", description: "14-day free trial started." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communities"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function startSubscription(orgId: number, billing: "monthly" | "annual") {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `Community code ${code} copied to clipboard.` });
  }

  function handleNameChange(value: string) {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }

  if (!authLoading && (!isAuthenticated || !isAdmin)) { setLocation("/login"); return null; }
  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="font-serif font-bold text-lg">Pawtrait Communities Admin</h1>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold">Communities</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" />Add Community</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a Community</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div><Label>Community Name</Label><Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Soleil at Lakewood Ranch" required /></div>
                <div><Label>URL Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required /><p className="text-xs text-muted-foreground mt-1">pawtraitcommunities.com/{slug || "..."}</p></div>
                <div><Label>Total Homes</Label><Input type="number" value={totalHomes} onChange={(e) => setTotalHomes(e.target.value)} placeholder="e.g. 700" required min="1" /></div>
                <div><Label>Community Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Optional" /></div>
                <div><Label>Community Contact Email</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Optional" /></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Community"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {!communities || communities.length === 0 ? (
          <Card className="text-center"><CardContent className="pt-8 pb-6"><Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">No communities yet. Create your first one!</p></CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {communities.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-lg">{c.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">Code:</p>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{c.communityCode}</code>
                        <button onClick={() => copyCode(c.communityCode)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{c.totalHomes || "?"} homes &middot; /{c.slug}</p>
                    </div>
                    <StatusBadge status={c.subscriptionStatus} />
                  </div>
                  <div className="flex gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" />{c.residentCount} residents</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Dog className="h-4 w-4" />{c.dogCount} pets</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Image className="h-4 w-4" />{c.portraitCount} portraits</div>
                  </div>
                  {c.planName && (
                    <p className="text-sm text-muted-foreground mt-1">Plan: {c.planName}</p>
                  )}
                  {(c.subscriptionStatus === "pending" || !c.subscriptionStatus) && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => startFreeTrial(c.id)}>
                        <Gift className="h-4 w-4" />Start 14-Day Free Trial
                      </Button>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => startSubscription(c.id, "monthly")}>
                          <CreditCard className="h-4 w-4" />Monthly
                        </Button>
                        <Button size="sm" className="gap-1.5 flex-1" onClick={() => startSubscription(c.id, "annual")}>
                          <CreditCard className="h-4 w-4" />Annual (Save!)
                        </Button>
                      </div>
                    </div>
                  )}
                  {c.subscriptionStatus === "trial" && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm text-blue-600">Free trial active — expires {c.subscriptionEndDate ? new Date(c.subscriptionEndDate).toLocaleDateString() : "in 14 days"}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => startSubscription(c.id, "monthly")}>
                          <CreditCard className="h-4 w-4" />Monthly
                        </Button>
                        <Button size="sm" className="gap-1.5 flex-1" onClick={() => startSubscription(c.id, "annual")}>
                          <CreditCard className="h-4 w-4" />Annual (Save!)
                        </Button>
                      </div>
                    </div>
                  )}
                  {c.subscriptionStatus === "active" && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                      <p className="text-sm text-green-600 flex-1">Active subscription{c.subscriptionEndDate ? ` — renews ${new Date(c.subscriptionEndDate).toLocaleDateString()}` : ""}</p>
                      <Button size="sm" variant="outline" className="gap-1.5" asChild>
                        <a href={`/${c.slug}`} target="_blank"><ExternalLink className="h-4 w-4" />View Gallery</a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
