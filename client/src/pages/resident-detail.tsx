import { useLocation, Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Dog, Cat, Image, Heart, Mail, Phone, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ResidentDetail() {
  const { orgId, residentId } = useParams<{ orgId: string; residentId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();
  const token = session?.access_token;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/community/resident", orgId, residentId],
    queryFn: async () => {
      const res = await fetch(`/api/community/${orgId}/residents/${residentId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!token,
  });

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }
  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Resident not found</p></div>;

  const { resident, pets } = data;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" className="gap-1 mb-4" asChild>
          <Link href={`/community/${orgId}`}><ArrowLeft className="h-4 w-4" />Back to Community</Link>
        </Button>

        {/* Resident Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif font-bold text-2xl">{resident.display_name || `Home #${resident.home_number}`}</h1>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><HomeIcon className="h-4 w-4" />Home #{resident.home_number}</span>
                  {resident.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{resident.email}</span>}
                  {resident.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{resident.phone}</span>}
                </div>
              </div>
              <Badge variant={resident.role === "admin" ? "default" : "secondary"}>
                {resident.role === "admin" ? "Manager" : "Resident"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Joined {new Date(resident.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        {/* Pets */}
        <h2 className="font-serif font-bold text-xl mb-4">
          {pets.length === 0 ? "No Pets Yet" : `${pets.length} Pet${pets.length !== 1 ? "s" : ""}`}
        </h2>

        {pets.length === 0 ? (
          <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground">This resident hasn't added any pets yet.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pets.map((pet: any) => (
              <Card key={pet.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Pet photo or placeholder */}
                  <div className="aspect-video bg-muted relative">
                    {pet.original_photo_url ? (
                      <img src={pet.original_photo_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {pet.species === "cat" ? <Cat className="h-12 w-12 text-muted-foreground" /> : <Dog className="h-12 w-12 text-muted-foreground" />}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">{pet.breed || pet.species}</p>

                    {/* Portraits */}
                    {pet.portraits && pet.portraits.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">{pet.portraits.length} Portrait{pet.portraits.length !== 1 ? "s" : ""}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {pet.portraits.filter((p: any) => p.generatedImageUrl).map((portrait: any) => (
                            <div key={portrait.id} className="aspect-square rounded-lg overflow-hidden relative">
                              <img src={portrait.generatedImageUrl} alt="Portrait" className="w-full h-full object-cover" />
                              {portrait.likeCount > 0 && (
                                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Heart className="h-3 w-3 fill-red-400 text-red-400" />{portrait.likeCount}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">No portraits generated yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
