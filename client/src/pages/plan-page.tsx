import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Gift, CreditCard, Loader2, Sparkles, DollarSign, Dog } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Hero — Plan name is the star */}
        <div className="text-center mb-12">
          <h1 className="font-serif font-bold text-4xl md:text-5xl text-primary mb-2">
            {plan.name} Plan
          </h1>
          <p className="text-lg text-muted-foreground mb-6">Pawtrait Communities</p>
          <h2 className="font-serif font-bold text-2xl md:text-3xl leading-tight mb-4">
            Turn Your Residents' Pets Into a Shared Community Experience
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Delight residents with personalized pet portraits, custom keepsakes, and a vibrant community gallery — all with zero operational work for your team.
          </p>
        </div>

        <hr className="my-10 border-border" />

        {/* What's Included */}
        <div className="mb-12">
          <h2 className="font-serif font-bold text-2xl mb-8 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />What's Included
          </h2>
          <div className="space-y-6">
            {[
              { title: "Dedicated Community Gallery", desc: "A private, branded gallery where residents can browse pet portraits, favorite the ones they love, and enjoy a shared community experience" },
              { title: "Unlimited AI Pet Portraits", desc: "Beautiful, stylized images residents will love to display, share, and gift" },
              { title: "Community Pet Wall", desc: "Each quarter, 20 favorited portraits are featured and delivered as high-resolution downloads for display on your community Pet Wall" },
              { title: "Custom Pet Keepsakes", desc: "Transform portraits into calendars, framed artwork, and gift-ready products" },
              { title: "Built-In Engagement Tools", desc: "SMS notifications and sharing features to keep residents connected and involved" },
              { title: "Effortless Resident Onboarding", desc: "Simple access codes allow residents to join in minutes" },
              { title: "Community Benefit Program", desc: "A portion of every purchase supports your community programs and resident activities" },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <Check className="h-6 w-6 text-green-600 mt-1 shrink-0" />
                <div>
                  <p className="font-bold text-lg">{feature.title}</p>
                  <p className="text-muted-foreground mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="my-10 border-border" />

        {/* Pricing */}
        <div className="mb-12">
          <h2 className="font-serif font-bold text-2xl mb-6 flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />Simple, Transparent Pricing
          </h2>
          <div className="space-y-2">
            <p className="text-2xl font-bold">${(plan.priceMonthlyCents / 100).toFixed(0)}/month</p>
            <p className="text-muted-foreground text-lg">or</p>
            <p className="text-2xl font-bold">
              ${(plan.priceAnnualCents / 100).toLocaleString()}/year
              {annualSavings > 0 && <span className="text-green-600 font-normal italic text-lg ml-3">(save ${annualSavings.toFixed(0)})</span>}
            </p>
          </div>
        </div>

        <hr className="my-10 border-border" />

        {/* Try It Risk-Free */}
        <div className="mb-12">
          <h2 className="font-serif font-bold text-2xl mb-4 flex items-center gap-3">
            <Gift className="h-6 w-6 text-primary" />Try It Risk-Free
          </h2>
          <p className="text-xl font-semibold">Start your 14-day free trial — no credit card required</p>
          <p className="text-primary text-lg mt-2">Full access. Cancel anytime.</p>
        </div>

        <hr className="my-10 border-border" />

        {/* Closing Pitch */}
        <div className="mb-12">
          <h2 className="font-serif font-bold text-2xl mb-4 flex items-center gap-3">
            <Dog className="h-6 w-6 text-primary" />A Simple Way to Delight Your Residents
          </h2>
          <p className="text-xl text-muted-foreground">Your residents already love their pets.</p>
          <p className="text-xl text-muted-foreground mt-1">Pawtrait gives them a meaningful, fun way to celebrate them — together.</p>
        </div>

        <hr className="my-10 border-border" />

        {/* Activation */}
        <div className="space-y-4 mb-10">
          <Button
            className="w-full gap-3 h-16 text-xl font-semibold"
            disabled={loading}
            onClick={() => createAndActivate("trial")}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Gift className="h-6 w-6" />}
            Start Your Free 14-Day Trial
          </Button>

          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 h-14 text-lg"
              variant="outline"
              disabled={loading}
              onClick={() => createAndActivate("monthly")}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              Monthly — ${(plan.priceMonthlyCents / 100).toFixed(0)}/mo
            </Button>
            <Button
              className="flex-1 gap-2 h-14 text-lg"
              variant="outline"
              disabled={loading}
              onClick={() => createAndActivate("annual")}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              Annual — ${(plan.priceAnnualCents / 100).toLocaleString()}/yr
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center pb-12">
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
