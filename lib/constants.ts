export const USERS_KEY = 'auth:users';
export const SESSION_KEY = 'auth:session';
export const eventsKey = (email: string) => 'events:' + email.toLowerCase();
export const menuTemplateKey = (email: string) => 'menuTemplate:' + email.toLowerCase();
