export type MusicKey =
  | "C"
  | "C#"
  | "D"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "Ab"
  | "A"
  | "Bb"
  | "B";

export type RomanNumeral =
  | "I"
  | "ii"
  | "iii"
  | "IV"
  | "V"
  | "vi"
  | "vii°";

export type DrumPatternId =
  | "none"
  | "fourFloor"
  | "softPop"
  | "rockBasic"
  | "boomBap";

export type ProgressionPresetId =
  | "I-V-vi-IV"
  | "I-IV-V-I"
  | "I-V-IV-V"
  | "ii-V-I-I"
  | "I-vi-IV-V"
  | "custom";

export type BackingTrackParams = {
  tempoBpm: number;
  key: MusicKey;
  progressionId: ProgressionPresetId;
  chords: RomanNumeral[];
  drumPatternId: DrumPatternId;
  bars: number;
  hasMicTake: boolean;
  notes: string;
};

export type PolishedTrackStatus =
  | "queued"
  | "generating"
  | "ready"
  | "failed";

export type PolishedTrack = {
  _id: string;
  status: PolishedTrackStatus;
  title: string;
  stylePrompt: string;
  audioUrl: string | null;
  streamAudioUrl: string | null;
  imageUrl: string | null;
  errorMessage: string | null;
  createdAt: number;
};
