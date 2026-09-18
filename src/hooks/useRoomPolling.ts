import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientRoom } from "@/types/room";

const POLL_MS = 1500;

export function useRoomPolling(code: string | null) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!code || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "تعذّر تحميل الغرفة");
        return;
      }
      const data: ClientRoom = await res.json();
      setRoom(data);
      setError(null);
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      inFlightRef.current = false;
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [code, refresh]);

  return { room, error, refresh, setRoom };
}
