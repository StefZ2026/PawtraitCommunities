import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dog, Cat, Heart, Sparkles, Calendar, ChevronLeft, ChevronRight,
  Loader2, Check, ArrowLeft, Save, ShoppingBag, Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Step = "setup" | "generating" | "selecting" | "assigning" | "preview" | "checkout" | "complete";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = session?.access_token;

  const [calendarName, setCalendarName] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear() + 1);
  const [startMonth, setStartMonth] = useState(1);
  const [birthdayMonth, setBirthdayMonth] = useState<number | null>(null);
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [isMultiPet, setIsMultiPet] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(id ? parseInt(id) : null);
  const [step, setStep] = useState<Step>("setup");
  const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(new Set());
  const [monthAssignments, setMonthAssignments] = useState<Record<number, number>>({});
  const [previewMonth, setPreviewMonth] = useState(0);
  const [coverType, setCoverType] = useState<"single" | "collage">("collage");
  const [coverImageId, setCoverImageId] = useState<number | null>(null);

  const { data: pets = [] } = useQuery({
    queryKey: ["/api/my-pets"],
    queryFn: async () => {
      const res = await fetch("/api/my-pets", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const { data: projectData, refetch: refetchProject } = useQuery({
    queryKey: ["/api/calendar", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!token && !!projectId,
    refetchInterval: step === "generating" ? 5000 : false,
  });

  // Resume from saved state
  useEffect(() => {
    if (!projectData) return;
    const { project, images } = projectData;
    if (project.calendar_name) setCalendarName(project.calendar_name);
    if (project.calendar_year) setCalendarYear(project.calendar_year);
    if (project.start_month) setStartMonth(project.start_month);
    if (project.birthday_month) setBirthdayMonth(project.birthday_month);
    if (project.pet_ids) setSelectedPetIds(JSON.parse(project.pet_ids));
    setIsMultiPet(project.is_multi_pet || false);

    const status = project.status;
    if (status === "ordered") setStep("complete");
    else if (status === "previewing") setStep("preview");
    else if (status === "assigning") setStep("assigning");
    else if (status === "selecting" && images.length > 0) setStep("selecting");
    else if (status === "generating") setStep("generating");
    else setStep("setup");

    const selected = images.filter((img: any) => img.image_type?.includes("selected"));
    if (selected.length > 0) setSelectedImageIds(new Set(selected.map((img: any) => img.id)));

    const assignments: Record<number, number> = {};
    for (const img of images) {
      if (img.month_assignment) assignments[img.id] = img.month_assignment;
    }
    setMonthAssignments(assignments);
  }, [projectData]);

  // Poll until generation done
  useEffect(() => {
    if (step === "generating" && projectData?.project?.status === "selecting") {
      setStep("selecting");
      toast({ title: "Portraits ready!", description: "Pick your 12 favorites for the calendar." });
    }
  }, [projectData, step]);

  // Handle Stripe return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");
    if (success && sessionId && projectId) {
      setStep("checkout");
      fetch(`/api/calendar/${projectId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(data => {
        if (data.status === "ordered") { setStep("complete"); toast({ title: "Order confirmed!" }); }
        else { toast({ title: "Error", description: "Payment verification failed", variant: "destructive" }); setStep("preview"); }
      }).catch(() => { setStep("preview"); });
    }
  }, []);

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const images = projectData?.images || [];
  const priceCents = isMultiPet ? 9000 : 7500;
  const priceDisplay = `$${(priceCents / 100).toFixed(0)}`;

  async function createProject() {
    if (selectedPetIds.length === 0) { toast({ title: "Select a pet", variant: "destructive" }); return; }
    const primaryPet = pets.find((p: any) => p.id === selectedPetIds[0]);
    const name = calendarName || (selectedPetIds.length > 1
      ? `${pets.filter((p: any) => selectedPetIds.includes(p.id)).map((p: any) => p.name).join(" & ")}'s ${calendarYear} Calendar`
      : `${primaryPet?.name}'s ${calendarYear} Calendar`);
    setCalendarName(name);

    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ calendarName: name, calendarYear, startMonth, birthdayMonth, petIds: selectedPetIds, isMultiPet: selectedPetIds.length > 1 }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const data = await res.json();
      setProjectId(data.id);
      setIsMultiPet(selectedPetIds.length > 1);
      setStep("generating");

      await fetch(`/api/calendar/${data.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      toast({ title: "Creating portraits!", description: "This takes a few minutes." });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); setStep("setup"); }
  }

  async function autoCurate() {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/calendar/${projectId}/auto-curate`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Auto-curate failed");
      const data = await res.json();
      setSelectedImageIds(new Set(data.selectedImageIds));
      toast({ title: "Curated!", description: data.message });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function saveSelections() {
    if (selectedImageIds.size !== 12) { toast({ title: `Select ${12 - selectedImageIds.size} more`, variant: "destructive" }); return; }
    try {
      await fetch(`/api/calendar/${projectId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selectedImageIds: Array.from(selectedImageIds) }),
      });
      // Auto-assign months
      const selectedImages = images.filter((img: any) => selectedImageIds.has(img.id));
      const assignments: Record<number, number> = {};
      const usedMonths = new Set<number>();
      for (const img of selectedImages) {
        if (img.month_assignment && !usedMonths.has(img.month_assignment)) { assignments[img.id] = img.month_assignment; usedMonths.add(img.month_assignment); }
      }
      let nextMonth = startMonth;
      for (const img of selectedImages) {
        if (!assignments[img.id]) {
          while (usedMonths.has(nextMonth)) nextMonth = (nextMonth % 12) + 1;
          assignments[img.id] = nextMonth; usedMonths.add(nextMonth); nextMonth = (nextMonth % 12) + 1;
        }
      }
      setMonthAssignments(assignments);
      setStep("assigning");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function saveAssignments() {
    const arr = Object.entries(monthAssignments).map(([imageId, month]) => ({ imageId: parseInt(imageId), month }));
    if (arr.length !== 12) { toast({ title: "Assign all months", variant: "destructive" }); return; }
    try {
      await fetch(`/api/calendar/${projectId}/assign-months`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ assignments: arr }) });
      await fetch(`/api/calendar/${projectId}/cover`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ coverType, coverImageId }) });
      await refetchProject();
      setStep("preview");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function checkout() {
    try {
      const res = await fetch(`/api/calendar/${projectId}/checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Checkout failed");
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  function toggleImage(imgId: number) {
    const s = new Set(selectedImageIds);
    if (s.has(imgId)) s.delete(imgId);
    else if (s.size < 12) s.add(imgId);
    else { toast({ title: "12 selected", description: "Deselect one first." }); return; }
    setSelectedImageIds(s);
  }

  function swapMonth(imageId: number, newMonth: number) {
    const a = { ...monthAssignments };
    const existing = Object.entries(a).find(([, m]) => m === newMonth);
    const cur = a[imageId];
    if (existing) a[parseInt(existing[0])] = cur;
    a[imageId] = newMonth;
    setMonthAssignments(a);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold text-lg">{calendarName || "Create Your Calendar"}</span>
          </div>
          {projectId && step !== "complete" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { toast({ title: "Progress saved!" }); setLocation("/dashboard"); }}>
              <Save className="h-4 w-4" />Save & Come Back Later
            </Button>
          )}
        </div>
      </div>

      <div className="border-b bg-background/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            {["Setup", "Generate", "Select 12", "Months", "Preview", "Order"].map((label, i) => {
              const steps: Step[] = ["setup", "generating", "selecting", "assigning", "preview", "checkout"];
              const si = steps.indexOf(step);
              const active = i === si;
              const done = i < si || step === "complete";
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-6 h-0.5 ${done ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {done && <Check className="h-3 w-3" />}{label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">

        {step === "setup" && (
          <Card><CardContent className="pt-6">
            <div className="text-center mb-8">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-3" />
              <h1 className="text-3xl font-serif font-bold">Create a Custom Calendar</h1>
              <p className="text-muted-foreground text-lg mt-2">12 months of beautiful AI portraits, printed & shipped</p>
            </div>

            <div className="mb-6">
              <Label className="text-base font-semibold mb-3 block">Which pet(s)?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pets.map((pet: any) => {
                  const sel = selectedPetIds.includes(pet.id);
                  return (
                    <button key={pet.id} className={`p-4 rounded-xl border-2 transition-all text-left ${sel ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-muted hover:border-primary/50"}`}
                      onClick={() => sel ? setSelectedPetIds(selectedPetIds.filter(x => x !== pet.id)) : setSelectedPetIds([...selectedPetIds, pet.id])}>
                      <div className="flex items-center gap-3">
                        {pet.original_photo_url ? <img src={pet.original_photo_url} alt={pet.name} className="w-12 h-12 rounded-full object-cover" /> :
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">{pet.species === "cat" ? <Cat className="h-6 w-6 text-muted-foreground" /> : <Dog className="h-6 w-6 text-muted-foreground" />}</div>}
                        <div><p className="font-semibold text-base">{pet.name}</p><p className="text-xs text-muted-foreground">{pet.breed || pet.species}</p></div>
                      </div>
                      {sel && <Check className="h-5 w-5 text-primary mt-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-base font-semibold mb-2 block">Calendar name</Label>
              <Input value={calendarName} onChange={(e) => setCalendarName(e.target.value)}
                placeholder={selectedPetIds.length > 0 ? `${pets.find((p: any) => p.id === selectedPetIds[0])?.name}'s ${calendarYear} Calendar` : "My Pet's Calendar"} className="text-lg h-12" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-base font-semibold mb-2 block">Year</Label>
                <Select value={String(calendarYear)} onValueChange={(v) => setCalendarYear(parseInt(v))}>
                  <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(new Date().getFullYear())}>{new Date().getFullYear()}</SelectItem>
                    <SelectItem value={String(new Date().getFullYear() + 1)}>{new Date().getFullYear() + 1}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-base font-semibold mb-2 block">Start month</Label>
                <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(parseInt(v))}>
                  <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTH_NAMES.map((n, i) => <SelectItem key={i+1} value={String(i+1)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-8">
              <Label className="text-base font-semibold mb-2 block">Birthday month (optional)</Label>
              <Select value={birthdayMonth ? String(birthdayMonth) : "none"} onValueChange={(v) => setBirthdayMonth(v === "none" ? null : parseInt(v))}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No birthday</SelectItem>
                  {MONTH_NAMES.map((n, i) => <SelectItem key={i+1} value={String(i+1)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/5 rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-primary mb-1">{priceDisplay}</p>
              <p className="text-sm text-muted-foreground mb-4">Printed on premium paper, wire-bound, shipped to your door</p>
              <Button size="lg" className="w-full h-16 text-xl font-semibold gap-3" disabled={selectedPetIds.length === 0} onClick={createProject}>
                <Sparkles className="h-6 w-6" />Start Creating My Calendar
              </Button>
            </div>
          </CardContent></Card>
        )}

        {step === "generating" && (
          <Card className="text-center"><CardContent className="py-16">
            <Loader2 className="h-20 w-20 text-primary animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-serif font-bold mb-3">Creating Your Calendar Portraits</h2>
            <p className="text-lg text-muted-foreground mb-4">Generating {isMultiPet ? "24" : "20"} unique portraits...</p>
            <p className="text-muted-foreground">This takes 3-5 minutes. You can leave and come back!</p>
            {images.length > 0 && (
              <div className="mt-8">
                <p className="font-semibold mb-4">{images.length} created so far...</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-w-lg mx-auto">
                  {images.slice(0, 10).map((img: any) => <div key={img.id} className="aspect-square rounded-lg overflow-hidden"><img src={img.image_url} alt="" className="w-full h-full object-cover" /></div>)}
                  {images.length > 10 && <div className="aspect-square rounded-lg bg-muted flex items-center justify-center"><span className="text-sm text-muted-foreground">+{images.length - 10}</span></div>}
                </div>
              </div>
            )}
            <Button variant="outline" size="lg" className="mt-8 gap-2" onClick={() => { toast({ title: "Progress saved!" }); setLocation("/dashboard"); }}>
              <Save className="h-4 w-4" />Save & Come Back Later
            </Button>
          </CardContent></Card>
        )}

        {step === "selecting" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold">Pick Your 12 Favorites</h2>
              <p className="text-muted-foreground text-lg mt-1">Tap the ones you love</p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <span className={`text-2xl font-bold ${selectedImageIds.size === 12 ? "text-green-600" : "text-primary"}`}>{selectedImageIds.size} / 12</span>
                <Button variant="outline" size="lg" className="gap-2" onClick={autoCurate}><Sparkles className="h-5 w-5" />Curate for Me</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img: any) => {
                const sel = selectedImageIds.has(img.id);
                return (
                  <button key={img.id} className={`relative rounded-xl overflow-hidden border-3 transition-all ${sel ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-transparent hover:border-primary/30"}`} onClick={() => toggleImage(img.id)}>
                    <div className="aspect-square"><img src={img.image_url} alt="" className="w-full h-full object-cover" /></div>
                    {sel && <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center"><Heart className="h-4 w-4 fill-current" /></div>}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-center pt-4">
              <Button size="lg" className="h-14 text-lg px-8 gap-2" disabled={selectedImageIds.size !== 12} onClick={saveSelections}>
                <Check className="h-5 w-5" />{selectedImageIds.size === 12 ? "Continue — Assign to Months" : `Select ${12 - selectedImageIds.size} More`}
              </Button>
            </div>
          </div>
        )}

        {step === "assigning" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold">Assign to Months</h2>
              <p className="text-muted-foreground text-lg mt-1">Tap any to swap</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 12 }, (_, i) => {
                const mn = ((startMonth - 1 + i) % 12) + 1;
                const entry = Object.entries(monthAssignments).find(([, m]) => m === mn);
                const imgId = entry ? parseInt(entry[0]) : null;
                const img = imgId ? images.find((x: any) => x.id === imgId) : null;
                return (
                  <div key={mn} className="rounded-xl border bg-card overflow-hidden">
                    <div className="aspect-[4/3] relative">
                      {img ? <img src={img.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm">{MONTH_NAMES[mn - 1]} {calendarYear}</p>
                      <Select value={imgId ? String(imgId) : ""} onValueChange={(v) => swapMonth(parseInt(v), mn)}>
                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Swap" /></SelectTrigger>
                        <SelectContent>{Array.from(selectedImageIds).map((id) => <SelectItem key={id} value={String(id)}>Image #{id}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
            <Card className="mt-6"><CardContent className="pt-4">
              <Label className="text-base font-semibold mb-3 block">Cover</Label>
              <div className="flex gap-3">
                <Button variant={coverType === "collage" ? "default" : "outline"} size="lg" className="flex-1" onClick={() => { setCoverType("collage"); setCoverImageId(null); }}>Collage</Button>
                <Button variant={coverType === "single" ? "default" : "outline"} size="lg" className="flex-1" onClick={() => setCoverType("single")}>Single Portrait</Button>
              </div>
              {coverType === "single" && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {Array.from(selectedImageIds).map((id) => { const img = images.find((x: any) => x.id === id); if (!img) return null;
                    return <button key={id} className={`aspect-square rounded-lg overflow-hidden border-2 ${coverImageId === id ? "border-primary ring-2 ring-primary/20" : "border-transparent"}`} onClick={() => setCoverImageId(id)}><img src={img.image_url} alt="" className="w-full h-full object-cover" /></button>; })}
                </div>
              )}
            </CardContent></Card>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" size="lg" onClick={() => setStep("selecting")}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
              <Button size="lg" className="h-14 text-lg px-8 gap-2" onClick={saveAssignments}><Check className="h-5 w-5" />Preview Calendar</Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-serif font-bold text-primary">{calendarName || "Your Calendar"} is Ready!</h2>
              <p className="text-muted-foreground text-lg mt-2">Scroll through to preview</p>
            </div>
            <Card className="overflow-hidden shadow-xl">
              <div className="bg-gradient-to-b from-primary/10 to-background p-1">
                {previewMonth === 0 ? (
                  <div className="aspect-[11/17] bg-card rounded-lg overflow-hidden relative">
                    {coverType === "single" && coverImageId ? <img src={images.find((x: any) => x.id === coverImageId)?.image_url} alt="Cover" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-1 p-1">
                        {Array.from(selectedImageIds).slice(0, 6).map((id) => { const img = images.find((x: any) => x.id === id); return img ? <div key={id} className="overflow-hidden rounded"><img src={img.image_url} alt="" className="w-full h-full object-cover" /></div> : null; })}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-4 text-center"><h3 className="text-xl font-serif font-bold text-primary">{calendarName}</h3></div>
                  </div>
                ) : (() => {
                  const mn = ((startMonth - 1 + previewMonth - 1) % 12) + 1;
                  const entry = Object.entries(monthAssignments).find(([, m]) => m === mn);
                  const img = entry ? images.find((x: any) => x.id === parseInt(entry[0])) : null;
                  return (
                    <div className="aspect-[11/17] bg-card rounded-lg overflow-hidden flex flex-col">
                      <div className="flex-[55] overflow-hidden">{img ? <img src={img.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground" /></div>}</div>
                      <div className="flex-[45] p-4 flex flex-col items-center">
                        <h3 className="text-xl font-serif font-bold">{MONTH_NAMES[mn - 1]} {calendarYear}</h3>
                        <div className="mt-3 w-full max-w-xs">
                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-medium">{["S","M","T","W","T","F","S"].map((d,i) => <div key={i}>{d}</div>)}</div>
                          <div className="grid grid-cols-7 gap-1 text-center text-xs mt-1">{(() => {
                            const fd = new Date(calendarYear, mn-1, 1).getDay();
                            const dm = new Date(calendarYear, mn, 0).getDate();
                            const c = []; for (let i=0;i<fd;i++) c.push(<div key={`e${i}`} />);
                            for (let d=1;d<=dm;d++) c.push(<div key={d} className={`py-0.5 ${new Date(calendarYear,mn-1,d).getDay()===0?"text-red-400":""}`}>{d}</div>);
                            return c;
                          })()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Card>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" disabled={previewMonth === 0} onClick={() => setPreviewMonth(previewMonth - 1)}><ChevronLeft className="h-5 w-5" /></Button>
              <span className="font-medium text-lg min-w-[140px] text-center">{previewMonth === 0 ? "Cover" : `${MONTH_NAMES[((startMonth - 1 + previewMonth - 1) % 12)]}`}</span>
              <Button variant="outline" size="icon" disabled={previewMonth === 12} onClick={() => setPreviewMonth(previewMonth + 1)}><ChevronRight className="h-5 w-5" /></Button>
            </div>
            <div className="bg-primary/5 rounded-xl p-6 text-center">
              <p className="text-3xl font-bold text-primary mb-2">{priceDisplay}</p>
              <p className="text-muted-foreground mb-4">Printed on premium paper, wire-bound, shipped to your door</p>
              <Button size="lg" className="w-full h-16 text-xl font-semibold gap-3" onClick={checkout}><ShoppingBag className="h-6 w-6" />Order My Calendar</Button>
              <p className="text-xs text-muted-foreground mt-2">Secure checkout via Stripe</p>
            </div>
            <div className="flex justify-center"><Button variant="outline" onClick={() => setStep("assigning")}><ChevronLeft className="h-4 w-4 mr-1" />Edit</Button></div>
          </div>
        )}

        {step === "checkout" && (
          <Card className="text-center"><CardContent className="py-16">
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-bold">Confirming your order...</h2>
          </CardContent></Card>
        )}

        {step === "complete" && (
          <Card className="text-center"><CardContent className="py-16">
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6"><Check className="h-10 w-10 text-green-600" /></div>
            <h2 className="text-3xl font-serif font-bold mb-3">Your Calendar is Ordered!</h2>
            <p className="text-lg text-muted-foreground mb-2">{calendarName} is being printed and will ship to your door.</p>
            <p className="text-muted-foreground mb-8">You'll receive tracking info by email.</p>
            <Button size="lg" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
