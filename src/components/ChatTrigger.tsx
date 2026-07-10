"use client";

import type { ButtonHTMLAttributes } from "react";

export const OPEN_CHAT_EVENT = "ashvin:open-chat";

type ChatTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ChatTrigger({ children, onClick, type = "button", ...props }: ChatTriggerProps) {
  return (
    <button
      {...props}
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
        }
      }}
    >
      {children}
    </button>
  );
}
