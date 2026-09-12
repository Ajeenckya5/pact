import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="font-display text-4xl tracking-tight">That page is not in this build.</p>
      <p className="mt-3 text-mute">
        GitHub Pages only prerenders known workout and chat URLs. Open Pact from Overview and tap through.
      </p>
      <Link href="/" className="mt-6 inline-block text-acid">
        Back to Overview
      </Link>
    </div>
  );
}
