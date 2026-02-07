/**
 * Centralized user-facing strings
 * Organized by component/domain prefix
 */

export const STRINGS = {
  // App.tsx
  APP_ADMIN_BADGE: 'Admin Mode',
  APP_TITLE: 'Before We Were Three',
  APP_READONLY: 'Viewing mode',
  APP_LOADING_ENVELOPES: 'Loading your envelopes...',
  APP_ERROR_FALLBACK: 'Failed to load envelopes',
  APP_RETRY: 'Try again',
  APP_EMPTY_TITLE: 'No envelopes yet',
  APP_EMPTY_MESSAGE: 'Ask your admin to add some activities!',

  // PinEntry.tsx
  PIN_TITLE: 'Welcome',
  PIN_SUBTITLE: 'Enter your special date to begin',
  PIN_PLACEHOLDER: 'MM/DD/YYYY',
  PIN_ARIA_LABEL: 'Enter PIN in date format',
  PIN_ERROR_FALLBACK: "Hmm, that's not it. Try again?",
  PIN_LOADING: '...',

  // EnvelopeForm.tsx
  FORM_TITLE_CREATE: 'Create Envelope',
  FORM_TITLE_EDIT: 'Edit Envelope',
  FORM_LABEL_TITLE: 'Title',
  FORM_LABEL_TYPE: 'Activity Type',
  FORM_LABEL_ORDER: 'Display Order',
  FORM_PLACEHOLDER_TITLE: 'e.g., Would You Rather #1',
  FORM_HINT_ORDER: 'Lower numbers appear first in the pile',
  FORM_ERROR_TITLE_REQUIRED: 'Title is required',
  FORM_ERROR_ORDER_INVALID: 'Order must be a non-negative number',
  FORM_ERROR_SAVE_FALLBACK: 'Failed to save envelope',
  FORM_BUTTON_CANCEL: 'Cancel',
  FORM_BUTTON_SAVING: 'Saving...',
  FORM_BUTTON_SAVE: 'Save Changes',
  FORM_BUTTON_CREATE: 'Create Envelope',

  // Envelope type labels
  FORM_TYPE_WOULD_YOU_RATHER: 'Would You Rather',
  FORM_TYPE_LETTER: 'Letter to Baby',
  FORM_TYPE_TRIVIA: 'Trivia',
  FORM_TYPE_NAME_GAME: 'Name Game',
  FORM_TYPE_GENDER_REVEAL: 'Gender Reveal',

  // EnvelopeManager.tsx
  MANAGER_HEADING: 'Envelope Management',
  MANAGER_ADD_BUTTON: 'Add Envelope',
  MANAGER_LOADING: 'Loading envelopes...',
  MANAGER_EMPTY: 'No envelopes yet. Create your first one!',
  MANAGER_CONFIRM: 'Confirm',
  MANAGER_CANCEL: 'Cancel',
  MANAGER_TOOLS_HEADING: 'Test Tools',
  MANAGER_RESET_TITLE: 'Reset Session',
  MANAGER_RESET_DESCRIPTION:
    'Kick out all guests, reseal envelopes, and clear all votes. Start fresh!',
  MANAGER_RESET_BUTTON: 'Reset Session',
  MANAGER_RESET_CONFIRM: 'Confirm Reset',
  MANAGER_RESET_SUCCESS: (result: { participantsDeleted: number; envelopesReset: number; votesDeleted: number }) =>
    `Session reset! ${result.participantsDeleted} guests kicked, ${result.envelopesReset} envelopes resealed, ${result.votesDeleted} votes cleared.`,
  MANAGER_RESET_ERROR: (msg: string) => `Failed to reset session: ${msg}`,
  MANAGER_ARIA_EDIT: (title: string) => `Edit ${title}`,
  MANAGER_ARIA_DELETE: (title: string) => `Delete ${title}`,

  // BaseEnvelope.tsx
  ENVELOPE_CLOSE_ARIA: 'Close envelope',
  ENVELOPE_PLACEHOLDER: 'Activity content will appear here',
  ENVELOPE_PARTNER: 'Partner is here',

  // EnvelopeCard.tsx
  CARD_PARTNER_ARIA: 'Partner is viewing',
  CARD_COMPLETED_ARIA: 'Completed',
  CARD_ARIA_OPEN: (title: string) => `Open ${title}`,

  // EnvelopePile.tsx
  PILE_NAV_ARIA: 'Envelope navigation',
  PILE_HINT: 'Swipe to see more',
  PILE_ARIA_GO_TO: (n: number) => `Go to envelope ${n}`,
  PILE_COUNT: (current: number, total: number) => `${current} of ${total}`,

  // api.ts
  API_ERROR_NETWORK: 'Unable to connect to server',
  API_ERROR_FETCH_ENVELOPES: 'Failed to fetch envelopes',
  API_ERROR_FETCH_ENVELOPE: 'Failed to fetch envelope',
  API_ERROR_CREATE_ENVELOPE: 'Failed to create envelope',
  API_ERROR_UPDATE_ENVELOPE: 'Failed to update envelope',
  API_ERROR_DELETE_ENVELOPE: 'Failed to delete envelope',
  API_ERROR_SIGNALR_NEGOTIATE: 'Failed to establish real-time connection',

  // useSession.ts
  SESSION_ERROR_NETWORK: 'Unable to connect to server',

  // Would You Rather - PartnerPresence
  WYR_PARTNER_JOINED: (name: string) => `${name} joined`,
  WYR_PARTNER_LEFT: (name: string) => `${name} left`,
  WYR_PARTNER_ONLINE: 'Online',
  WYR_PARTNER_OFFLINE: 'Offline',

  // Would You Rather - VotingPhase
  WYR_TITLE: 'Would you rather...',
  WYR_OPTION_A_LABEL: 'Option A',
  WYR_OPTION_B_LABEL: 'Option B',
  WYR_OR: 'or',
  WYR_SWIPE_PROMPT: 'Swipe to choose',
  WYR_SWIPE_HINT: '← Swipe left for A · Swipe right for B →',
  WYR_CHOOSING_A: 'Choosing A...',
  WYR_CHOOSING_B: 'Choosing B...',
  WYR_RECONNECTING: 'Reconnecting...',
  WYR_OFFLINE_NOTICE: 'Offline mode - real-time sync unavailable',

  // Would You Rather - WaitingPhase & RevealPhase
  WYR_WAITING: (name: string) => `Waiting for ${name}...`,
  WYR_YOUR_CHOICE: 'Your choice',
  WYR_PARTNER_CHOICE: "Partner's choice",
  WYR_MATCH: 'You matched!',
  WYR_NEXT: 'Next',

  // Would You Rather - useWouldYouRather hook
  WYR_ERROR_LOADING: 'Failed to load activity',
  WYR_ERROR_VOTING: 'Failed to submit vote',
  WYR_ERROR_OFFLINE: 'You need to be connected to vote',
} as const;

/**
 * Envelope type options for form select
 */
export const ENVELOPE_TYPES = [
  { value: 'would-you-rather', label: STRINGS.FORM_TYPE_WOULD_YOU_RATHER },
  { value: 'letter', label: STRINGS.FORM_TYPE_LETTER },
  { value: 'trivia', label: STRINGS.FORM_TYPE_TRIVIA },
  { value: 'name-game', label: STRINGS.FORM_TYPE_NAME_GAME },
  { value: 'gender-reveal', label: STRINGS.FORM_TYPE_GENDER_REVEAL },
] as const;
