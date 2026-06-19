import { RoomManager } from "@/components/RoomManager";

export default function RoomPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">Room</h1>
      <RoomManager />
    </div>
  );
}
