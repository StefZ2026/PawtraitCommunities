import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Gift, CreditCard, Loader2, X, Sparkles, DollarSign, Dog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: number;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  sizeTier: string;
  maxHomes: number;
}

interface WizardProps {
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
  selfService?: boolean;
}

export function CreateCommunityWizard({ token, onSuccess, onCancel, selfService = false }: WizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Step 1 — Basic Info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [totalHomes, setTotalHomes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Step 2 — Engagement Questions
  const [hasLifestyleDirector, setHasLifestyleDirector] = useState<boolean | null>(null);
  const [hasRegularEvents, setHasRegularEvents] = useState<boolean | null>(null);
  const [hasNewsletterOrPortal, setHasNewsletterOrPortal] = useState<boolean | null>(null);

  // Step 3 — Plan Selection
  const [recommendedPlanId, setRecommendedPlanId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Created community data (after Step 4 POST)
  const [createdOrg, setCreatedOrg] = useState<any>(null);

  useEffect(() => {
    fetch("/api/billing/plans", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPlans(data))
      .catch(() => {});
  }, [token]);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }

  function computeRecommendedPlan(): number | null {
    const yesCount = [hasLifestyleDirector, hasRegularEvents, hasNewsletterOrPortal].filter(Boolean).length;
    const homes = parseInt(totalHomes) || 0;

    if (yesCount >= 2) {
      return plans.find(p => p.sizeTier === "signature")?.id || null;
    } else if (homes <= 250) {
      return plans.find(p => p.sizeTier === "standard")?.id || null;
    } else {
      return plans.find(p => p.sizeTier === "growth")?.id || null;
    }
  }

  function advanceToStep3() {
    const recId = computeRecommendedPlan();
    setRecommendedPlanId(recId);
    setSelectedPlanId(recId);
    setStep(3);
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const recommendedPlan = plans.find(p => p.id === recommendedPlanId);

  async function createAndActivate(activation: "trial" | "monthly" | "annual") {
    setLoading(true);
    try {
      // Step 1: Create the community
      const createUrl = selfService ? "/api/communities/register-community" : "/api/admin/communities";
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name, slug: slug.toLowerCase().replace(/[^a-z0-9]/g, ""),
          totalHomes: parseInt(totalHomes),
          contactName: contactName || undefined, contactEmail: contactEmail || undefined,
          engagementAnswers: { hasLifestyleDirector, hasRegularEvents, hasNewsletterOrPortal },
          selectedPlanId,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create community");
      setCreatedOrg(createData);

      // Step 2: Activate
      if (activation === "trial") {
        const trialRes = await fetch("/api/billing/free-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orgId: createData.id }),
        });
        const trialData = await trialRes.json();
        if (!trialRes.ok) throw new Error(trialData.error || "Failed to start trial");
        toast({ title: "Community created!", description: `${createData.name} is live with a 14-day free trial. Code: ${createData.communityCode}` });
        onSuccess();
      } else {
        const checkoutRes = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orgId: createData.id, billing: activation }),
        });
        const checkoutData = await checkoutRes.json();
        if (!checkoutRes.ok) throw new Error(checkoutData.error || "Failed to start checkout");
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      // If community was created but activation failed, still refresh the list
      if (createdOrg) onSuccess();
    } finally {
      setLoading(false);
    }
  }

  const step1Valid = name.trim() && slug.trim() && totalHomes && parseInt(totalHomes) > 0 && contactName.trim();
  const step2Valid = hasLifestyleDirector !== null && hasRegularEvents !== null && hasNewsletterOrPortal !== null;

  const annualSavings = selectedPlan
    ? ((selectedPlan.priceMonthlyCents * 12) - selectedPlan.priceAnnualCents) / 100
    : 0;

  // Step 3 renders as a full standalone page, not inside a card
  if (step === 3 && selectedPlan) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Pawtrait Communities — {selectedPlan.name} Plan</span>
          </div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl leading-tight mb-4">
            Turn Your Residents' Pets Into a Shared Community Experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Delight residents with personalized pet portraits, custom keepsakes, and a vibrant community gallery — all with zero operational work for your team.
          </p>
        </div>

        {/* Divider */}
        <hr className="my-8 border-border" />

        {/* What's Included */}
        <div className="mb-10">
          <h2 className="font-serif font-bold text-xl mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />What's Included
          </h2>
          <div className="space-y-5">
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
                <Check className="h-6 w-6 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-base">{feature.title}</p>
                  <p className="text-muted-foreground mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <hr className="my-8 border-border" />

        {/* Simple, Transparent Pricing */}
        <div className="mb-10">
          <h2 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />Simple, Transparent Pricing
          </h2>
          <div className="space-y-1">
            <p className="text-lg font-bold">${(selectedPlan.priceMonthlyCents / 100).toFixed(0)}/month</p>
            <p className="text-muted-foreground">or</p>
            <p className="text-lg font-bold">
              ${(selectedPlan.priceAnnualCents / 100).toLocaleString()}/year
              {annualSavings > 0 && <span className="text-green-600 font-normal italic ml-2">(save ${annualSavings.toFixed(0)})</span>}
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-8 border-border" />

        {/* Try It Risk-Free */}
        <div className="mb-10">
          <h2 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />Try It Risk-Free
          </h2>
          <p className="text-lg font-semibold">Start your 14-day free trial — no credit card required</p>
          <p className="text-primary mt-1">Full access. Cancel anytime.</p>
        </div>

        {/* Divider */}
        <hr className="my-8 border-border" />

        {/* Closing Pitch */}
        <div className="mb-10">
          <h2 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
            <Dog className="h-5 w-5 text-primary" />A Simple Way to Delight Your Residents
          </h2>
          <p className="text-lg text-muted-foreground">Your residents already love their pets.</p>
          <p className="text-lg text-muted-foreground">Pawtrait gives them a meaningful, fun way to celebrate them — together.</p>
        </div>

        {/* Divider */}
        <hr className="my-8 border-border" />

        {/* Activation Buttons */}
        <div className="space-y-4 mb-8">
          <Button
            className="w-full gap-2 h-14 text-lg font-semibold"
            disabled={loading}
            onClick={() => createAndActivate("trial")}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
            Start Your Free 14-Day Trial
          </Button>

          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 h-12 text-base"
              variant="outline"
              disabled={loading}
              onClick={() => createAndActivate("monthly")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Monthly — ${(selectedPlan.priceMonthlyCents / 100).toFixed(0)}/mo
            </Button>
            <Button
              className="flex-1 gap-2 h-12 text-base"
              variant="outline"
              disabled={loading}
              onClick={() => createAndActivate("annual")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Annual — ${(selectedPlan.priceAnnualCents / 100).toLocaleString()}/yr
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center pb-8">
          <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="text-muted-foreground">
            No thanks — maybe later
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6 bg-background">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Add New Community</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex items-center gap-1 ${s <= step ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  s < step ? "bg-primary text-white" : s === step ? "bg-primary text-white" : "bg-muted"
                }`}>{s < step ? <Check className="h-3.5 w-3.5" /> : s}</div>
                <span className="text-xs hidden sm:inline">
                  {s === 1 ? "Info" : s === 2 ? "Profile" : "Your Plan"}
                </span>
                {s < 3 && <div className={`w-6 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {/* Step 1 — Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Community Name *</Label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Soleil at Lakewood Ranch" />
            </div>
            <div>
              <Label>Community URL</Label>
              <div className="flex items-center border rounded-md overflow-hidden">
                <span className="bg-muted px-3 py-2 text-sm text-muted-foreground whitespace-nowrap border-r">pawtraitcommunities.com/</span>
                <input className="flex-1 px-3 py-2 text-sm bg-background outline-none" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Homes *</Label>
                <Input type="number" value={totalHomes} onChange={(e) => setTotalHomes(e.target.value)} placeholder="e.g. 700" min="1" />
              </div>
              <div>
                <Label>Community Contact Name *</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Jane Smith" />
              </div>
            </div>
            <div>
              <Label>Community Contact Email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!step1Valid} className="gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Community Profile */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Help us understand your community to recommend the best plan.</p>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Does your community have a lifestyle director or activities coordinator?</Label>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant={hasLifestyleDirector === true ? "default" : "outline"} size="sm" onClick={() => setHasLifestyleDirector(true)}>Yes</Button>
                  <Button type="button" variant={hasLifestyleDirector === false ? "default" : "outline"} size="sm" onClick={() => setHasLifestyleDirector(false)}>No</Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Does your community host regular resident events?</Label>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant={hasRegularEvents === true ? "default" : "outline"} size="sm" onClick={() => setHasRegularEvents(true)}>
                    Yes
                  </Button>
                  <Button type="button" variant={hasRegularEvents === false ? "default" : "outline"} size="sm" onClick={() => setHasRegularEvents(false)}>No</Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Does your community have a resident newsletter or online portal?</Label>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant={hasNewsletterOrPortal === true ? "default" : "outline"} size="sm" onClick={() => setHasNewsletterOrPortal(true)}>Yes</Button>
                  <Button type="button" variant={hasNewsletterOrPortal === false ? "default" : "outline"} size="sm" onClick={() => setHasNewsletterOrPortal(false)}>No</Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={advanceToStep3} disabled={!step2Valid} className="gap-1">Next <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
