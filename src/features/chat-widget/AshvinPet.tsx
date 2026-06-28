import type { AshvinPetAnimation } from "./types";
import { cn } from "@/lib/utils";

export default function AshvinPet({
  animation = "idle",
  compact = false,
}: {
  animation?: AshvinPetAnimation;
  compact?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ashvin-pet",
        animation === "drag"
          ? "ashvin-pet--drag"
          : animation === "chat"
            ? "ashvin-pet--chat"
            : "ashvin-pet--idle",
        compact && "ashvin-pet--compact",
      )}
    />
  );
}
