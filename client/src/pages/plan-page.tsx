import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, Gift, CreditCard, Loader2, Sparkles, DollarSign, Dog, Heart, Image, Trophy, ShoppingBag, MessageSquare, Users, HandHeart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CatFilled } from "@/components/cat-filled";

interface WizardState {
  name: string;
  slug: string;
  totalHomes: string;
  contactName: string;
  contactEmail: string;
  hasLifestyleDirector: boolean;
  hasRegularEvents: boolean;
  hasNewsletterOrPortal: boolean;
  selectedPlanId: number;
  selfService: boolean;
  plan: { id: number; name: string; priceMonthlyCents: number; priceAnnualCents: number };
  annualSavings: number;
}

export default function PlanPage() {
  const [, setLocation] = useLocation();
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const token = session?.access_token;
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<WizardState | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("communityWizardState");
    if (saved) {
      setState(JSON.parse(saved));
    } else {
      setLocation("/get-started");
    }
  }, []);

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (!state) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  const { plan, annualSavings } = state;

  async function createAndActivate(activation: "trial" | "monthly" | "annual") {
    if (!token || !state) return;
    setLoading(true);
    try {
      const createUrl = state.selfService ? "/api/communities/register-community" : "/api/admin/communities";
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: state.name, slug: state.slug.toLowerCase().replace(/[^a-z0-9]/g, ""),
          totalHomes: parseInt(state.totalHomes),
          contactName: state.contactName || undefined, contactEmail: state.contactEmail || undefined,
          engagementAnswers: { hasLifestyleDirector: state.hasLifestyleDirector, hasRegularEvents: state.hasRegularEvents, hasNewsletterOrPortal: state.hasNewsletterOrPortal },
          selectedPlanId: state.selectedPlanId,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create community");

      if (activation === "trial") {
        const trialRes = await fetch("/api/billing/free-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orgId: createData.id }),
        });
        const trialData = await trialRes.json();
        if (!trialRes.ok) throw new Error(trialData.error || "Failed to start trial");
        sessionStorage.removeItem("communityWizardState");
        toast({ title: "Community created!", description: `${createData.name} is live with a 14-day free trial. Code: ${createData.communityCode}` });
        setLocation("/admin");
      } else {
        const checkoutRes = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orgId: createData.id, billing: activation }),
        });
        const checkoutData = await checkoutRes.json();
        if (!checkoutRes.ok) throw new Error(checkoutData.error || "Failed to start checkout");
        sessionStorage.removeItem("communityWizardState");
        if (checkoutData.url) window.location.href = checkoutData.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    sessionStorage.removeItem("communityWizardState");
    window.history.back();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-muted/10">
      <div className="max-w-6xl mx-auto px-8 py-6">

        {/* Hero — compact */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dog className="h-6 w-6 text-primary" />
            <CatFilled className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-serif font-bold text-4xl md:text-5xl mb-1">
            <span className="text-primary">{plan.name}</span> Plan
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Turn your residents' pets into a shared community experience — personalized portraits, custom keepsakes, and a vibrant gallery with zero operational work.
          </p>
        </div>

        {/* What's Included */}
        <Card className="mb-4 border-0 shadow-lg">
          <CardContent className="p-5">
            <h2 className="font-serif font-bold text-lg mb-3 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></div>
              What's Included
            </h2>
            <div className="space-y-2">
              {[
                { icon: Image, color: "bg-purple-100 text-purple-600", title: "Dedicated Community Gallery", desc: "A private, branded gallery where residents browse, favorite, and enjoy portraits together" },
                { icon: Sparkles, color: "bg-amber-100 text-amber-600", title: "Unlimited AI Pet Portraits", desc: "Beautiful, stylized images residents will love to display, share, and gift" },
                { icon: Trophy, color: "bg-blue-100 text-blue-600", title: "Community Pet Wall", desc: "Each quarter, 20 favorited portraits featured as high-res downloads for your Pet Wall" },
                { icon: ShoppingBag, color: "bg-pink-100 text-pink-600", title: "Custom Pet Keepsakes", desc: "Transform portraits into calendars, framed artwork, and gift-ready products" },
                { icon: MessageSquare, color: "bg-green-100 text-green-600", title: "Built-In Engagement Tools", desc: "SMS notifications and sharing features to keep residents connected" },
                { icon: Users, color: "bg-cyan-100 text-cyan-600", title: "Effortless Resident Onboarding", desc: "Simple access codes allow residents to join in minutes" },
                { icon: HandHeart, color: "bg-orange-100 text-orange-600", title: "Community Benefit Program", desc: "A portion of every purchase supports your community programs" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                  <div className={`p-2 rounded-lg ${feature.color} shrink-0`}>
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{feature.title}</p>
                    <p className="text-muted-foreground text-xs">{feature.desc}</p>
                  </div>
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing + Trial side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="border-2 border-primary shadow-lg">
          <CardContent className="p-5">
            <h2 className="font-serif font-bold text-lg mb-3 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><DollarSign className="h-4 w-4 text-primary" /></div>
              Simple, Transparent Pricing
            </h2>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-3xl font-bold text-primary">${(plan.priceMonthlyCents / 100).toFixed(0)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <span className="text-muted-foreground">or</span>
              <div>
                <span className="text-3xl font-bold text-primary">${(plan.priceAnnualCents / 100).toLocaleString()}</span>
                <span className="text-muted-foreground">/year</span>
                {annualSavings > 0 && (
                  <span className="ml-3 inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                    Save ${annualSavings.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Try It Risk-Free */}
        <Card className="border-0 shadow-lg bg-blue-50">
          <CardContent className="p-5">
            <h2 className="font-serif font-bold text-lg mb-2 flex items-center gap-2 text-blue-900">
              <div className="p-1.5 rounded-lg bg-blue-100"><Gift className="h-4 w-4 text-blue-600" /></div>
              Try It Risk-Free
            </h2>
            <p className="font-semibold text-blue-800">Start your 14-day free trial — no credit card required</p>
            <p className="text-blue-600 text-sm mt-1">Full access. Cancel anytime.</p>
          </CardContent>
        </Card>
        </div>

        {/* Closing + Buttons */}
        <div className="text-center mb-4 py-3">
          <Heart className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-muted-foreground italic max-w-lg mx-auto">
            Your residents already love their pets. Pawtrait gives them a meaningful, fun way to celebrate them — together.
          </p>
        </div>

        {/* Activation Buttons */}
        <div className="space-y-2 mb-4">
          <Button
            className="w-full gap-2 h-12 text-lg font-semibold shadow-lg"
            disabled={loading}
            onClick={() => createAndActivate("trial")}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
            Start Your Free 14-Day Trial
          </Button>

          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 h-10"
              variant="outline"
              disabled={loading}
              onClick={() => createAndActivate("monthly")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Monthly — ${(plan.priceMonthlyCents / 100).toFixed(0)}/mo
            </Button>
            <Button
              className="flex-1 gap-2 h-10"
              variant="outline"
              disabled={loading}
              onClick={() => createAndActivate("annual")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Annual — ${(plan.priceAnnualCents / 100).toLocaleString()}/yr
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pb-4">
          <Button variant="outline" onClick={goBack} disabled={loading} className="gap-2 h-11">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="ghost" onClick={() => { sessionStorage.removeItem("communityWizardState"); setLocation("/"); }} disabled={loading} className="text-muted-foreground text-base">
            No thanks — maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
