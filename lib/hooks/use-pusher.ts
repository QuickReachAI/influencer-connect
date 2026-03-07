"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Pusher, { Channel } from "pusher-js";

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherInstance;
}

export function usePusherChannel(channelName: string | null) {
  const channelRef = useRef<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!channelName) return;

    const pusher = getPusher();
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", () => setIsConnected(true));
    channel.bind("pusher:subscription_error", () => setIsConnected(false));

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [channelName]);

  const bind = useCallback(
    <T>(event: string, callback: (data: T) => void) => {
      channelRef.current?.bind(event, callback);
      return () => channelRef.current?.unbind(event, callback);
    },
    []
  );

  return { channel: channelRef.current, isConnected, bind };
}

export interface TypingState {
  userId: string;
  userName: string;
}

export function usePusherChat(dealId: string | null) {
  const channelName = dealId ? `private-deal-${dealId}` : null;
  const { bind, isConnected } = usePusherChannel(channelName);
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!dealId) return;

    const unbindTypingStart = bind<TypingState>("typing-start", (data) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });

      if (typingTimeoutRef.current[data.userId]) {
        clearTimeout(typingTimeoutRef.current[data.userId]);
      }
      typingTimeoutRef.current[data.userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        delete typingTimeoutRef.current[data.userId];
      }, 3000);
    });

    const unbindTypingStop = bind<{ userId: string }>("typing-stop", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      if (typingTimeoutRef.current[data.userId]) {
        clearTimeout(typingTimeoutRef.current[data.userId]);
        delete typingTimeoutRef.current[data.userId];
      }
    });

    return () => {
      unbindTypingStart?.();
      unbindTypingStop?.();
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
    };
  }, [dealId, bind]);

  const sendTypingStart = useCallback(
    async (dealId: string) => {
      await fetch(`/api/chat/${dealId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }).catch(() => {});
    },
    []
  );

  const sendTypingStop = useCallback(
    async (dealId: string) => {
      await fetch(`/api/chat/${dealId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      }).catch(() => {});
    },
    []
  );

  const sendReadReceipt = useCallback(
    async (dealId: string) => {
      await fetch(`/api/chat/${dealId}/read`, {
        method: "POST",
      }).catch(() => {});
    },
    []
  );

  return {
    isConnected,
    typingUsers,
    bind,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt,
  };
}
