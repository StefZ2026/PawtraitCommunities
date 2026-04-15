import { useState } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy, Users, Dog, Image, ExternalLink, Mail,
  Check, Printer, MessageSquare, Plus, DollarSign, ShoppingBag, Wallet,
  ChevronRight, Home as HomeIcon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function CommunityDashboard() {
  const { orgId } = useParams<{ orgId?: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin, isLoading: authLoading, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = session?.access_token;
  const [copied, setCopied] = useState(false);
  const [addResidentOpen, setAddResidentOpen] = useState(false);
  const [newHomeNumber, setNewHomeNumber] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const { data: community, isLoading } = useQuery({
    queryKey: ["/api/my-community-admin", orgId],
    queryFn: async () => {
      const url = orgId ? `/api/my-community-admin?orgId=${orgId}` : "/api/my-community-admin";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!token,
  });

  const communityId = community?.id;

  const { data: residents = [] } = useQuery({
    queryKey: ["/api/community/residents", communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/${communityId}/residents`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!token && !!communityId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/community/orders", communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/${communityId}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!token && !!communityId,
  });

  const { data: earnings } = useQuery({
    queryKey: ["/api/community/earnings", communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/${communityId}/earnings`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : null;
    },
    enabled: !!token && !!communityId,
  });

  const addResidentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/community/${communityId}/residents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ homeNumber: newHomeNumber, displayName: newDisplayName, email: newEmail, phone: newPhone }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/residents", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-community-admin", orgId] });
      setAddResidentOpen(false);
      setNewHomeNumber(""); setNewDisplayName(""); setNewEmail(""); setNewPhone("");
      toast({ title: "Resident added!" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!community) { setLocation("/get-started"); return null; }

  const joinUrl = `https://pawtraitcommunities.com/join?code=${community.communityCode}`;
  const galleryUrl = `https://pawtraitcommunities.com/${community.slug}`;

  // Initialize editable templates on first load
  if (!templateLoaded && community) {
    setEmailTemplate(
      `Hi neighbor!\n\n${community.name} has partnered with Pawtrait Communities to bring AI pet portraits to our community!\n\nHere's how to join:\n1. Go to ${joinUrl}\n2. Create a free account\n3. Add your pet and generate a stunning portrait\n\nYour community code is: ${community.communityCode}\n\nIt's free for all residents!`
    );
    setCopyMessage(
      `🐾 ${community.name} has partnered with Pawtrait Communities!\n\nGet a free AI portrait of your pet in 50+ stunning styles.\n\nJoin here: ${joinUrl}\nYour code: ${community.communityCode}`
    );
    setTemplateLoaded(true);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  }

  async function startConnectOnboarding() {
    try {
      const res = await fetch("/api/billing/connect-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: communityId }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif font-bold text-3xl">{community.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={community.subscriptionStatus === "active" ? "default" : community.subscriptionStatus === "trial" ? "outline" : "secondary"}
                className={community.subscriptionStatus === "trial" ? "border-blue-500 text-blue-600" : community.subscriptionStatus === "active" ? "bg-green-600" : ""}>
                {community.subscriptionStatus === "trial" ? "Free Trial" : community.subscriptionStatus || "pending"}
              </Badge>
              <span className="text-muted-foreground text-sm">{community.planName} &middot; {community.totalHomes} homes</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={galleryUrl} target="_blank"><ExternalLink className="h-4 w-4 mr-1" />Gallery</a>
            </Button>
            {isAdmin && <Button variant="outline" size="sm" asChild><Link href="/admin">Admin</Link></Button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-background"><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{community.residentCount || 0}</p><p className="text-sm text-muted-foreground">Residents</p></div>
          </div></CardContent></Card>
          <Card className="bg-background"><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100"><Dog className="h-5 w-5 text-purple-600" /></div>
            <div><p className="text-2xl font-bold">{community.dogCount || 0}</p><p className="text-sm text-muted-foreground">Pets</p></div>
          </div></CardContent></Card>
          <Card className="bg-background"><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100"><Image className="h-5 w-5 text-pink-600" /></div>
            <div><p className="text-2xl font-bold">{community.portraitCount || 0}</p><p className="text-sm text-muted-foreground">Portraits</p></div>
          </div></CardContent></Card>
          <Card className="bg-background"><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold">${((earnings?.totalEarnedCents || 0) / 100).toFixed(2)}</p><p className="text-sm text-muted-foreground">Earnings</p></div>
          </div></CardContent></Card>
        </div>

        {/* Community Code */}
        <Card className="mb-6 border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Community Code</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-primary">{community.communityCode}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(joinUrl, "Join link")}><Copy className="h-4 w-4 mr-1" />Copy Link</Button>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(community.communityCode, "Code")}><Copy className="h-4 w-4 mr-1" />Copy Code</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Residents, Invites, Orders, Earnings */}
        <Tabs defaultValue="residents" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="residents">Residents</TabsTrigger>
            <TabsTrigger value="invites">Invite & Communicate</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="earnings">Earnings & Payouts</TabsTrigger>
          </TabsList>

          {/* Residents Tab */}
          <TabsContent value="residents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Residents</CardTitle>
                  <p className="text-sm text-muted-foreground">{residents.length} registered</p>
                </div>
                <Dialog open={addResidentOpen} onOpenChange={setAddResidentOpen}>
                  <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Resident</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Resident</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); addResidentMutation.mutate(); }} className="space-y-3">
                      <div><Label>Home/Unit # *</Label><Input value={newHomeNumber} onChange={(e) => setNewHomeNumber(e.target.value)} required /></div>
                      <div><Label>Name</Label><Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} /></div>
                      <div><Label>Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
                      <div><Label>Phone</Label><Input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
                      <Button type="submit" className="w-full" disabled={addResidentMutation.isPending}>
                        {addResidentMutation.isPending ? "Adding..." : "Add Resident"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {residents.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No residents yet. Share your community code to get started!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-muted-foreground">
                          <th className="pb-3 font-medium">Home #</th>
                          <th className="pb-3 font-medium">Name</th>
                          <th className="pb-3 font-medium">Email</th>
                          <th className="pb-3 font-medium text-center"><Dog className="h-4 w-4 inline" /></th>
                          <th className="pb-3 font-medium text-center"><Image className="h-4 w-4 inline" /></th>
                          <th className="pb-3 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residents.map((r: any) => (
                          <tr key={r.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/community/${communityId}/resident/${r.id}`)}>
                            <td className="py-3 font-medium">{r.home_number}</td>
                            <td className="py-3 text-primary font-medium">{r.display_name || "—"}</td>
                            <td className="py-3 text-sm text-muted-foreground">{r.email || "—"}</td>
                            <td className="py-3 text-center">{r.pet_count}</td>
                            <td className="py-3 text-center">{r.portrait_count}</td>
                            <td className="py-3 text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites">
            <div className="grid gap-4">
              {/* Email Template — Editable */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Email Invite</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[200px] p-3 rounded-lg border text-sm font-mono resize-y"
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => copyToClipboard(emailTemplate, "Email template")}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:?subject=${encodeURIComponent(`Join ${community.name} on Pawtrait Communities!`)}&body=${encodeURIComponent(emailTemplate)}`}>
                        <Mail className="h-4 w-4 mr-1" />Open in Email
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Copy Message — Editable */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" />Newsletter / Nextdoor Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[120px] p-3 rounded-lg border text-sm font-mono resize-y"
                    value={copyMessage}
                    onChange={(e) => setCopyMessage(e.target.value)}
                  />
                  <Button size="sm" className="mt-3" onClick={() => copyToClipboard(copyMessage, "Message")}><Copy className="h-4 w-4 mr-1" />Copy Message</Button>
                </CardContent>
              </Card>

              {/* Print Flyer */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Printer className="h-5 w-5 text-primary" />Printable Flyer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">Generate a printable flyer with your community code for the clubhouse, mailroom, or community board.</p>
                  <Button size="sm" onClick={() => {
                    const flyer = window.open("", "_blank");
                    if (flyer) {
                      flyer.document.write(`<html><head><title>${community.name} - Pawtrait Communities</title>
                      <style>body{font-family:Georgia,serif;text-align:center;padding:60px;max-width:600px;margin:0 auto}
                      h1{font-size:36px;color:#E8751E;margin-bottom:10px}h2{font-size:24px;margin-bottom:20px}
                      .code{font-size:48px;font-family:monospace;letter-spacing:8px;background:#FFF3E0;padding:20px 40px;border-radius:12px;display:inline-block;margin:20px 0;color:#E8751E;font-weight:bold}
                      p{font-size:16px;color:#666;line-height:1.6}
                      .url{font-size:14px;color:#999;margin-top:30px}
                      .features{text-align:left;max-width:400px;margin:20px auto}
                      .features li{margin:8px 0;font-size:14px}</style></head>
                      <body><h1>Pawtrait Communities</h1><h2>${community.name}</h2>
                      <p>Get a free AI portrait of your pet in 50+ stunning styles!</p>
                      <div class="code">${community.communityCode}</div>
                      <p><strong>How to join:</strong></p>
                      <ul class="features"><li>Go to <strong>pawtraitcommunities.com/join</strong></li>
                      <li>Enter the code above</li><li>Add your pet and pick a style</li>
                      <li>Your portrait is ready in under a minute!</li></ul>
                      <p class="url">pawtraitcommunities.com</p></body></html>`);
                      flyer.document.close();
                      flyer.print();
                    }
                  }}><Printer className="h-4 w-4 mr-1" />Print Flyer</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Merch Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No orders yet. Orders will appear here when residents purchase keepsakes.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-muted-foreground">
                          <th className="pb-3 font-medium">Order #</th>
                          <th className="pb-3 font-medium">Resident</th>
                          <th className="pb-3 font-medium">Items</th>
                          <th className="pb-3 font-medium text-right">Total</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o: any) => (
                          <tr key={o.id} className="border-b last:border-0">
                            <td className="py-3 font-mono text-sm">#{o.id}</td>
                            <td className="py-3">{o.resident_name || o.customer_name || "—"}<br/><span className="text-xs text-muted-foreground">{o.home_number ? `Home #${o.home_number}` : ""}</span></td>
                            <td className="py-3 text-sm">{o.items?.filter((i: any) => i.productKey).map((i: any) => `${i.quantity}x ${i.productKey}`).join(", ") || "—"}</td>
                            <td className="py-3 text-right font-medium">${((o.total_cents || 0) / 100).toFixed(2)}</td>
                            <td className="py-3"><Badge variant={o.status === "submitted" || o.status === "paid" ? "default" : "secondary"}>{o.status}</Badge></td>
                            <td className="py-3 text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">${((earnings?.totalEarnedCents || 0) / 100).toFixed(2)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Paid Out</p>
                  <p className="text-2xl font-bold">${((earnings?.totalPaidCents || 0) / 100).toFixed(2)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-primary">${((earnings?.pendingCents || 0) / 100).toFixed(2)}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />Bank Account</CardTitle>
                </CardHeader>
                <CardContent>
                  {earnings?.connectSetup ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">Connected</Badge>
                      <p className="text-sm text-muted-foreground">Your bank account is set up for receiving payouts.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Connect your bank account to receive your community's share of merch earnings.</p>
                      <Button onClick={startConnectOnboarding} className="gap-2"><Wallet className="h-4 w-4" />Set Up Bank Account</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Your community earns a portion of every keepsake purchased by residents. Earnings are paid out monthly to your connected bank account.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
