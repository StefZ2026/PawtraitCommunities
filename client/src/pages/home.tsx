import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Heart, Sparkles, Dog, Cat, Camera, Users, Image,
  ShoppingBag, Palette, ArrowRight, LayoutDashboard, LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const STYLE_PREVIEWS = [
  { name: "Baroque Aristocrat", src: "/images/styles/baroque-aristocrat.jpg" },
  { name: "Beach Day", src: "/images/styles/beach-day.jpg" },
  { name: "Steampunk Explorer", src: "/images/styles/steampunk-explorer.jpg" },
  { name: "Sleepover Party", src: "/images/styles/sleepover-party.jpg" },
  { name: "Purrista Barista", src: "/images/styles/purrista-barista.jpg" },
  { name: "Cozy Cabin", src: "/images/styles/cozy-cabin.jpg" },
  { name: "Space Explorer", src: "/images/styles/space-explorer.jpg" },
  { name: "Victorian Lady", src: "/images/styles/victorian-lady.jpg" },
];

export default function Home() {
  const { isAuthenticated, isLoading, logout, isLoggingOut } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 font-serif text-2xl font-bold text-primary">
            <span className="flex items-center gap-0.5"><Dog className="h-6 w-6" /><Cat className="h-6 w-6" /></span>
            Pawtrait Communities
          </Link>
          <nav className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <>
                <Button variant="ghost" className="gap-2" asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => logout()} disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
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
      <section className="relative pt-32 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Pet Portraits for Your Community</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Your Pet. Your Style.{" "}
              <span className="text-primary">Your Community.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload a photo of your pet, choose from 40+ stunning AI styles, and watch the magic happen.
              Vote for your favorites in the community gallery and order beautiful keepsakes.
            </p>
            {isAuthenticated ? (
              <Button size="lg" className="gap-2" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
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

      {/* Portrait Showcase */}
      <section className="pt-8 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Stunning AI Portraits</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From Renaissance masterpieces to holiday favorites — 40+ styles your neighbors will love
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {STYLE_PREVIEWS.map((item) => (
              <div key={item.name} className="aspect-square rounded-lg overflow-hidden relative group protected-image-wrapper">
                <img
                  src={item.src}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 protected-image"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-medium">{item.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps — under a minute from photo to portrait.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, title: "Join", description: "Enter your community code and create a free account." },
              { icon: Camera, title: "Upload", description: "Add your pet's photo — any breed, any pose." },
              { icon: Sparkles, title: "Generate", description: "Pick a style and watch AI create a masterpiece." },
              { icon: Heart, title: "Vote & Share", description: "Browse the gallery, vote for favorites, share on social." },
            ].map((step, index) => (
              <Card key={index} className="text-center hover-elevate">
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

      {/* Keepsakes / Merch */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Order Beautiful Keepsakes</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Turn your pet's AI portrait into something you can hold.
              Framed prints for the wall, mugs for your morning coffee, and more.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: "Framed Prints", desc: "3 sizes, 3 frame colors" },
              { name: "Mugs", desc: "11oz & 15oz ceramic" },
              { name: "Tote Bags", desc: "Natural canvas" },
              { name: "Greeting Cards", desc: "Holidays & occasions" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 bg-card border rounded-lg px-5 py-3">
                <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Gallery Preview */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Your Community Gallery</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Every portrait joins your community gallery. Vote for your favorites —
            the most-loved portraits get featured on the quarterly Pet Wall!
          </p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">Vote</p>
              <p className="text-xs text-muted-foreground">Heart your favorites</p>
            </div>
            <div className="text-center">
              <Palette className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">40+ Styles</p>
              <p className="text-xs text-muted-foreground">New styles added regularly</p>
            </div>
            <div className="text-center">
              <Image className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">Pet Wall</p>
              <p className="text-xs text-muted-foreground">Quarterly top 20 showcase</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to See Your Pet as a Masterpiece?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Ask your HOA for your community code and join today.
            It's free for residents — your community subscription covers everything.
          </p>
          {isAuthenticated ? (
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/join">
                <Sparkles className="h-5 w-5" />
                Join Your Community
              </Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
