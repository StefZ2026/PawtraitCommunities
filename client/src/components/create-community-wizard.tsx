import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Gift, CreditCard, Loader2, X } from "lucide-react";
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

  return (
    <Card className="mb-6 bg-background">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Add New Community</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex items-center gap-1 ${s <= step ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  s < step ? "bg-primary text-white" : s === step ? "bg-primary text-white" : "bg-muted"
                }`}>{s < step ? <Check className="h-3.5 w-3.5" /> : s}</div>
                <span className="text-xs hidden sm:inline">
                  {s === 1 ? "Info" : s === 2 ? "Profile" : s === 3 ? "Plan" : "Activate"}
                </span>
                {s < 4 && <div className={`w-6 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
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
              <Label>URL Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">pawtraitcommunities.com/{slug || "..."}</p>
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

        {/* Step 3 — Plan Recommendation */}
        {step === 3 && selectedPlan && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Based on your community profile, here's your plan:</p>

            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif font-bold text-lg">{selectedPlan.name}</h3>
                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">Your Plan</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{selectedPlan.description}</p>
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-bold">${(selectedPlan.priceMonthlyCents / 100).toFixed(0)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-muted-foreground">or</div>
                <div>
                  <span className="text-2xl font-bold">${(selectedPlan.priceAnnualCents / 100).toFixed(0)}</span>
                  <span className="text-muted-foreground">/year</span>
                  {annualSavings > 0 && <span className="text-green-600 text-sm ml-2">Save ${annualSavings.toFixed(0)}/yr</span>}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(4)} className="gap-1">Next <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 4 — Activation */}
        {step === 4 && selectedPlan && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-serif font-bold text-lg">Activate {name}</h3>
              <p className="text-sm text-muted-foreground">{selectedPlan.name} plan &middot; {totalHomes} homes</p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full gap-2 h-12"
                variant="outline"
                disabled={loading}
                onClick={() => createAndActivate("trial")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Start 14-Day Free Trial
              </Button>

              <Button
                className="w-full gap-2 h-12"
                variant="outline"
                disabled={loading}
                onClick={() => createAndActivate("monthly")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Subscribe Monthly — ${(selectedPlan.priceMonthlyCents / 100).toFixed(0)}/mo
              </Button>

              <Button
                className="w-full gap-2 h-12"
                disabled={loading}
                onClick={() => createAndActivate("annual")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Subscribe Annual — ${(selectedPlan.priceAnnualCents / 100).toFixed(0)}/yr
                {annualSavings > 0 && <span className="text-xs opacity-80">(Save ${annualSavings.toFixed(0)})</span>}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setStep(3)} disabled={loading} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button variant="ghost" onClick={onCancel} disabled={loading} className="text-muted-foreground text-sm">
                No thanks — maybe later
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
