import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Heart, Sparkles, Dog, Camera, Users, Image,
  ShoppingBag, Palette, LayoutDashboard
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const STYLE_PREVIEWS = [
  { name: "Royal Monarch", src: "/images/styles/royal-monarch.jpg" },
  { name: "Beach Day", src: "/images/styles/beach-day.jpg" },
  { name: "Steampunk Explorer", src: "/images/styles/steampunk-explorer.jpg" },
  { name: "Sleepover Party", src: "/images/styles/sleepover-party.jpg" },
  { name: "Purrista Barista", src: "/images/styles/purrista-barista.jpg" },
  { name: "Cozy Cabin", src: "/images/styles/cozy-cabin.jpg" },
  { name: "Garden Party", src: "/images/styles/garden-party.jpg" },
  { name: "Victorian Lady", src: "/images/styles/victorian-lady.jpg" },
];

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Pet Portraits for Your Community</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Turn Your Residents' Pets Into a{" "}
              <span className="text-primary">Shared Community Experience</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Delight residents with personalized pet portraits, custom keepsakes, and a vibrant community gallery — all with zero operational work for your team.
            </p>
            {!isLoading && isAuthenticated ? (
              <Button size="lg" className="gap-2" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="gap-2" asChild>
                  <Link href="/get-started">
                    <Sparkles className="h-5 w-5" />
                    Get Started Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link href="/join">
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
            <h2 className="text-3xl font-serif font-bold mb-4">Beautiful, Stylized Pet Portraits</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              50+ stunning styles residents will love to display, share, and gift — from Renaissance masterpieces to holiday favorites.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {STYLE_PREVIEWS.map((item) => (
              <div key={item.name} className="aspect-square rounded-lg overflow-hidden relative group">
                <img
                  src={item.src}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link href="/styles">
                <Palette className="h-5 w-5" />
                View All Styles
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Effortless for Everyone</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Simple access codes let residents join in minutes. No apps to download, no training required.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, title: "Join", description: "Residents enter a community code and create a free account." },
              { icon: Camera, title: "Upload", description: "Add a pet photo — any breed, any pose, dogs and cats." },
              { icon: Sparkles, title: "Generate", description: "Pick a style and watch AI create something beautiful." },
              { icon: Heart, title: "Engage", description: "Browse the gallery, vote for favorites, order keepsakes." },
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

      {/* Custom Pet Keepsakes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Custom Pet Keepsakes</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Transform portraits into calendars, framed artwork, and gift-ready products. A portion of every purchase supports your community programs.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: "Framed Prints", desc: "Gallery-quality artwork" },
              { name: "Ceramic Mugs", desc: "11oz & 15oz" },
              { name: "Canvas Totes", desc: "Natural cotton" },
              { name: "iPhone Cases", desc: "All models" },
              { name: "Greeting Cards", desc: "Every occasion" },
              { name: "Custom Calendars", desc: "12-month personalized" },
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

      {/* Community Gallery + Pet Wall */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">A Gallery That Brings Residents Together</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Every portrait joins your community's private gallery. Residents vote for their favorites, sparking friendly competition. Each quarter, the 20 most-loved pets are featured on the community Pet Wall.
          </p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">Vote</p>
              <p className="text-xs text-muted-foreground">Heart your favorites</p>
            </div>
            <div className="text-center">
              <Palette className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">50+ Styles</p>
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
          <h2 className="text-3xl font-serif font-bold mb-4">A Simple Way to Delight Your Residents</h2>
          <p className="text-primary-foreground/80 mb-4 max-w-xl mx-auto text-lg">
            Your residents already love their pets. Pawtrait gives them a meaningful, fun way to celebrate them — together.
          </p>
          <p className="text-primary-foreground/60 mb-8 text-sm">
            Start your 14-day free trial — no credit card required.
          </p>
          {!isLoading && isAuthenticated ? (
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <div className="flex gap-4 justify-center">
              <Button size="lg" variant="secondary" className="gap-2" asChild>
                <Link href="/get-started">
                  <Sparkles className="h-5 w-5" />
                  Get Started Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/join">
                  Join Your Community
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
