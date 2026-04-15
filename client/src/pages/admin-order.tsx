import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingBag, Loader2, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Product { key: string; name: string; variants: Array<{ id: number; name: string; wholesaleCostCents: number }> }

export default function AdminOrder() {
  const [, setLocation] = useLocation();
  const { isAdmin, isAuthenticated, isLoading: authLoading, session } = useAuth();
  const { toast } = useToast();
  const token = session?.access_token;

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedPortraitId, setSelectedPortraitId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [orderResult, setOrderResult] = useState<any>(null);

  const [shipping, setShipping] = useState({
    name: "Stefanie Zucker", street: "119 Colemans Bluff Drive",
    city: "Woodstock", state: "GA", zip: "30188", country: "US",
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["/api/admin/communities"],
    queryFn: async () => { const r = await fetch("/api/admin/communities", { headers: { Authorization: `Bearer ${token}` } }); return r.ok ? r.json() : []; },
    enabled: !!token && isAdmin,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/merch/products"],
    queryFn: async () => { const r = await fetch("/api/merch/products"); return r.ok ? r.json() : []; },
  });

  // Get portraits for selected community
  const { data: portraits = [] } = useQuery({
    queryKey: ["/api/admin/portraits", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const r = await fetch(`/api/communities/${communities.find((c: any) => String(c.id) === selectedOrgId)?.slug}/gallery`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      const data = await r.json();
      return data.portraits || [];
    },
    enabled: !!token && !!selectedOrgId,
  });

  const currentProduct = products.find(p => p.key === selectedProduct);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/merch/order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          portraitId: parseInt(selectedPortraitId),
          orgId: parseInt(selectedOrgId),
          items: [{ productKey: selectedProduct, variantId: selectedVariant ? parseInt(selectedVariant) : undefined, quantity }],
          shipping,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Order failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setOrderResult(data);
      toast({ title: "Order placed!", description: `Printful Order #${data.printfulOrderId || data.orderId}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!authLoading && (!isAuthenticated || !isAdmin)) { setLocation("/login"); return null; }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Check className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-serif font-bold">Order Placed!</h2>
              <p className="text-muted-foreground">Printful Order #{orderResult.printfulOrderId || orderResult.orderId}</p>
              <p className="text-muted-foreground">Status: {orderResult.status}</p>
              <p className="font-medium">Wholesale cost: ${(orderResult.totalWholesaleCents / 100).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">No sales tax. Direct to Printful.</p>
              <div className="flex gap-3 justify-center mt-4">
                <Button onClick={() => { setOrderResult(null); setSelectedProduct(""); setSelectedPortraitId(""); }}>Place Another Order</Button>
                <Button variant="outline" asChild><Link href="/admin">Back to Dashboard</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild><Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-serif font-bold text-xl">Place Direct Order</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Community</Label>
              <Select value={selectedOrgId} onValueChange={(v) => { setSelectedOrgId(v); setSelectedPortraitId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select community" /></SelectTrigger>
                <SelectContent>
                  {communities.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedOrgId && (
              <div>
                <Label>Portrait</Label>
                <Select value={selectedPortraitId} onValueChange={setSelectedPortraitId}>
                  <SelectTrigger><SelectValue placeholder="Select portrait" /></SelectTrigger>
                  <SelectContent>
                    {portraits.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.dog_name} — {p.style_name || `Portrait #${p.id}`}</SelectItem>)}
                  </SelectContent>
                </Select>
                {portraits.length === 0 && <p className="text-xs text-muted-foreground mt-1">No portraits in this community yet.</p>}
              </div>
            )}

            <div>
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setSelectedVariant(""); }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {currentProduct && currentProduct.variants.length > 1 && (
              <div>
                <Label>Variant</Label>
                <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                  <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                  <SelectContent>
                    {currentProduct.variants.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name} — ${(v.wholesaleCostCents / 100).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} max={10} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h3 className="font-semibold text-sm">Shipping</h3>
              <Input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} placeholder="Name" />
              <Input value={shipping.street} onChange={(e) => setShipping({ ...shipping, street: e.target.value })} placeholder="Street" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} placeholder="City" />
                <Input value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} placeholder="State" maxLength={2} />
                <Input value={shipping.zip} onChange={(e) => setShipping({ ...shipping, zip: e.target.value })} placeholder="Zip" />
              </div>
            </div>

            <Button
              className="w-full gap-2"
              disabled={!selectedOrgId || !selectedPortraitId || !selectedProduct || orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
            >
              {orderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              {orderMutation.isPending ? "Placing Order..." : "Place Order (Wholesale)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
