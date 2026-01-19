import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Shared channel name for tracking all users across the entire website
const PRESENCE_CHANNEL = 'website-visitors';

// Generate a unique visitor ID that persists across pages but not sessions
const getVisitorId = () => {
  let visitorId = sessionStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

export const usePresence = (userRole?: string | null, currentPage?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    const visitorId = getVisitorId();
    
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: visitorId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Count unique visitors (each key is a unique visitor)
        const count = Object.keys(state).length;
        setOnlineUsers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            visitor_id: visitorId,
            user_role: userRole || 'anonymous',
            page: currentPage || 'unknown',
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
