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

async function lookupUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase.from('users').select('id, email').eq('email', normalized).maybeSingle();
  if (error) throw error;
  return data;
}

// Read-only: does a registered Sencha account exist at this email? Used
// to validate every address on the setup wizard's invite page *before*
// the event (and its menu/inventory) gets created, so a bad email
// doesn't leave a half-created event behind that can't be safely retried
// without duplicating it.
export async function checkEmailRegistered(supabase: SupabaseClient, email: string): Promise<boolean> {
  return (await lookupUserByEmail(supabase, email)) !== null;
}

// Looks up a registered account by exact email and adds them to the
// event's roster. Throws a friendly, specific message for the two
// expected failure cases (no such account / already a member) so the
// UI can show something more useful than a generic error.
export async function inviteMember(supabase: SupabaseClient, eventId: string, email: string): Promise<EventMember> {
  const userRow = await lookupUserByEmail(supabase, email);
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
