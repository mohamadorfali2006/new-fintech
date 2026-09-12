import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <LoadingScreen />
    </div>
  );
}
