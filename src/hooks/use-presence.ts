import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Shared channel name for tracking users across all pages
const PRESENCE_CHANNEL = 'app-users-presence';

export const usePresence = (userRole: string | null, currentPage: string) => {
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    if (!userRole) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: `${userRole}-${currentPage}-${Date.now()}` } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.values(state).flat().length;
        setOnlineUsers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            user: userRole, 
            page: currentPage,
            online_at: new Date().toISOString() 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, currentPage]);

  return onlineUsers;
};
