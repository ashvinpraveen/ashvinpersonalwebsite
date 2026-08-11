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
  | "I7"
  | "ii"
  | "iii"
  | "IV"
  | "IV7"
  | "V"
  | "V7"
  | "vi"
  | "vii°";

export type DrumPatternId =
  | "none"
  | "fourFloor"
  | "softPop"
  | "rockBasic"
  | "boomBap";

export type ProgressionPresetId =
  | "blues-12"
  | "I-V-vi-IV"
  | "I-vi-IV-V"
  | "vi-IV-I-V"
  | "I-IV-V-I"
  | "I-IV-I-V"
  | "ii-V-I-I"
  | "canon"
  | "custom";

export type PadVoiceId = "warm" | "rhodes" | "organ" | "softSaw" | "glass";

export type BackingTrackParams = {
  tempoBpm: number;
  key: MusicKey;
  progressionId: ProgressionPresetId;
  chords: RomanNumeral[];
  drumPatternId: DrumPatternId;
  padVoiceId: PadVoiceId;
  bars: number;
  notes: string;
};

export type TransportState = {
  beat: 1 | 2 | 3 | 4;
  barIndex: number;
  chord: RomanNumeral;
  playing: boolean;
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
