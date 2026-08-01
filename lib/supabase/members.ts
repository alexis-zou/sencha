// Data access for collaborative event membership, backed by Supabase
// (see supabase/collaboration_phase.sql). This is the only place that
// knows about the public.users/event_members table shape.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface EventMember {
  userId: string;
  email: string;
  role: 'owner' | 'staff';
}

interface MemberRow {
  user_id: string;
  role: string;
  users: { email: string } | { email: string }[] | null;
}

function emailFromJoin(users: MemberRow['users']): string {
  if (!users) return '(unknown)';
  return Array.isArray(users) ? users[0]?.email ?? '(unknown)' : users.email;
}

export async function fetchMembers(supabase: SupabaseClient, eventId: string): Promise<EventMember[]> {
  const { data, error } = await supabase
    .from('event_members')
    .select('user_id, role, users(email)')
    .eq('event_id', eventId);
  if (error || !data) return [];
  return (data as unknown as MemberRow[]).map((row) => ({
    userId: row.user_id,
    role: row.role as 'owner' | 'staff',
    email: emailFromJoin(row.users),
  }));
}

// Looks up a registered account by exact email and adds them to the
// event's roster. Throws a friendly, specific message for the two
// expected failure cases (no such account / already a member) so the
// UI can show something more useful than a generic error.
export async function inviteMember(supabase: SupabaseClient, eventId: string, email: string): Promise<EventMember> {
  const normalized = email.trim().toLowerCase();

  const { data: userRow, error: lookupErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', normalized)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (!userRow) throw new Error('No registered Sencha account found with that email.');

  const { error: insertErr } = await supabase
    .from('event_members')
    .insert({ event_id: eventId, user_id: userRow.id, role: 'staff' });
  if (insertErr) {
    if (insertErr.code === '23505') throw new Error('That person already has access to this stand.');
    throw insertErr;
  }

  return { userId: userRow.id, email: userRow.email, role: 'staff' };
}
