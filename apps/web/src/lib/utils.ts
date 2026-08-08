import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function apiBase() {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
}

export function wsUrl(roomId: string) {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) {
    const base = configured.replace(/\/$/, "");
    return `${base}?roomId=${roomId}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = import.meta.env.VITE_API_URL
    ? new URL(import.meta.env.VITE_API_URL).host
    : window.location.host;
  return `${proto}//${host}/ws?roomId=${roomId}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
