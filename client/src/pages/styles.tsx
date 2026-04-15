import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dog, Cat } from "lucide-react";
import { portraitStyles, stylePreviewImages, getStylesBySpecies, getStyleCategoriesBySpecies } from "@/lib/portrait-styles";
import { useState } from "react";

export default function Styles() {
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const styles = getStylesBySpecies(species);
  const categories = getStyleCategoriesBySpecies(species);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const filtered = selectedCategory ? styles.filter(s => s.category === selectedCategory) : styles;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h1 className="font-serif font-bold text-2xl mb-6">All Portrait Styles</h1>
        <div className="flex justify-center mb-6">
          <Tabs value={species} onValueChange={(v) => { setSpecies(v as "dog" | "cat"); setSelectedCategory(null); }}>
            <TabsList>
              <TabsTrigger value="dog"><Dog className="h-4 w-4 mr-1" />Dogs ({getStylesBySpecies("dog").length})</TabsTrigger>
              <TabsTrigger value="cat"><Cat className="h-4 w-4 mr-1" />Cats ({getStylesBySpecies("cat").length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Button variant={selectedCategory === null ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
          {categories.map(cat => (
            <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {filtered.map((style) => {
            const previewUrl = stylePreviewImages[style.name];
            return (
              <div key={style.id} className="rounded-lg overflow-hidden border bg-card group">
                <div className="aspect-square relative">
                  {previewUrl ? (
                    <img src={previewUrl} alt={style.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" draggable={false} />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      {species === "dog" ? <Dog className="h-8 w-8 text-muted-foreground" /> : <Cat className="h-8 w-8 text-muted-foreground" />}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm">{style.name}</h3>
                  <p className="text-xs text-muted-foreground">{style.description}</p>
                  <span className="inline-block mt-1 text-xs bg-muted px-2 py-0.5 rounded">{style.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
