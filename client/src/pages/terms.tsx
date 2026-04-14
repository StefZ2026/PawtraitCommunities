export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-serif font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
        <p><strong>Effective Date:</strong> April 2026</p>
        <p>By using Pawtrait Communities, a product of Pawtrait Pals LLC, you agree to these Terms of Service.</p>
        <h2 className="text-xl font-semibold text-foreground">Service Description</h2>
        <p>Pawtrait Communities provides AI-powered pet portrait generation for residential communities. Residents can upload pet photos, generate AI portraits, browse a community gallery, and vote for favorites.</p>
        <h2 className="text-xl font-semibold text-foreground">User Responsibilities</h2>
        <ul className="list-disc pl-6">
          <li>You must provide accurate community and contact information</li>
          <li>You may only upload photos of pets you own or have permission to photograph</li>
          <li>Generated portraits may be displayed in the community gallery unless you opt out</li>
        </ul>
        <h2 className="text-xl font-semibold text-foreground">Contact</h2>
        <p>Pawtrait Pals LLC, 119 Colemans Bluff Drive, Woodstock, GA 30188</p>
      </div>
    </div>
  );
}
