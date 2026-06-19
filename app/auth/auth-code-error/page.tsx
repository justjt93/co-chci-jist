import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="text-lg font-semibold">Sign-in didn&apos;t complete</h1>
      <p className="mt-2 text-sm text-muted">
        The Google sign-in couldn&apos;t be finished. You can keep using the app
        as a guest, or try again.
      </p>
      <Link
        href="/room"
        className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        Back to room
      </Link>
    </div>
  );
}
