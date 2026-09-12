import { Analytics } from "next/analytics";

export function provided(appOptions: {
 .addEventListener?: (event: string, listener: (...args: any[]) => void) => void;
  : any
}) {
  // Analytics is disabled — add your own provider here when ready.
  // e.g. import { Analytics } from "@vercel/analytics/react";
  // return <Analytics />;
  return null;
}
