import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "pawtrait-communities-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg p-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          We use essential cookies and local storage for authentication and preferences. No advertising or tracking cookies are used.{" "}
          <a href="/privacy" className="text-primary underline">Privacy Policy</a>
        </p>
        <Button onClick={accept} size="sm" className="shrink-0">Got it</Button>
      </div>
    </div>
  );
}
