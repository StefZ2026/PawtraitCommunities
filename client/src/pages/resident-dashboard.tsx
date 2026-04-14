import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dog, Plus, Image, Heart, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function ResidentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, logout, isLoggingOut, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("dog");
  const [petBreed, setPetBreed] = useState("");
  const token = session?.access_token;

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/my-community"],
    queryFn: async () => {
      const res = await fetch("/api/my-community", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch community");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/my-pets"],
    queryFn: async () => {
      const res = await fetch("/api/my-pets", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
    enabled: !!token && !!community,
  });

  const addPetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/my-pets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: petName, species: petSpecies, breed: petBreed || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pets"] });
      setAddPetOpen(false);
      setPetName("");
      setPetBreed("");
      toast({ title: "Pet added!" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

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
              <Link href={`/gallery/${community.communitySlug}`}><Heart className="h-4 w-4 mr-1" />Gallery</Link>
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
                <div><Label htmlFor="pet-name">Name</Label><Input id="pet-name" value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Bella" required /></div>
                <div>
                  <Label htmlFor="pet-species">Species</Label>
                  <Select value={petSpecies} onValueChange={setPetSpecies}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dog">Dog</SelectItem><SelectItem value="cat">Cat</SelectItem></SelectContent></Select>
                </div>
                <div><Label htmlFor="pet-breed">Breed (optional)</Label><Input id="pet-breed" value={petBreed} onChange={(e) => setPetBreed(e.target.value)} placeholder="e.g. Golden Retriever" /></div>
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
                  </div>
                ) : (
                  <CardContent className="pt-6">
                    <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center mb-4"><Image className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">No portrait yet</p></div>
                    <h3 className="font-semibold">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">{pet.breed || pet.species}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
