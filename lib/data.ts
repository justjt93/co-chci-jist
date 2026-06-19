import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoomInfo, RoomMember } from "@/lib/types";

export type ActiveRoom = {
  room: RoomInfo;
  members: RoomMember[];
};

/**
 * The caller's current room (most recently joined) plus its members.
 * Returns null when the user isn't in any room yet.
 */
export async function getActiveRoom(
  supabase: SupabaseClient,
): Promise<ActiveRoom | null> {
  const { data: memberships, error } = await supabase
    .from("room_members")
    .select("room_id, joined_at, rooms(id, code)")
    .order("joined_at", { ascending: false })
    .limit(1);

  if (error || !memberships || memberships.length === 0) return null;

  const row = memberships[0] as unknown as {
    rooms: { id: string; code: string };
  };
  const room: RoomInfo = { id: row.rooms.id, code: row.rooms.code };

  const { data: members } = await supabase
    .from("room_members")
    .select("user_id, display_name, joined_at")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true });

  return { room, members: (members ?? []) as RoomMember[] };
}
