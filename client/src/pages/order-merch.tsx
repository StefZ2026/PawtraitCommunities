import { useState } from "react";
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
  const [orderComplete, setOrderComplete] = useState(false);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/merch/products"],
    queryFn: async () => {
      const res = await fetch("/api/merch/products");
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const currentProduct = products?.find(p => p.key === selectedProduct);
  const currentVariant = currentProduct?.variants.find(v => v.id === selectedVariant) || currentProduct?.variants[0];
  const totalCents = currentVariant ? currentVariant.retailPriceCents * quantity : 0;

  const orderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/merch/order", {
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Order failed"); }
      return res.json();
    },
    onSuccess: () => {
      setOrderComplete(true);
      toast({ title: "Order placed!", description: "Your keepsake is on its way." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!authLoading && !isAuthenticated) { setLocation("/login"); return null; }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-serif font-bold mb-2">Order Placed!</h2>
            <p className="text-muted-foreground mb-6">Your keepsake is being prepared. You'll receive tracking info by email.</p>
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
        <form onSubmit={(e) => { e.preventDefault(); orderMutation.mutate(); }} className="space-y-6">
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

          {/* Variant selection (if multiple) */}
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

          <Button type="submit" className="w-full gap-2" disabled={!selectedProduct || !name || !street || !city || !state || !zip || orderMutation.isPending}>
            {orderMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Placing Order...</> : <><ShoppingBag className="h-4 w-4" />Place Order</>}
          </Button>
        </form>
      </div>
    </div>
  );
}
