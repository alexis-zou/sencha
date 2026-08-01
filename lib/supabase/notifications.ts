// Data access for in-app notifications, backed by Supabase (see
// supabase/notifications_phase.sql). Rows are created entirely
// server-side by a trigger on public.orders -- this module only ever
// reads, marks-read, and subscribes; it never inserts.

import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 'order_created' | 'order_updated' | 'order_completed' | 'order_deleted';

export interface AppNotification {
  id: string;
  eventId: string | null;
  type: NotificationType;
  actorEmail: string;
  orderNote: string | null;
  eventName: string | null;
  isRead: boolean;
  createdAt: number;
}

interface NotificationRow {
  id: string;
  event_id: string | null;
  type: NotificationType;
  payload: { actor_email?: string; order_note?: string | null; event_name?: string | null };
  is_read: boolean;
  created_at: string;
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    eventId: row.event_id,
    type: row.type,
    actorEmail: row.payload?.actor_email || 'Someone',
    orderNote: row.payload?.order_note ?? null,
    eventName: row.payload?.event_name ?? null,
    isRead: row.is_read,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// A short, human-readable line for a toast or list row.
export function describeNotification(n: AppNotification): string {
  const who = n.actorEmail;
  const where = n.eventName ? ` in ${n.eventName}` : '';
  switch (n.type) {
    case 'order_created':
      return `${who} added an order${where}.`;
    case 'order_completed':
      return `${who} completed an order${where}.`;
    case 'order_updated':
      return `${who} updated an order${where}.`;
    case 'order_deleted':
      return `${who} deleted an order${where}.`;
  }
}

export async function fetchNotifications(supabase: SupabaseClient, userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, event_id, type, payload, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return (data as NotificationRow[]).map(toNotification);
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

// Live feed of new notifications for one user -- fires only on INSERT
// (a notification's is_read flip is driven by the client's own
// markAllNotificationsRead call, not something to react to here).
// Returns an unsubscribe function for effect cleanup.
export function subscribeToNotifications(
  supabase: SupabaseClient,
  userId: string,
  onNotification: (n: AppNotification) => void
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
        onNotification(toNotification(payload.new as NotificationRow));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
