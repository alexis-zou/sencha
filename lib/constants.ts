// Ice is a fixed, unpriced customization list (unlike syrup/milk, which are
// now configured with pricing per event).
export const ICE_OPTIONS = ['Regular Ice', 'No Ice', 'Light Ice', 'Extra Ice'];

export const USERS_KEY = 'auth:users';
export const SESSION_KEY = 'auth:session';
export const eventsKey = (email: string) => 'events:' + email.toLowerCase();
export const menuTemplateKey = (email: string) => 'menuTemplate:' + email.toLowerCase();
