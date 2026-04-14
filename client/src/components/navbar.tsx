import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Cat, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { isAuthenticated, isAdmin, isLoading, logout, isLoggingOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary">
          <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>
          Pawtrait Communities
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/styles" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            Styles
          </Link>
          {!isLoading && isAuthenticated && (
            <>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
                Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Badge variant="secondary" className="gap-1 cursor-pointer">
                    <Shield className="h-3 w-3" />Admin
                  </Badge>
                </Link>
              )}
              <Button variant="ghost" size="icon" onClick={() => logout()} disabled={isLoggingOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          {!isLoading && !isAuthenticated && (
            <Button size="sm" asChild>
              <Link href="/login">Log In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
