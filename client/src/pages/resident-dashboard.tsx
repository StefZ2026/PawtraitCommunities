import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dog, Plus, Image, Heart, LogOut, Sparkles, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { portraitStyles, stylePreviewImages, getStylesBySpecies } from "@/lib/portrait-styles";

export default function ResidentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, logout, isLoggingOut, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petPhoto, setPetPhoto] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = session?.access_token;

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/my-community"],
    queryFn: async () => {
      const res = await fetch("/api/my-community", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/my-pets"],
    queryFn: async () => {
      const res = await fetch("/api/my-pets", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token && !!community,
  });

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPetPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  const addPetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/my-pets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: petName, species: petSpecies, breed: petBreed || null, originalPhotoUrl: petPhoto }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pets"] });
      setAddPetOpen(false);
      setPetName(""); setPetBreed(""); setPetPhoto(null);
      toast({ title: "Pet added!" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  async function handleGenerate() {
    if (!selectedPet || !selectedStyleId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dogId: selectedPet.id, styleId: selectedStyleId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const { jobId } = await res.json();

      // Poll for result
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const jobRes = await fetch(`/api/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!jobRes.ok) continue;
        const job = await jobRes.json();
        if (job.status === "completed") {
          toast({ title: "Portrait ready!", description: `${selectedPet.name}'s portrait is done.` });
          queryClient.invalidateQueries({ queryKey: ["/api/my-pets"] });
          setGenerateOpen(false);
          setSelectedStyleId(null);
          setGenerating(false);
          return;
        }
        if (job.status === "failed") {
          throw new Error(job.error || "Generation failed");
        }
      }
      throw new Error("Generation timed out");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (authLoading || communityLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Dog className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-serif font-bold mb-2">Join Your Community</h2>
            <p className="text-muted-foreground mb-6">Enter your community code to get started.</p>
            <Button asChild><Link href="/join">Join a Community</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableStyles = selectedPet ? getStylesBySpecies(selectedPet.species || "dog") : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dog className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-serif font-bold">{community.communityName}</h1>
              <p className="text-xs text-muted-foreground">Home #{community.homeNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${community.communitySlug}`}><Heart className="h-4 w-4 mr-1" />Gallery</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} disabled={isLoggingOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold">My Pets</h2>
          <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Pet</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a Pet</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addPetMutation.mutate(); }} className="space-y-4">
                <div><Label>Name</Label><Input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Bella" required /></div>
                <div>
                  <Label>Species</Label>
                  <Select value={petSpecies} onValueChange={setPetSpecies}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dog">Dog</SelectItem><SelectItem value="cat">Cat</SelectItem></SelectContent></Select>
                </div>
                <div><Label>Breed (optional)</Label><Input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} placeholder="e.g. Golden Retriever" /></div>
                <div>
                  <Label>Photo</Label>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  {petPhoto ? (
                    <div className="relative">
                      <img src={petPhoto} alt="Pet photo" className="w-full h-48 object-cover rounded-lg" />
                      <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => { setPetPhoto(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Change</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="w-full h-32 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload a photo</span>
                    </Button>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={addPetMutation.isPending}>{addPetMutation.isPending ? "Adding..." : "Add Pet"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {petsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-48" /></Card>)}</div>
        ) : !pets || pets.length === 0 ? (
          <Card className="text-center"><CardContent className="pt-8 pb-6"><Dog className="h-10 w-10 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground mb-4">No pets yet. Add your first pet to get started!</p><Button onClick={() => setAddPetOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Your First Pet</Button></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet: any) => (
              <Card key={pet.id} className="overflow-hidden">
                {pet.portrait?.generatedImageUrl ? (
                  <div className="aspect-square relative">
                    <img src={pet.portrait.generatedImageUrl} alt={`${pet.name} portrait`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white font-semibold">{pet.name}</p>
                      <p className="text-white/70 text-sm">{pet.breed || pet.species}</p>
                      {pet.portrait.likeCount > 0 && <div className="flex items-center gap-1 mt-1"><Heart className="h-3 w-3 text-red-400 fill-red-400" /><span className="text-white/80 text-xs">{pet.portrait.likeCount}</span></div>}
                    </div>
                    <Button size="sm" className="absolute top-2 right-2 gap-1" onClick={() => { setSelectedPet(pet); setGenerateOpen(true); }}>
                      <Sparkles className="h-3 w-3" />New Style
                    </Button>
                  </div>
                ) : (
                  <CardContent className="pt-6">
                    {pet.original_photo_url ? (
                      <div className="aspect-square rounded-lg overflow-hidden mb-4">
                        <img src={pet.original_photo_url} alt={pet.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center mb-4">
                        <Image className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">No photo yet</p>
                      </div>
                    )}
                    <h3 className="font-semibold">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{pet.breed || pet.species}</p>
                    <Button size="sm" className="w-full gap-1" onClick={() => { setSelectedPet(pet); setGenerateOpen(true); }} disabled={!pet.original_photo_url}>
                      <Sparkles className="h-4 w-4" />Generate Portrait
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Generate Portrait Dialog */}
        <Dialog open={generateOpen} onOpenChange={(open) => { setGenerateOpen(open); if (!open) { setSelectedStyleId(null); setGenerating(false); } }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Portrait for {selectedPet?.name}</DialogTitle>
            </DialogHeader>
            {generating ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Creating {selectedPet?.name}'s portrait...</p>
                <p className="text-xs text-muted-foreground">This usually takes 30-60 seconds</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">Choose a style for {selectedPet?.name}'s AI portrait:</p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableStyles.map((style) => {
                    const previewUrl = stylePreviewImages[style.name];
                    const isSelected = selectedStyleId === style.id;
                    return (
                      <button
                        key={style.id}
                        className={`rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/50"}`}
                        onClick={() => setSelectedStyleId(style.id)}
                      >
                        <div className="aspect-square relative">
                          {previewUrl ? (
                            <img src={previewUrl} alt={style.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center"><Sparkles className="h-5 w-5 text-muted-foreground" /></div>
                          )}
                        </div>
                        <p className="text-xs p-1.5 text-center font-medium truncate">{style.name}</p>
                      </button>
                    );
                  })}
                </div>
                <Button className="w-full mt-4 gap-2" disabled={!selectedStyleId} onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4" />
                  Generate Portrait
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
