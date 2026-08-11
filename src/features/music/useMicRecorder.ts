"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_MIC_SECONDS } from "./config";

type MicStatus = "idle" | "recording" | "ready" | "denied" | "unsupported";

export function useMicRecorder() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearTake = useCallback(() => {
    clearObjectUrl();
    setAudioUrl(null);
    setElapsedMs(0);
    setStatus((current) => (current === "denied" || current === "unsupported" ? current : "idle"));
  }, [clearObjectUrl]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    clearTimer();
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    try {
      clearTake();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearTimer();
        stopTracks();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        clearObjectUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setAudioUrl(url);
        setStatus("ready");
        mediaRecorderRef.current = null;
      };

      recorder.start();
      startedAtRef.current = performance.now();
      setStatus("recording");
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_MIC_SECONDS * 1000) {
          stopRecording();
        }
      }, 100);
    } catch {
      setStatus("denied");
      stopTracks();
    }
  }, [clearObjectUrl, clearTake, clearTimer, stopRecording, stopTracks]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      clearObjectUrl();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearObjectUrl, clearTimer, stopTracks]);

  return {
    status,
    audioUrl,
    elapsedMs,
    maxSeconds: MAX_MIC_SECONDS,
    startRecording,
    stopRecording,
    clearTake,
    hasTake: Boolean(audioUrl),
  };
}
