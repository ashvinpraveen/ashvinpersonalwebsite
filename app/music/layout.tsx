import type { ReactNode } from "react";

export default function MusicLayout({ children }: { children: ReactNode }) {
  return <div className="font-sans">{children}</div>;
}
