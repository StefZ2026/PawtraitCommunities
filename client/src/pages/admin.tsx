import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Plus, Users, Dog, Image, CreditCard, Gift, Copy, ExternalLink,
  Home, LogOut, Pencil, Trash2, TrendingUp, AlertTriangle,
  Wallet, MessageSquare
} from "lucide-react";
import { CatFilled } from "@/components/cat-filled";
import { CreateCommunityWizard } from "@/components/create-community-wizard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active": return <span className="text-green-600 font-medium">active</span>;
    case "trial": return <span className="text-blue-600 font-medium">trial</span>;
    case "canceled": return <span className="text-red-600 font-medium">canceled</span>;
    case "past_due": return <span className="text-amber-600 font-medium">past due</span>;
    default: return <span className="text-muted-foreground">pending</span>;
  }
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { isAdmin, isAuthenticated, isLoading: authLoading, session, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = session?.access_token;

  const [showCreateForm, setShowCreateForm] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editCommunity, setEditCommunity] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editTotalHomes, setEditTotalHomes] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["/api/admin/communities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/communities", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!token && isAdmin,
  });

  // Stats derived from communities data
  const totalCommunities = communities.length;
  const activeSubs = communities.filter((c: any) => c.subscriptionStatus === "active").length;

  const pastDueCount = communities.filter((c: any) => c.subscriptionStatus === "past_due").length;
  const totalResidents = communities.reduce((sum: number, c: any) => sum + (c.residentCount || 0), 0);
  const totalPets = communities.reduce((sum: number, c: any) => sum + (c.dogCount || 0), 0);
  const totalPortraits = communities.reduce((sum: number, c: any) => sum + (c.portraitCount || 0), 0);

  const planDist = {
    trial: communities.filter((c: any) => c.subscriptionStatus === "trial" || !c.subscriptionStatus || c.subscriptionStatus === "pending").length,
    standard: communities.filter((c: any) => c.planName === "Standard").length,
    growth: communities.filter((c: any) => c.planName === "Growth").length,
    signature: communities.filter((c: any) => c.planName === "Signature").length,
  };


  function openEdit(c: any) {
    setEditCommunity(c);
    setEditName(c.name);
    setEditTotalHomes(String(c.totalHomes || ""));
    setEditContactName(c.contactName || "");
    setEditContactEmail(c.contactEmail || "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editCommunity) return;
    try {
      const res = await fetch(`/api/admin/communities/${editCommunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, totalHomes: parseInt(editTotalHomes), contactName: editContactName || null, contactEmail: editContactEmail || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast({ title: "Updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communities"] });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function deleteCommunity(id: number, communityName: string) {
    try {
      const res = await fetch(`/api/admin/communities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast({ title: "Deleted", description: `${communityName} has been removed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communities"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

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

  async function startConnectOnboarding(orgId: number) {
    try {
      const res = await fetch("/api/billing/connect-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function sendNotification(orgId: number, type: "portrait" | "broadcast", message?: string) {
    try {
      const endpoint = type === "portrait" ? "/api/sms/notify-portrait" : "/api/sms/notify-community";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, message: message || "Check out the new portraits in your community gallery!" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Notification sent!", description: `${data.sent || 0} messages sent.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `Code ${code} copied to clipboard.` });
  }

  if (!authLoading && (!isAuthenticated || !isAdmin)) { setLocation("/login"); return null; }
  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards — Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-100"><Building2 className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalCommunities}</p>
                  <p className="text-sm text-muted-foreground">Communities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-green-100"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{activeSubs}</p>
                  <p className="text-sm text-muted-foreground">Active Subs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalResidents}</p>
                  <p className="text-sm text-muted-foreground">Residents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-yellow-100"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{pastDueCount}</p>
                  <p className="text-sm text-muted-foreground">Past Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards — Row 2 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-100"><Dog className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalPets}</p>
                  <p className="text-sm text-muted-foreground">Pets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-pink-100"><Image className="h-5 w-5 text-pink-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalPortraits}</p>
                  <p className="text-sm text-muted-foreground">Portraits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-100"><Home className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{communities.reduce((s: number, c: any) => s + (c.totalHomes || 0), 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Homes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card className="mb-6 bg-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0">trial/pending</Badge>
                <span className="font-medium">{planDist.trial}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">standard</Badge>
                <span className="font-medium">{planDist.standard}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-0">growth</Badge>
                <span className="font-medium">{planDist.growth}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0">signature</Badge>
                <span className="font-medium">{planDist.signature}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Community — same wizard as /get-started */}
        {showCreateForm && token && (
          <CreateCommunityWizard
            token={token}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["/api/admin/communities"] }); setShowCreateForm(false); }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Communities Table */}
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">All Communities</CardTitle>
              <p className="text-sm text-muted-foreground">{totalCommunities} registered communit{totalCommunities !== 1 ? "ies" : "y"}</p>
            </div>
            {!showCreateForm && (
              <Button size="sm" className="gap-1" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4" />Add Community
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {communities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No communities yet</p>
                <Button className="mt-4 gap-1" onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4" />Add Your First Community
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Community</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-center">Homes</th>
                      <th className="pb-3 font-medium text-center"><Users className="h-4 w-4 inline-block" /></th>
                      <th className="pb-3 font-medium text-center"><Dog className="h-4 w-4 inline-block" /></th>
                      <th className="pb-3 font-medium text-center"><Image className="h-4 w-4 inline-block" /></th>
                      <th className="pb-3 font-medium">Code</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {communities.map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-4">
                          <Link href={`/community/${c.id}`} className="hover:underline">
                            <p className="font-medium text-primary">{c.name}</p>
                          </Link>
                          <p className="text-sm text-muted-foreground">{c.contactEmail || "—"}</p>
                        </td>
                        <td className="py-4">
                          <span className={`text-sm ${
                            c.planName === "Signature" ? "text-amber-600 font-medium" :
                            c.planName === "Growth" ? "text-purple-600 font-medium" :
                            c.planName === "Standard" ? "text-green-600 font-medium" :
                            "text-muted-foreground"
                          }`}>{c.planName || "—"}</span>
                        </td>
                        <td className="py-4"><StatusBadge status={c.subscriptionStatus || "pending"} /></td>
                        <td className="py-4 text-center">{c.totalHomes || "—"}</td>
                        <td className="py-4 text-center">{c.residentCount}</td>
                        <td className="py-4 text-center">{c.dogCount}</td>
                        <td className="py-4 text-center">{c.portraitCount}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{c.communityCode}</code>
                            <button onClick={() => copyCode(c.communityCode)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
                          </div>
                        </td>
                        <td className="py-4 text-muted-foreground text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            {(c.subscriptionStatus === "pending" || !c.subscriptionStatus) && (
                              <>
                                <Button variant="ghost" size="icon" title="Start Free Trial" onClick={() => startFreeTrial(c.id)}>
                                  <Gift className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Subscribe Monthly" onClick={() => startSubscription(c.id, "monthly")}>
                                  <CreditCard className="h-4 w-4 text-green-500" />
                                </Button>
                              </>
                            )}
                            {c.subscriptionStatus === "trial" && (
                              <Button variant="ghost" size="icon" title="Upgrade to Paid" onClick={() => startSubscription(c.id, "annual")}>
                                <CreditCard className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" title={c.stripeConnectOnboardingComplete ? "Payouts Connected" : "Set Up Payouts"} onClick={() => startConnectOnboarding(c.id)} disabled={!!c.stripeConnectOnboardingComplete}>
                              <Wallet className={`h-4 w-4 ${c.stripeConnectOnboardingComplete ? "text-green-500" : "text-amber-500"}`} />
                            </Button>
                            <Button variant="ghost" size="icon" title="Send Community Notification" onClick={() => sendNotification(c.id, "broadcast")}>
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" title="View Gallery" asChild>
                              <a href={`/${c.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                              onClick={() => { if (window.confirm(`Delete "${c.name}"? This removes all residents, pets, and portraits. Cannot be undone.`)) deleteCommunity(c.id, c.name); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Community Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editCommunity?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-4">
            <div><Label>Community Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
            <div><Label>Total Homes</Label><Input type="number" value={editTotalHomes} onChange={(e) => setEditTotalHomes(e.target.value)} required min="1" /></div>
            <div><Label>Community Contact Name</Label><Input value={editContactName} onChange={(e) => setEditContactName(e.target.value)} placeholder="Optional" /></div>
            <div><Label>Community Contact Email</Label><Input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} placeholder="Optional" /></div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
