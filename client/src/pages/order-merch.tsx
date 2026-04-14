import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingBag, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Product {
  key: string;
  name: string;
  variants: Array<{ id: number; name: string; retailPriceCents: number }>;
}

export default function OrderMerch() {
  const { portraitId } = useParams<{ portraitId: string }>();
  const [, setLocation] = useLocation();
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const token = session?.access_token;

  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [orderStatus, setOrderStatus] = useState<"form" | "confirming" | "complete" | "failed">("form");

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/merch/products"],
    queryFn: async () => {
      const res = await fetch("/api/merch/products");
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");
    const canceled = params.get("canceled");

    if (canceled) {
      toast({ title: "Order canceled", description: "Your order was not placed.", variant: "destructive" });
      return;
    }

    if (success && sessionId) {
      setOrderStatus("confirming");
      fetch("/api/merch/confirm-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.orderId) {
            setOrderStatus("complete");
            toast({ title: "Order confirmed!", description: "Your keepsake is being prepared." });
          } else {
            setOrderStatus("failed");
            toast({ title: "Error", description: data.error || "Failed to confirm order", variant: "destructive" });
          }
        })
        .catch(() => {
          setOrderStatus("failed");
          toast({ title: "Error", description: "Failed to confirm order", variant: "destructive" });
        });
    }
  }, []);

  const currentProduct = products?.find(p => p.key === selectedProduct);
  const currentVariant = currentProduct?.variants.find(v => v.id === selectedVariant) || currentProduct?.variants[0];
  const totalCents = currentVariant ? currentVariant.retailPriceCents * quantity : 0;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          portraitId: parseInt(portraitId),
          productKey: selectedProduct,
          variantId: selectedVariant || currentProduct?.variants[0]?.id,
          quantity,
          shipping: { name, email, street, city, state, zip, country: "US" },
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Checkout failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }

  if (orderStatus === "confirming") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-serif font-bold mb-2">Confirming your order...</h2>
            <p className="text-muted-foreground">Verifying payment and submitting to fulfillment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderStatus === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-serif font-bold mb-2">Order Placed!</h2>
            <p className="text-muted-foreground mb-6">Your keepsake is being prepared. You'll receive tracking info by email.</p>
            <div className="flex gap-3 justify-center">
              <Button asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderStatus === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <h2 className="text-xl font-serif font-bold mb-2 text-destructive">Order Failed</h2>
            <p className="text-muted-foreground mb-6">Something went wrong confirming your order. Your payment may still be processing — please contact us if charged.</p>
            <Button asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-serif font-bold text-lg">Order a Keepsake</h1>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); checkoutMutation.mutate(); }} className="space-y-6">
          {/* Product selection */}
          <div>
            <Label>Product</Label>
            <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setSelectedVariant(null); }}>
              <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
              <SelectContent>
                {products?.map(p => (
                  <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variant selection */}
          {currentProduct && currentProduct.variants.length > 1 && (
            <div>
              <Label>Option</Label>
              <Select value={String(selectedVariant || currentProduct.variants[0].id)} onValueChange={(v) => setSelectedVariant(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currentProduct.variants.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name} — ${(v.retailPriceCents / 100).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <Label>Quantity</Label>
            <Input type="number" min={1} max={10} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
          </div>

          {/* Shipping */}
          <div className="space-y-3">
            <h3 className="font-semibold">Shipping Address</h3>
            <div><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Street Address</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} required /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} required /></div>
              <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} required maxLength={2} placeholder="GA" /></div>
              <div><Label>Zip</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} required maxLength={10} /></div>
            </div>
          </div>

          {/* Total */}
          {totalCents > 0 && (
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">${(totalCents / 100).toFixed(2)}</span>
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={!selectedProduct || !name || !street || !city || !state || !zip || checkoutMutation.isPending}>
            {checkoutMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Redirecting to checkout...</> : <><ShoppingBag className="h-4 w-4" />Proceed to Checkout</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground">You'll be redirected to Stripe for secure payment.</p>
        </form>
      </div>
    </div>
  );
}
