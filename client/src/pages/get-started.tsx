import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { CreateCommunityWizard } from "@/components/create-community-wizard";

export default function GetStarted() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, session } = useAuth();
  const queryClient = useQueryClient();
  const token = session?.access_token;

  if (!isLoading && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif font-bold">Register Your Community</h1>
          <p className="text-muted-foreground mt-2">Set up Pawtrait Communities for your residents in minutes.</p>
        </div>
        {token && (
          <CreateCommunityWizard
            token={token}
            onSuccess={() => { setLocation("/dashboard"); }}
            onCancel={() => setLocation("/")}
            selfService
          />
        )}
      </div>
    </div>
  );
}
