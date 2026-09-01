import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900">Page not found</p>
        <p className="text-sm text-slate-500 mt-2">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold"
        >
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
