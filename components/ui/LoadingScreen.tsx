"use client";

import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        <div className="h-16 w-16 rounded-full border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
        <Loader2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse absolute" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
        {message}
      </p>
    </div>
  );
}
