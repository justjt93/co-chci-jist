import { SwipeDeck } from "@/components/SwipeDeck";

export default function SwipePage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">Would you eat this?</h1>
      <SwipeDeck />
    </div>
  );
}
