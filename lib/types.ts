export type Ingredient = { name: string; measure: string };

export type Meal = {
  id: number;
  name: string;
  category: string | null;
  area: string | null;
  instructions: string | null;
  image_url: string | null;
  youtube_url: string | null;
  tags: string[] | null;
  ingredients: Ingredient[];
  source: string;
};

export type RoomMember = {
  user_id: string;
  display_name: string;
  joined_at: string;
};

export type RoomInfo = {
  id: string;
  code: string;
};

export type Choice = "eat" | "pass";
