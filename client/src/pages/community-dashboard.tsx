import { useState } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Copy, Users, Dog, Image, ExternalLink, Mail, MessageSquare,
  Check, Printer
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function CommunityDashboard() {
  const { orgId } = useParams<{ orgId?: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin, isLoading: authLoading, session } = useAuth();
  const { toast } = useToast();
  const token = session?.access_token;
  const [copied, setCopied] = useState(false);

  // Get the community — either by orgId (admin drilling in) or by owner_id
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

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  if (!community) {
    setLocation("/get-started");
    return null;
  }

  const joinUrl = `https://pawtraitcommunities.com/join?code=${community.communityCode}`;
  const galleryUrl = `https://pawtraitcommunities.com/${community.slug}`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  }

  const emailSubject = encodeURIComponent(`Join ${community.name} on Pawtrait Communities!`);
  const emailBody = encodeURIComponent(
    `Hi neighbor!\n\n` +
    `${community.name} has partnered with Pawtrait Communities to bring AI pet portraits to our community!\n\n` +
    `Here's how to join:\n` +
    `1. Go to ${joinUrl}\n` +
    `2. Create a free account\n` +
    `3. Add your pet and generate a stunning portrait\n\n` +
    `Your community code is: ${community.communityCode}\n\n` +
    `It's free for all residents — check it out!`
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif font-bold text-3xl">{community.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={community.subscriptionStatus === "active" ? "default" : community.subscriptionStatus === "trial" ? "outline" : "secondary"}
                  className={community.subscriptionStatus === "trial" ? "border-blue-500 text-blue-600" : ""}>
                  {community.subscriptionStatus === "trial" ? "Free Trial" : community.subscriptionStatus || "pending"}
                </Badge>
                <span className="text-muted-foreground">{community.planName} Plan</span>
                <span className="text-muted-foreground">&middot; {community.totalHomes} homes</span>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={galleryUrl} target="_blank"><ExternalLink className="h-4 w-4 mr-2" />View Gallery</a>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{community.residentCount || 0}</p>
              <p className="text-sm text-muted-foreground">Residents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Dog className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{community.dogCount || 0}</p>
              <p className="text-sm text-muted-foreground">Pets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Image className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{community.portraitCount || 0}</p>
              <p className="text-sm text-muted-foreground">Portraits</p>
            </CardContent>
          </Card>
        </div>

        {/* Community Code — the main action */}
        <Card className="mb-8 border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-xl">Your Community Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="inline-block bg-muted px-8 py-4 rounded-xl">
                <p className="text-4xl font-mono font-bold tracking-widest text-primary">{community.communityCode}</p>
              </div>
              <p className="text-muted-foreground mt-3">Share this code with your residents so they can join and start creating portraits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Join Link */}
              <div>
                <label className="text-sm font-medium mb-1 block">Resident Join Link</label>
                <div className="flex gap-2">
                  <Input value={joinUrl} readOnly className="text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(joinUrl, "Join link")}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Gallery Link */}
              <div>
                <label className="text-sm font-medium mb-1 block">Gallery Link</label>
                <div className="flex gap-2">
                  <Input value={galleryUrl} readOnly className="text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(galleryUrl, "Gallery link")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Invite Residents */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Invite Your Residents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Choose how you'd like to share Pawtrait Communities with your residents:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Email */}
              <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`} className="block">
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6 text-center">
                    <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold">Send an Email</p>
                    <p className="text-sm text-muted-foreground mt-1">Pre-written invite email ready to send</p>
                  </CardContent>
                </Card>
              </a>

              {/* Copy Message */}
              <div onClick={() => copyToClipboard(
                `🐾 ${community.name} has partnered with Pawtrait Communities!\n\nGet a free AI portrait of your pet in 50+ stunning styles.\n\nJoin here: ${joinUrl}\nYour code: ${community.communityCode}`,
                "Invite message"
              )} className="cursor-pointer">
                <Card className="h-full hover:border-primary transition-colors">
                  <CardContent className="pt-6 text-center">
                    <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold">Copy Message</p>
                    <p className="text-sm text-muted-foreground mt-1">Copy a ready-to-paste message for newsletters or Nextdoor</p>
                  </CardContent>
                </Card>
              </div>

              {/* Print Flyer */}
              <div onClick={() => {
                const flyer = window.open("", "_blank");
                if (flyer) {
                  flyer.document.write(`
                    <html><head><title>Pawtrait Communities - ${community.name}</title>
                    <style>body{font-family:Georgia,serif;text-align:center;padding:60px;max-width:600px;margin:0 auto}
                    h1{font-size:36px;color:#E8751E;margin-bottom:10px}h2{font-size:24px;margin-bottom:20px}
                    .code{font-size:48px;font-family:monospace;letter-spacing:8px;background:#FFF3E0;padding:20px 40px;border-radius:12px;display:inline-block;margin:20px 0;color:#E8751E;font-weight:bold}
                    p{font-size:16px;color:#666;line-height:1.6;margin:10px 0}
                    .url{font-size:14px;color:#999;margin-top:30px}
                    .features{text-align:left;max-width:400px;margin:20px auto}
                    .features li{margin:8px 0;font-size:14px}</style></head>
                    <body>
                    <h1>Pawtrait Communities</h1>
                    <h2>${community.name}</h2>
                    <p>Get a free AI portrait of your pet in 50+ stunning styles!</p>
                    <div class="code">${community.communityCode}</div>
                    <p><strong>How to join:</strong></p>
                    <ul class="features">
                    <li>Go to <strong>pawtraitcommunities.com/join</strong></li>
                    <li>Enter the code above</li>
                    <li>Add your pet and pick a style</li>
                    <li>Your portrait is ready in under a minute!</li>
                    </ul>
                    <p class="url">pawtraitcommunities.com</p>
                    </body></html>`);
                  flyer.document.close();
                  flyer.print();
                }
              }} className="cursor-pointer">
                <Card className="h-full hover:border-primary transition-colors">
                  <CardContent className="pt-6 text-center">
                    <Printer className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold">Print a Flyer</p>
                    <p className="text-sm text-muted-foreground mt-1">Printable flyer with your code for the clubhouse or mailroom</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="font-semibold">Share your code with residents</p>
                  <p className="text-sm text-muted-foreground">Use email, your community newsletter, Nextdoor, or post a flyer. The code is all they need.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="font-semibold">Residents join and add their pets</p>
                  <p className="text-sm text-muted-foreground">They create a free account, upload a pet photo, and generate their first portrait in under a minute.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <p className="font-semibold">Watch your gallery come alive</p>
                  <p className="text-sm text-muted-foreground">Portraits appear in your community gallery. Residents vote for favorites and order keepsakes.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
