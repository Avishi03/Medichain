import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🔗</div>
        <h1 className="text-4xl font-black text-primary mb-3">404</h1>
        <h2 className="text-2xl font-bold text-text-primary mb-4">Page Not Found</h2>
        <p className="text-text-secondary mb-8 max-w-sm mx-auto text-sm">
          This block doesn&apos;t exist in the chain. Navigate back to safety.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">Go Home</Link>
          <Link href="/verify" className="btn-secondary">Verify Medicine</Link>
        </div>
      </div>
    </div>
  );
}
