"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  getOrCreateRunClubClientId,
  normalizeDisplayName,
  pickAvatarHue,
  readStoredProfile,
  saveProfile,
} from "./browser";
import type { RunClubProfile } from "./types";

export function useRunClubProfile() {
  const [profile, setProfile] = useState<RunClubProfile | null>(null);
  const [ready, setReady] = useState(false);
  const upsertMember = useMutation(api.runClub.upsertMember);
  const ensureMeetup = useMutation(api.runClub.ensureMeetup);

  useEffect(() => {
    setProfile(readStoredProfile());
    setReady(true);
    void ensureMeetup({}).catch(() => undefined);
  }, [ensureMeetup]);

  const join = useCallback(
    async (nameDraft: string) => {
      const displayName = normalizeDisplayName(nameDraft);
      if (!displayName) throw new Error("Pick a display name.");
      const clientId = getOrCreateRunClubClientId();
      const avatarHue = pickAvatarHue(clientId);
      await upsertMember({ clientId, displayName, avatarHue });
      const next = { clientId, displayName, avatarHue };
      saveProfile(next);
      setProfile(next);
      await ensureMeetup({});
      return next;
    },
    [ensureMeetup, upsertMember],
  );

  return { profile, ready, join, setProfile };
}
