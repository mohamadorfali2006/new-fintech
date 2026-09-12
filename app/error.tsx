"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="text-2xl">!</span>
      </div>
      <div role="alert">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="h-9 inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
        >
          Back to app
        </Link>
      </div>
    </main>
  );
}
