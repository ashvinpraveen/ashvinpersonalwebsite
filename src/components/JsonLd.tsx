"use client";

import { useEffect } from "react";

type JsonLdProps = {
  id: string;
  data: unknown;
};

export default function JsonLd({ id, data }: JsonLdProps) {
  useEffect(() => {
    const existingScript = document.getElementById(id);
    existingScript?.remove();

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data, id]);

  return null;
}
