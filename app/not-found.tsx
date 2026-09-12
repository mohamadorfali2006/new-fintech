import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl font-bold text-gray-200 dark:text-gray-700" aria-hidden="true">
        404
      </p>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The page you are looking for does not exist or was moved.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="h-9 inline-flex items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Go home
        </Link>
        <Link
          href="/transactions"
          className="h-9 inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
        >
          View transactions
        </Link>
      </div>
    </main>
  );
}
