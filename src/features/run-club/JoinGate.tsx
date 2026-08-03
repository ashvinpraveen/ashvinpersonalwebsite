"use client";

import { useState } from "react";
import { normalizeDisplayName, normalizePhone } from "./browser";
import {
  CLUB_SCHEDULE,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PHONE_LENGTH,
} from "./config";
import type { JoinProfileInput } from "./useRunClubProfile";

export default function JoinGate({
  onJoin,
  busy,
}: {
  onJoin: (profile: JoinProfileInput) => Promise<void>;
  busy?: boolean;
}) {
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canJoin =
    Boolean(normalizeDisplayName(nameDraft)) && Boolean(normalizePhone(phoneDraft));

  return (
    <form
      className="max-h-[min(70dvh,34rem)] overflow-y-auto rounded-[24px] border border-white/50 bg-[color:var(--run-panel)] p-5 shadow-[0_18px_50px_rgba(12,40,28,0.18)] sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        void onJoin({ name: nameDraft, phone: phoneDraft }).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not join.");
        });
      }}
    >
      <h2 className="font-[family-name:var(--run-display)] text-2xl sm:text-3xl">
        Join jalan
      </h2>
      <p className="mt-1 text-sm text-[color:var(--run-muted)]">
        {CLUB_SCHEDULE.days.join(" & ")} · {CLUB_SCHEDULE.localTime}
      </p>
      <input
        value={nameDraft}
        onChange={(event) => setNameDraft(event.target.value)}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
        placeholder="Name"
        className="mt-4 w-full rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-3 text-base outline-none focus:border-[color:var(--run-accent-deep)]"
        autoFocus
        autoComplete="nickname"
      />
      <input
        value={phoneDraft}
        onChange={(event) => setPhoneDraft(event.target.value)}
        maxLength={MAX_PHONE_LENGTH}
        placeholder="Phone"
        inputMode="tel"
        autoComplete="tel"
        className="mt-2 w-full rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-3 text-base outline-none focus:border-[color:var(--run-accent-deep)]"
      />
      <button
        type="submit"
        disabled={busy || !canJoin}
        className="mt-3 w-full rounded-full bg-[color:var(--run-ink)] px-4 py-3 text-sm font-semibold text-[color:var(--run-accent)] disabled:opacity-40"
      >
        {busy ? "…" : "Join"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
