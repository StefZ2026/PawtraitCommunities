import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dog, Cat, Heart, Sparkles, Upload, Loader2, ShoppingBag, Download, Camera, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { portraitStyles, stylePreviewImages, getStylesBySpecies, getStyleCategoriesBySpecies } from "@/lib/portrait-styles";

export default function ResidentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin, isLoading: authLoading, logout, isLoggingOut, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = session?.access_token;

  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [addPetStep, setAddPetStep] = useState<"species" | "name" | "breed" | "photo">("species");
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petPhoto, setPetPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoRef = useRef<HTMLInputElement>(null);

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/my-community"],
    queryFn: async () => {
      const res = await fetch("/api/my-community", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!token,
  });

  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ["/api/my-pets"],
    queryFn: async () => {
      const res = await fetch("/api/my-pets", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return [];
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !!community,
  });

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (!community && !communityLoading && isAdmin) { setLocation("/admin"); return null; }
  if (authLoading || communityLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Dog className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-serif font-bold mb-2">Join Your Community</h2>
            <p className="text-muted-foreground mb-6">Enter your community code to get started.</p>
            <Button size="lg" asChild><Link href="/join">Join a Community</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePet = selectedPetId ? pets.find((p: any) => p.id === selectedPetId) : pets[0];
  const activePortrait = activePet?.portrait;
  const availableStyles = activePet ? getStylesBySpecies(activePet.species || "dog") : [];
  const categories = activePet ? getStyleCategoriesBySpecies(activePet.species || "dog") : [];
  const filteredStyles = selectedCategory ? availableStyles.filter(s => s.category === selectedCategory) : availableStyles;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPetPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function addPet() {
    try {
      const res = await fetch("/api/my-pets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: petName, species: petSpecies, breed: petBreed || null, originalPhotoUrl: petPhoto }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      queryClient.invalidateQueries({ queryKey: ["/api/my-pets"] });
      setAddPetOpen(false);
      setPetName(""); setPetBreed(""); setPetPhoto(null);
      toast({ title: "Pet added!" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleGenerate() {
    if (!activePet || !selectedStyleId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dogId: activePet.id, styleId: selectedStyleId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const { jobId } = await res.json();

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const jobRes = await fetch(`/api/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!jobRes.ok) continue;
        const job = await jobRes.json();
        if (job.status === "completed") {
          toast({ title: "Portrait ready!", description: `${activePet.name}'s portrait is done!` });
          queryClient.invalidateQueries({ queryKey: ["/api/my-pets"] });
          setSelectedStyleId(null);
          setGenerating(false);
          return;
        }
        if (job.status === "failed") throw new Error(job.error || "Generation failed");
      }
      throw new Error("Generation timed out");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Community info bar */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dog className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold">{community.displayName || community.communityName}</span>
            <span className="text-xs text-muted-foreground">Home #{community.homeNumber}</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${community.communitySlug}`}><Heart className="h-4 w-4 mr-1" />Community Gallery</Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">

        {/* Pet Selector (if multiple pets) */}
        {pets.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {pets.map((pet: any) => (
              <Button
                key={pet.id}
                variant={activePet?.id === pet.id ? "default" : "outline"}
                size="lg"
                className="gap-2 shrink-0 text-base px-6 py-3"
                onClick={() => { setSelectedPetId(pet.id); setSelectedStyleId(null); }}
              >
                {pet.species === "cat" ? <Cat className="h-5 w-5" /> : <Dog className="h-5 w-5" />}
                {pet.name}
              </Button>
            ))}
            <Button variant="ghost" size="lg" className="gap-2 shrink-0" onClick={() => setAddPetOpen(true)}>
              <Plus className="h-5 w-5" />Add Pet
            </Button>
          </div>
        )}

        {pets.length === 0 ? (
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-serif font-bold mb-2">Add Your First Pet</h2>
              <p className="text-muted-foreground mb-6">Let's get started by adding your pet's info and a photo.</p>
              <Button size="lg" onClick={() => setAddPetOpen(true)} className="gap-2 text-lg px-8 py-4">
                <Plus className="h-5 w-5" />Add My Pet
              </Button>
            </CardContent>
          </Card>
        ) : activePet && (
          <>
            {/* Pet Profile + Portrait Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left: Pet Photo */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-serif font-bold text-xl mb-3">{activePet.name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{activePet.breed || activePet.species} {activePet.age ? `· ${activePet.age}` : ""}</p>
                  {activePet.original_photo_url ? (
                    <img src={activePet.original_photo_url} alt={activePet.name} className="w-full aspect-square object-cover rounded-lg" />
                  ) : (
                    <div className="w-full aspect-square bg-muted rounded-lg flex flex-col items-center justify-center">
                      <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No photo yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right: Current Portrait */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-serif font-bold text-xl mb-3">
                    {activePortrait ? "Current Portrait" : "No Portrait Yet"}
                  </h2>
                  {activePortrait?.generatedImageUrl ? (
                    <>
                      <img src={activePortrait.generatedImageUrl} alt={`${activePet.name} portrait`} className="w-full aspect-square object-cover rounded-lg mb-3" />
                      <div className="flex gap-2">
                        <Button size="lg" className="flex-1 gap-2 text-base" asChild>
                          <a href={activePortrait.generatedImageUrl} download={`${activePet.name}-portrait.png`}><Download className="h-5 w-5" />Download</a>
                        </Button>
                        <Button size="lg" variant="outline" className="flex-1 gap-2 text-base" asChild>
                          <Link href={`/order/${activePortrait.id}`}><ShoppingBag className="h-5 w-5" />Order Keepsake</Link>
                        </Button>
                      </div>
                      {activePortrait.likeCount > 0 && (
                        <p className="text-center text-sm text-muted-foreground mt-2">
                          <Heart className="h-3 w-3 inline text-red-400 fill-red-400" /> {activePortrait.likeCount} {activePortrait.likeCount === 1 ? "vote" : "votes"} in the gallery
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="w-full aspect-square bg-muted rounded-lg flex flex-col items-center justify-center">
                      <Sparkles className="h-10 w-10 text-primary mb-3" />
                      <p className="text-lg font-semibold">Ready for a portrait!</p>
                      <p className="text-sm text-muted-foreground mt-1">Pick a style below to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Generate Portrait Section */}
            {generating ? (
              <Card className="text-center">
                <CardContent className="py-12">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-serif font-bold">Creating {activePet.name}'s portrait...</h2>
                  <p className="text-muted-foreground mt-2">This usually takes 30-60 seconds. Hang tight!</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-serif font-bold flex items-center justify-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      Let's Create a Masterpiece
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg">
                      Pick a style for {activePet.name} — then click the big orange button!
                    </p>
                  </div>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2 mb-4 justify-center">
                    <Button
                      size="lg"
                      variant={selectedCategory === null ? "default" : "outline"}
                      onClick={() => setSelectedCategory(null)}
                      className="text-base"
                    >All Styles</Button>
                    {categories.map(cat => (
                      <Button
                        key={cat}
                        size="lg"
                        variant={selectedCategory === cat ? "default" : "outline"}
                        onClick={() => setSelectedCategory(cat)}
                        className="text-base"
                      >{cat}</Button>
                    ))}
                  </div>

                  {/* Style Grid */}
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                    {filteredStyles.map((style) => {
                      const previewUrl = stylePreviewImages[style.name];
                      const isSelected = selectedStyleId === style.id;
                      return (
                        <button
                          key={style.id}
                          className={`rounded-lg overflow-hidden border-3 transition-all ${isSelected ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-primary/50"}`}
                          onClick={() => setSelectedStyleId(style.id)}
                        >
                          <div className="aspect-square relative">
                            {previewUrl ? (
                              <img src={previewUrl} alt={style.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center"><Sparkles className="h-5 w-5 text-muted-foreground" /></div>
                            )}
                          </div>
                          <p className="text-xs p-2 text-center font-medium truncate">{style.name}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Generate Button — BIG */}
                  <Button
                    size="lg"
                    className="w-full gap-3 h-16 text-xl font-semibold"
                    disabled={!selectedStyleId || !activePet.original_photo_url}
                    onClick={handleGenerate}
                  >
                    <Sparkles className="h-6 w-6" />
                    Generate {activePet.name}'s Portrait
                  </Button>
                  {!activePet.original_photo_url && (
                    <p className="text-center text-sm text-amber-600 mt-2">
                      You need to upload a photo of {activePet.name} first before generating a portrait.
                    </p>
                  )}
                  {selectedStyleId && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      Style: {availableStyles.find(s => s.id === selectedStyleId)?.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Create Calendar CTA */}
            <Card className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-serif font-bold mb-2">Turn Your Portraits into a Custom Calendar</h3>
                <p className="text-muted-foreground mb-4">12 months of beautiful AI portraits — printed on premium paper and shipped to your door</p>
                <Button size="lg" className="gap-2 text-lg h-14 px-8" asChild>
                  <Link href="/calendar/new"><Sparkles className="h-5 w-5" />Create My Calendar</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add Pet — Guided Mini Wizard */}
      <Dialog open={addPetOpen} onOpenChange={(open) => { setAddPetOpen(open); if (!open) { setPetName(""); setPetSpecies("dog"); setPetBreed(""); setPetPhoto(null); setAddPetStep("species"); } }}>
        <DialogContent>
          {addPetStep === "species" && (
            <>
              <DialogHeader><DialogTitle>Is your new pet a dog or a cat?</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button size="lg" variant={petSpecies === "dog" ? "default" : "outline"} className="flex-1 gap-2 text-lg h-14" onClick={() => { setPetSpecies("dog"); setAddPetStep("name"); }}><Dog className="h-6 w-6" />Dog</Button>
                  <Button size="lg" variant={petSpecies === "cat" ? "default" : "outline"} className="flex-1 gap-2 text-lg h-14" onClick={() => { setPetSpecies("cat"); setAddPetStep("name"); }}><Cat className="h-6 w-6" />Cat</Button>
                </div>
              </div>
            </>
          )}
          {addPetStep === "name" && (
            <>
              <DialogHeader><DialogTitle>What's your {petSpecies}'s name?</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder={petSpecies === "cat" ? "e.g. Whiskers" : "e.g. Buddy"} autoFocus className="text-lg h-12" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddPetStep("species")}>Back</Button>
                  <Button size="lg" className="flex-1 text-base" disabled={!petName.trim()} onClick={() => setAddPetStep("breed")}>Next</Button>
                </div>
              </div>
            </>
          )}
          {addPetStep === "breed" && (
            <>
              <DialogHeader><DialogTitle>What breed is {petName}?</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} placeholder={petSpecies === "cat" ? "e.g. Siamese (optional)" : "e.g. Golden Retriever (optional)"} autoFocus className="text-lg h-12" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddPetStep("name")}>Back</Button>
                  <Button size="lg" className="flex-1 text-base" onClick={() => setAddPetStep("photo")}>Next</Button>
                </div>
              </div>
            </>
          )}
          {addPetStep === "photo" && (
            <>
              <DialogHeader><DialogTitle>Upload a photo of {petName}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <input type="file" ref={addPhotoRef} accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setPetPhoto(reader.result as string);
                  reader.readAsDataURL(file);
                }} className="hidden" />
                {petPhoto ? (
                  <div className="relative">
                    <img src={petPhoto} alt={petName} className="w-full h-48 object-cover rounded-lg" />
                    <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => { setPetPhoto(null); if (addPhotoRef.current) addPhotoRef.current.value = ""; }}>Change</Button>
                  </div>
                ) : (
                  <div>
                    <Button type="button" variant="outline" className="w-full h-28 flex flex-col gap-2" onClick={() => addPhotoRef.current?.click()}>
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <span className="text-base text-muted-foreground">Tap to upload a photo</span>
                    </Button>
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Tips for the best portrait:</p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Choose a well-lit photo</li>
                        <li>Just one pet in the picture</li>
                        <li>Facing forward works best</li>
                      </ul>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddPetStep("breed")}>Back</Button>
                  <Button size="lg" className="flex-1 text-base gap-2" onClick={addPet}>
                    <Sparkles className="h-5 w-5" />{petPhoto ? `Add ${petName}` : `Add ${petName} (photo later)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
