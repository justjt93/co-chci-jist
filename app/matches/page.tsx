import { MatchesView } from "@/components/MatchesView";

export default function MatchesPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">What you both want</h1>
      <MatchesView />
    </div>
  );
}
