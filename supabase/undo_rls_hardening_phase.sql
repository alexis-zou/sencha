-- ============================================================
-- Sencha -- Undo rls_hardening_phase.sql
--
-- Reverts rls_hardening_phase.sql's changes. Scoped to what's
-- actually still live from that file: every event-scoped table it
-- touched (events, menu_items, inventory, flavor_options, orders,
-- order_items, event_members) was already superseded by
-- fix_event_members_recursion.sql, so there's nothing of the
-- hardening pass left to undo there -- reverting those policies here
-- would mean reverting the recursion fix too, which isn't what this
-- undo is for.
--
-- `users` is also a no-op: its rls_hardening_phase.sql policy was
-- byte-for-byte identical to the one already created in
-- collaboration_phase.sql (the file's own comment says as much), so
-- there's nothing to revert.
--
-- That leaves `notifications` as the one table where
-- rls_hardening_phase.sql made a real, still-live change (adding
-- `to authenticated`). Restored here to notifications_phase.sql's
-- original policies.
--
-- The `revoke all ... from anon` statements from rls_hardening_phase.sql
-- are intentionally NOT undone: anon never had grants on any of these
-- tables in the first place (per that file's own audit), so the
-- revokes never changed actual behavior -- undoing them would mean
-- explicitly granting anon access, a regression, not a revert.
-- ============================================================

begin;

drop policy if exists "users see only their own notifications" on public.notifications;
create policy "users see only their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "users can mark their own notifications read" on public.notifications;
create policy "users can mark their own notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

commit;
