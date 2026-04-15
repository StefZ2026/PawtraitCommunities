import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dog, Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Gallery() {
  const { slug } = useParams<{ slug: string }>();
  const { session, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<"likes" | "newest">("likes");
  const token = session?.access_token;

  const { data: gallery, isLoading } = useQuery({
    queryKey: ["/api/communities", slug, "gallery", sort],
    queryFn: async () => {
      const res = await fetch(`/api/communities/${slug}/gallery?sort=${sort}&limit=100`);
      if (!res.ok) throw new Error("Failed to load gallery");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: myLikes } = useQuery({
    queryKey: ["/api/my-likes"],
    queryFn: async () => {
      const res = await fetch("/api/my-likes", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { likedPortraitIds: [] };
      return res.json();
    },
    enabled: !!token,
  });

  const likedSet = new Set(myLikes?.likedPortraitIds || []);

  const likeMutation = useMutation({
    mutationFn: async (portraitId: number) => {
      const res = await fetch(`/api/portraits/${portraitId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities", slug, "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-likes"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 h-12 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <span className="font-serif font-bold text-sm">{gallery?.communityName || "Community"} Gallery</span>
            <span className="text-xs text-muted-foreground ml-2">{gallery?.portraits?.length || 0} portraits</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center mb-6">
          <Tabs value={sort} onValueChange={(v) => setSort(v as "likes" | "newest")}>
            <TabsList>
              <TabsTrigger value="likes"><Heart className="h-4 w-4 mr-1" />Most Loved</TabsTrigger>
              <TabsTrigger value="newest">Newest</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />)}</div>
        ) : !gallery?.portraits?.length ? (
          <div className="text-center py-16"><Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h2 className="text-lg font-semibold mb-2">No portraits yet</h2><p className="text-muted-foreground">Be the first to generate a portrait!</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.portraits.map((p: any) => {
              const isLiked = likedSet.has(p.id);
              return (
                <Card key={p.id} className="overflow-hidden group">
                  <div className="aspect-square relative">
                    <img src={p.generated_image_url} alt={`${p.dog_name} - ${p.style_name}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white font-semibold text-sm">{p.dog_name}</p>
                        <p className="text-white/70 text-xs">{p.style_name}</p>
                        {p.owner_name && <p className="text-white/50 text-xs">{p.owner_name}</p>}
                      </div>
                    </div>
                    <button className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors" onClick={() => {
                      if (!isAuthenticated) { toast({ title: "Login required", variant: "destructive" }); return; }
                      likeMutation.mutate(p.id);
                    }} disabled={likeMutation.isPending}>
                      <Heart className={`h-4 w-4 ${isLiked ? "text-red-400 fill-red-400" : "text-white"}`} />
                    </button>
                    {p.like_count > 0 && <div className="absolute bottom-2 left-2 bg-black/50 rounded-full px-2 py-1 flex items-center gap-1"><Heart className="h-3 w-3 text-red-400 fill-red-400" /><span className="text-white text-xs">{p.like_count}</span></div>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
