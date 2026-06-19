import { JoinForm } from "@/components/JoinForm";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinForm code={code.toUpperCase()} />;
}
