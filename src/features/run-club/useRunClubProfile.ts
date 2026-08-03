"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  getOrCreateRunClubClientId,
  normalizeDisplayName,
  normalizePhone,
  pickAvatarHue,
  readStoredProfile,
  saveProfile,
} from "./browser";
import type { RunClubProfile } from "./types";

export type JoinProfileInput = {
  name: string;
  phone: string;
};

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
    async ({ name, phone }: JoinProfileInput) => {
      const displayName = normalizeDisplayName(name);
      const normalizedPhone = normalizePhone(phone);
      if (!displayName) throw new Error("Pick a display name.");
      if (!normalizedPhone) throw new Error("Add a phone number.");
      const clientId = getOrCreateRunClubClientId();
      const avatarHue = pickAvatarHue(clientId);
      await upsertMember({
        clientId,
        displayName,
        avatarHue,
        phone: normalizedPhone,
      });
      const next = { clientId, displayName, avatarHue, phone: normalizedPhone };
      saveProfile(next);
      setProfile(next);
      await ensureMeetup({});
      return next;
    },
    [ensureMeetup, upsertMember],
  );

  const updateProfile = useCallback(
    async ({ name, phone }: JoinProfileInput) => {
      const displayName = normalizeDisplayName(name);
      const normalizedPhone = normalizePhone(phone);
      if (!displayName) throw new Error("Pick a display name.");
      if (!normalizedPhone) throw new Error("Add a phone number.");
      const current = readStoredProfile();
      if (!current) throw new Error("Join the club first.");
      await upsertMember({
        clientId: current.clientId,
        displayName,
        avatarHue: current.avatarHue,
        phone: normalizedPhone,
      });
      const next = {
        ...current,
        displayName,
        phone: normalizedPhone,
      };
      saveProfile(next);
      setProfile(next);
      return next;
    },
    [upsertMember],
  );

  return { profile, ready, join, updateProfile, setProfile };
}
