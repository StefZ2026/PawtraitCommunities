export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-serif font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
        <p><strong>Effective Date:</strong> April 2026</p>
        <p>Pawtrait Communities ("we", "our", "us") is a product of Pawtrait Pals LLC. This Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>
        <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
        <ul className="list-disc pl-6">
          <li>Account information (name, email, community code)</li>
          <li>Pet photos you upload for portrait generation</li>
          <li>AI-generated portrait images</li>
        </ul>
        <h2 className="text-xl font-semibold text-foreground">How We Use Your Information</h2>
        <ul className="list-disc pl-6">
          <li>To generate AI pet portraits</li>
          <li>To display portraits in your community gallery (unless you opt out)</li>
          <li>To communicate with you about your account</li>
        </ul>
        <h2 className="text-xl font-semibold text-foreground">Contact</h2>
        <p>For questions, contact <a href="mailto:stefanie@pawtraitpals.com" className="text-primary hover:underline">stefanie@pawtraitpals.com</a></p>
      </div>
    </div>
  );
}
