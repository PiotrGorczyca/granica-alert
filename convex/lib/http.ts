/**
 * Identify the bot honestly to every source we poll.
 *
 * The contact address is sent to gov.pl, the news feeds and alerts.in.ua on every
 * request, and is the only reason an operator who notices our traffic would email
 * us rather than just block us.
 *
 * Set it per deployment:
 *   npx convex env set BOT_CONTACT_EMAIL <a real, monitored address>
 *
 * When it is unset we say nothing rather than naming an address: a contact that
 * bounces is worse than no contact at all, because it reads as bad faith to the
 * person deciding whether to block us.
 */
const CONTACT = process.env.BOT_CONTACT_EMAIL;

export const USER_AGENT = CONTACT
	? `GranicaAlertBot/0.2 (civic air awareness; +${CONTACT})`
	: 'GranicaAlertBot/0.2 (civic air awareness; no contact configured)';
