import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Shared channel name for tracking all visitors across the entire website link
const PRESENCE_CHANNEL = "website-visitors";

// Generate a stable visitor id for this browser.
// Use localStorage so multiple tabs count as ONE visitor.
const getVisitorId = () => {
  try {
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("visitor_id", visitorId);
    }
    return visitorId;
  } catch {
    // Fallback (e.g. storage disabled)
    let visitorId = sessionStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("visitor_id", visitorId);
    }
    return visitorId;
  }
};

export const usePresence = (userRole?: string | null, currentPage?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    const visitorId = getVisitorId();

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: visitorId } },
    });

    const updateCount = () => {
      const state = channel.presenceState();
      // Count unique visitors (each key is one visitor; multiple tabs become multiple metas under same key)
      setOnlineUsers(Object.keys(state).length);
    };

    channel
      .on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            visitor_id: visitorId,
            user_role: userRole || "anonymous",
            page: currentPage || "unknown",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      // Ensure the presence is removed promptly on navigation/unmount.
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userRole, currentPage]);

  return onlineUsers;
};
