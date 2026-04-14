import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Heart, Sparkles, Dog, Camera, Users, Image } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 font-serif text-2xl font-bold text-primary">
            <Dog className="h-6 w-6" />
            Pawtrait Communities
          </Link>
          <nav className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <Button asChild>
                <Link href="/dashboard">My Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Pet Portraits</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Beautiful Pet Portraits{" "}
              <span className="text-primary">for Your Community</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload a photo of your pet, choose a style, and get a stunning AI-generated portrait.
              Browse your community gallery, vote for favorites, and order keepsakes.
            </p>
            {isAuthenticated ? (
              <Button size="lg" className="gap-2" asChild>
                <Link href="/dashboard">
                  <Image className="h-5 w-5" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="gap-2" asChild>
                  <Link href="/join">
                    <Sparkles className="h-5 w-5" />
                    Join Your Community
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps to a stunning portrait of your pet.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, title: "Join", description: "Enter your community code and create an account." },
              { icon: Camera, title: "Upload", description: "Add your pet and upload a photo." },
              { icon: Sparkles, title: "Generate", description: "Pick a style and watch AI create a masterpiece." },
              { icon: Heart, title: "Share & Vote", description: "Browse the gallery and vote for your favorites." },
            ].map((step, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-sm text-primary font-medium mb-2">Step {index + 1}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Ask your HOA for your community code and join today.
          </p>
          <Button size="lg" variant="secondary" className="gap-2" asChild>
            <Link href="/join">
              <Sparkles className="h-5 w-5" />
              Join Your Community
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
