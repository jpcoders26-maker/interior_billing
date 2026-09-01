"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-lg font-semibold text-slate-900">Something went wrong</p>
        <p className="text-sm text-slate-500 mt-2">
          An unexpected error occurred. It&apos;s been logged — please try again.
        </p>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
