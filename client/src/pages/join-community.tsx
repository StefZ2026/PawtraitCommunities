import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dog, Cat, CheckCircle, Camera, Upload, ArrowLeft, ArrowRight, Sparkles, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type WizardStep = "code" | "account" | "name" | "home" | "contact" | "petCount" | "petDetail" | "household" | "homeTaken" | "nameConfirm" | "done";

export default function JoinCommunity() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, session } = useAuth();
  const { toast } = useToast();
  const token = session?.access_token;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("code");
  const [loading, setLoading] = useState(false);

  // Code step
  const [communityCode, setCommunityCode] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [communitySlug, setCommunitySlug] = useState("");

  // Name step
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Home step
  const [homeNumber, setHomeNumber] = useState("");

  // Contact step
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Pet count step
  const [petCount, setPetCount] = useState(1);

  // Pet details (array for multiple pets)
  const [pets, setPets] = useState<Array<{ name: string; species: string; breed: string; photo: string | null }>>([]);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);

  // Household name
  const [householdName, setHouseholdName] = useState("");

  // Name confirmation (when admin-entered name differs from what resident typed)
  const [existingName, setExistingName] = useState("");
  const [newName, setNewName] = useState("");

  // Account creation state
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Pre-fill code from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) setCommunityCode(code.toUpperCase());
  }, []);

  async function validateCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/communities/validate-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: communityCode.trim() }),
      });
      const data = await res.json();
      if (!data.valid) {
        toast({ title: "Hmm, that code doesn't look right", description: "Check with your community manager for the correct code.", variant: "destructive" });
        return;
      }
      setCommunityName(data.communityName);
      setCommunityId(data.communityId);
      // If already logged in, skip account creation
      if (isAuthenticated) {
        setStep("name");
      } else {
        setStep("account");
      }
    } catch { toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" }); }
    finally { setLoading(false); }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountEmail || !accountPassword) return;
    setLoading(true);
    try {
      // Create account via server (bypasses Supabase email rate limits)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, password: accountPassword, firstName: "", lastName: "", acceptedTerms: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      // Log them in immediately
      const { error } = await supabase.auth.signInWithPassword({ email: accountEmail, password: accountPassword });
      if (error) throw error;

      // Pre-fill email in contact step
      setEmail(accountEmail);
      setStep("name");
    } catch (error: any) {
      // If account already exists, try logging in
      if (error.message?.includes("already") || error.message?.includes("exists")) {
        try {
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email: accountEmail, password: accountPassword });
          if (loginErr) throw loginErr;
          setEmail(accountEmail);
          setStep("name");
          return;
        } catch {
          toast({ title: "Account already exists", description: "That email is already registered. Check your password and try again.", variant: "destructive" });
          return;
        }
      }
      toast({ title: "Couldn't create account", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  function initPets() {
    const arr = [];
    for (let i = 0; i < petCount; i++) {
      arr.push({ name: "", species: "dog", breed: "", photo: null });
    }
    setPets(arr);
    setCurrentPetIndex(0);
    setStep("petDetail");
  }

  function updateCurrentPet(field: string, value: string | null) {
    const updated = [...pets];
    (updated[currentPetIndex] as any)[field] = value;
    setPets(updated);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateCurrentPet("photo", reader.result as string);
    reader.readAsDataURL(file);
  }

  function nextPetOrHousehold() {
    if (currentPetIndex < pets.length - 1) {
      setCurrentPetIndex(currentPetIndex + 1);
    } else {
      // Generate default household name
      setHouseholdName(`The ${lastName} Family Pets`);
      setStep("household");
    }
  }

  async function finishSetup(confirmedName?: string) {
    setLoading(true);
    try {
      // Register as resident
      const regRes = await fetch("/api/communities/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          communityCode: communityCode.trim(),
          homeNumber: homeNumber.trim(),
          displayName: confirmedName || householdName || `${firstName} ${lastName}`,
          phone: phone.trim() || null,
          confirmMatch: !!confirmedName,
        }),
      });
      const regData = await regRes.json();

      // Name mismatch — ask which is correct
      if (regData.needsConfirmation) {
        setExistingName(regData.existingName);
        setNewName(regData.newName);
        setStep("nameConfirm");
        setLoading(false);
        return;
      }

      if (regRes.status === 409 && regData.error === "home_number_taken") {
        setStep("homeTaken");
        setLoading(false);
        return;
      }
      if (!regRes.ok) throw new Error(regData.message || regData.error || "Registration failed");
      setCommunitySlug(regData.communitySlug);

      // Add each pet
      for (const pet of pets) {
        if (!pet.name) continue;
        await fetch("/api/my-pets", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: pet.name,
            species: pet.species,
            breed: pet.breed || null,
            originalPhotoUrl: pet.photo,
          }),
        });
      }

      setStep("done");
    } catch (err: any) {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  const currentPet = pets[currentPetIndex];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Dog className="h-10 w-10 mx-auto mb-2 text-primary" />
          {step === "code" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Join Your Community</h1>
              <p className="text-sm text-muted-foreground">Enter the code your community provided</p>
            </>
          )}
          {step === "account" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Welcome to {communityName}!</h1>
              <p className="text-sm text-muted-foreground">Create your account to get started</p>
            </>
          )}
          {step === "name" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Welcome to {communityName}!</h1>
              <p className="text-sm text-muted-foreground">Let's get you set up. First, what's your name?</p>
            </>
          )}
          {step === "home" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Hi, {firstName}!</h1>
              <p className="text-sm text-muted-foreground">What's your home or unit number?</p>
            </>
          )}
          {step === "contact" && (
            <>
              <h1 className="text-2xl font-serif font-bold">How can we reach you?</h1>
              <p className="text-sm text-muted-foreground">We'll only use this for portrait notifications</p>
            </>
          )}
          {step === "petCount" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Now the fun part!</h1>
              <p className="text-sm text-muted-foreground">How many pets do you have?</p>
            </>
          )}
          {step === "petDetail" && currentPet && (
            <>
              <h1 className="text-2xl font-serif font-bold">
                Tell us about {currentPetIndex === 0 ? "your pet" : `pet #${currentPetIndex + 1}`}
                {pets.length > 1 && <span className="text-sm font-normal text-muted-foreground ml-2">({currentPetIndex + 1} of {pets.length})</span>}
              </h1>
              <p className="text-sm text-muted-foreground">We'll use this info to create their portrait</p>
            </>
          )}
          {step === "household" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Almost done!</h1>
              <p className="text-sm text-muted-foreground">What should we call your household?</p>
            </>
          )}
          {step === "nameConfirm" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Quick Question</h1>
              <p className="text-sm text-muted-foreground">We have your name spelled two ways</p>
            </>
          )}
          {step === "homeTaken" && (
            <>
              <h1 className="text-2xl font-serif font-bold">Just a Moment</h1>
              <p className="text-sm text-muted-foreground">We need to check something with your community manager</p>
            </>
          )}
          {step === "done" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <h1 className="text-2xl font-serif font-bold">You're all set!</h1>
            </>
          )}
        </CardHeader>
        <CardContent>

          {/* Code Step */}
          {step === "code" && (
            <form onSubmit={(e) => { e.preventDefault(); validateCode(); }} className="space-y-4">
              <Input
                value={communityCode}
                onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
                placeholder="e.g. SOLEIL-26"
                className="text-center text-lg tracking-wider"
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking..." : "Continue"}
              </Button>
            </form>
          )}

          {/* Account Step — create account inline, no redirect to /login */}
          {step === "account" && (
            <form onSubmit={createAccount} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="text-lg h-12"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">We'll use this to keep your account safe</p>
              </div>
              <div>
                <Label>Create a Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="text-lg h-12"
                    required
                    minLength={6}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our <a href="/terms" className="text-primary hover:underline" target="_blank">Terms</a> and <a href="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</a>
              </p>
              <Button type="submit" className="w-full h-12 text-base" disabled={loading || !accountEmail || accountPassword.length < 6}>
                {loading ? "Creating account..." : "Continue"}
              </Button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Already have an account? Just enter your email and password above — we'll log you in.</p>
              </div>
              <Button variant="outline" className="w-full gap-1" onClick={() => setStep("code")} type="button">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
            </form>
          )}

          {/* Name Step */}
          {step === "name" && (
            <div className="space-y-4">
              <div>
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Sarah" autoFocus />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Jones" />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("code")} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
                <Button onClick={() => setStep("home")} disabled={!firstName.trim() || !lastName.trim()} className="gap-1">Next<ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Home Step */}
          {step === "home" && (
            <div className="space-y-4">
              <div>
                <Label>Home / Unit Number</Label>
                <Input value={homeNumber} onChange={(e) => setHomeNumber(e.target.value)} placeholder="e.g. 147 or Unit B" autoFocus />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("name")} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
                <Button onClick={() => setStep("contact")} disabled={!homeNumber.trim()} className="gap-1">Next<ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Contact Step */}
          {step === "contact" && (
            <div className="space-y-4">
              <div>
                <Label>Cell Phone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567 or any format" />
                <p className="text-xs text-muted-foreground mt-1">We'll text you when your portrait is ready</p>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="barbara@email.com" />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("home")} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
                <Button onClick={() => setStep("petCount")} className="gap-1">Next<ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Pet Count Step */}
          {step === "petCount" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setPetCount(Math.max(1, petCount - 1))} disabled={petCount <= 1}>-</Button>
                <span className="text-4xl font-bold text-primary w-16 text-center">{petCount}</span>
                <Button variant="outline" size="icon" onClick={() => setPetCount(Math.min(10, petCount + 1))}>+</Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {petCount === 1 ? "1 pet" : `${petCount} pets`} — we'll ask about each one
              </p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("contact")} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
                <Button onClick={initPets} className="gap-1">Next<ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Pet Detail Step (repeats for each pet) */}
          {step === "petDetail" && currentPet && (
            <div className="space-y-4">
              <div>
                <Label>Dog or cat?</Label>
                <div className="flex gap-3 mt-1">
                  <Button type="button" size="lg" variant={currentPet.species === "dog" ? "default" : "outline"} className="flex-1 gap-2 text-lg h-14" onClick={() => updateCurrentPet("species", "dog")}>
                    <Dog className="h-6 w-6" />Dog
                  </Button>
                  <Button type="button" size="lg" variant={currentPet.species === "cat" ? "default" : "outline"} className="flex-1 gap-2 text-lg h-14" onClick={() => updateCurrentPet("species", "cat")}>
                    <Cat className="h-6 w-6" />Cat
                  </Button>
                </div>
              </div>
              <div>
                <Label>What's your {currentPet.species}'s name?</Label>
                <Input value={currentPet.name} onChange={(e) => updateCurrentPet("name", e.target.value)} placeholder={currentPet.species === "cat" ? "e.g. Whiskers" : "e.g. Buddy"} className="text-lg h-12" />
              </div>
              <div>
                <Label>What breed is {currentPet.name || `your ${currentPet.species}`}? (optional)</Label>
                <Input value={currentPet.breed} onChange={(e) => updateCurrentPet("breed", e.target.value)} placeholder={currentPet.species === "cat" ? "e.g. Siamese" : "e.g. Golden Retriever"} className="text-lg h-12" />
              </div>
              <div>
                <Label>Photo</Label>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                {currentPet.photo ? (
                  <div className="relative">
                    <img src={currentPet.photo} alt="Pet" className="w-full h-48 object-cover rounded-lg" />
                    <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => { updateCurrentPet("photo", null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Change</Button>
                  </div>
                ) : (
                  <div>
                    <Button type="button" variant="outline" className="w-full h-32 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload a photo</span>
                    </Button>
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Tips for the best portrait:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>Choose a well-lit photo</li>
                        <li>Just one pet in the picture</li>
                        <li>Facing forward works best</li>
                        <li>Don't have one handy? You can add it later!</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => {
                  if (currentPetIndex > 0) setCurrentPetIndex(currentPetIndex - 1);
                  else setStep("petCount");
                }} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
                <Button onClick={nextPetOrHousehold} disabled={!currentPet.name.trim()} className="gap-1">
                  {currentPetIndex < pets.length - 1 ? "Next Pet" : "Almost Done"}<ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Household Name Step */}
          {step === "household" && (
            <div className="space-y-4">
              <div>
                <Label>What should we call your household?</Label>
                <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} autoFocus />
                <p className="text-xs text-muted-foreground mt-1">This is what shows on your dashboard</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Here's what we have:</p>
                <p>{firstName} {lastName} · Home #{homeNumber}</p>
                <p>{pets.filter(p => p.name).map(p => p.name).join(", ")}</p>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setCurrentPetIndex(pets.length - 1); setStep("petDetail"); }} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
                <Button onClick={finishSetup} disabled={loading || !householdName.trim()} className="gap-2">
                  {loading ? "Setting up..." : <><Sparkles className="h-4 w-4" />Let's Go!</>}
                </Button>
              </div>
            </div>
          )}

          {/* Name Confirmation Step — admin entered name differs from what resident typed */}
          {step === "nameConfirm" && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Your community manager has you as one name, but you entered another. Which is correct?
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-14 text-lg justify-start px-6"
                  onClick={() => finishSetup(existingName)}
                  disabled={loading}
                >
                  <CheckCircle className="h-5 w-5 mr-3 text-primary" />
                  {existingName}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-14 text-lg justify-start px-6"
                  onClick={() => finishSetup(newName)}
                  disabled={loading}
                >
                  <CheckCircle className="h-5 w-5 mr-3 text-primary" />
                  {newName}
                </Button>
              </div>
              {loading && <p className="text-center text-sm text-muted-foreground">Setting up your account...</p>}
            </div>
          )}

          {/* Home Number Taken Step */}
          {step === "homeTaken" && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-medium mb-2">Are you a new resident at this address?</p>
                <p className="text-amber-700 text-sm">
                  It looks like home #{homeNumber} already has a registered resident. We take extra care when it comes to your fur-babies' pictures!
                </p>
                <p className="text-amber-700 text-sm mt-2">
                  We're going to send a quick note to your community manager to make sure the previous resident's records are safely archived. We'll get you signed up as soon as we hear back from them.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your community manager will be notified and you'll be able to complete signup once they confirm. This usually takes less than a day.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setStep("home")}>
                Go Back — Try a Different Home Number
              </Button>
            </div>
          )}

          {/* Done Step */}
          {step === "done" && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Welcome to {communityName}, {firstName}! Your pets are ready for their portraits.
              </p>
              <Button className="w-full gap-2" onClick={() => setLocation("/dashboard")}>
                <Sparkles className="h-4 w-4" />Go to My Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
