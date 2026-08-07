// Builds the `sms:` deep link used to hand a pickup-ready text off to
// the browser's native Messages app (see OrdersPage.tsx's
// handleToggleDone). This only opens a pre-filled compose screen --
// there is no API here and no way for the app to know whether the
// resulting message actually gets sent, since that's a person tapping
// Send on their own phone, not a network call this code makes.

export function buildPickupReadySmsUrl(phone: string, eventName: string): string {
  // Strip everything but digits/+ so formatting typed at order time
  // (spaces, dashes, parens) doesn't end up embedded in the `sms:`
  // URI itself -- mobile OSes resolve a bare digit string fine and
  // don't require E.164 the way a real SMS API (e.g. Twilio) would.
  const digits = phone.replace(/[^\d+]/g, '');
  const body = `[${eventName}] Your matcha order is now ready for pick-up! Thank you for ordering ❤️`;
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}
