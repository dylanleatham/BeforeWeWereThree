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
  FORM_TYPE_MEDIA: 'Photo Library',
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
    'Kick out all guests, reseal envelopes, and clear all votes and letters. Start fresh!',
  MANAGER_RESET_BUTTON: 'Reset Session',
  MANAGER_RESET_CONFIRM: 'Confirm Reset',
  MANAGER_RESET_SUCCESS: (result: { participantsDeleted: number; envelopesReset: number; votesDeleted: number; lettersDeleted: number }) =>
    `Session reset! ${result.participantsDeleted} guests kicked, ${result.envelopesReset} envelopes resealed, ${result.votesDeleted} votes cleared, ${result.lettersDeleted} letters deleted.`,
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

  // ErrorBoundary
  ERROR_BOUNDARY_TITLE: 'Something went wrong',
  ERROR_BOUNDARY_MESSAGE: 'We encountered an unexpected error. Please try again.',
  ERROR_BOUNDARY_RETRY: 'Try again',
  ERROR_UNKNOWN: 'Unknown error',

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
  WYR_RECONNECTING: 'Reconnecting...',
  WYR_OFFLINE_NOTICE: 'Offline mode - real-time sync unavailable',

  // Would You Rather - WaitingPhase & RevealPhase
  WYR_WAITING: (name: string) => `Waiting for ${name}...`,
  WYR_YOUR_CHOICE: 'Your choice',
  WYR_PARTNER_CHOICE: "Partner's choice",
  WYR_MATCH: 'You matched!',
  WYR_NEXT: 'Next',

  // Would You Rather - CompletePhase
  WYR_COMPLETE_TITLE: 'All done!',
  WYR_COMPLETE_MESSAGE: 'Great choices, both of you.',
  WYR_COMPLETE_MESSAGE_MATCH: 'You two really are on the same wavelength!',
  WYR_COMPLETE_MULTI_MESSAGE: (matches: number, total: number) => {
    if (matches === total) return 'Perfect harmony! You matched on every single one.';
    if (matches === 0) return 'Opposites attract! You had different tastes on all of them.';
    return `You matched on ${matches} of ${total} — a beautiful mix of alike and different.`;
  },
  WYR_COMPLETE_ICON: '\u2728', // ✨
  WYR_COMPLETE_ICON_MATCH: '\uD83D\uDC95', // 💕
  WYR_COMPLETE_CLOSE: 'Back to envelopes',

  // Would You Rather - Multi-prompt
  WYR_PROGRESS: (current: number, total: number) => `${current} of ${total}`,
  WYR_FINISH: 'See results',
  WYR_SUMMARY_TITLE: 'Your answers',

  // Would You Rather - useWouldYouRather hook
  WYR_ERROR_LOADING: 'Failed to load activity',
  WYR_ERROR_VOTING: 'Failed to submit vote',
  WYR_ERROR_OFFLINE: 'You need to be connected to vote',

  // Letter to Baby
  LETTER_PLACEHOLDER: 'Write your letter here...',
  LETTER_SUBMIT: 'Submit Letter',
  LETTER_SAVING: 'Saving...',
  LETTER_SAVED: (time: Date) => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `Saved at ${displayHours}:${displayMinutes} ${ampm}`;
  },
  LETTER_WAITING_TITLE: 'Letter Sent!',
  LETTER_WAITING_MESSAGE: (partner: string) => `Waiting for ${partner} to finish their letter...`,
  LETTER_REVEAL_TITLE: 'Your Letters',
  LETTER_YOURS: 'Yours',
  LETTER_PARTNERS: (name: string) => `${name}'s`,
  LETTER_COMPLETE_TITLE: 'Beautifully Said',
  LETTER_COMPLETE_MESSAGE: 'Your letters are treasured.',
  LETTER_COMPLETE_ICON: '\u2709', // Envelope emoji
  LETTER_READ_YOURS: 'Read Your Letter',
  LETTER_READ_PARTNERS: (name: string) => `Read ${name}'s Letter`,
  LETTER_CLOSE_DETAIL: 'Close',
  LETTER_CLOSE: 'Back to envelopes',
  LETTER_ERROR_LOADING: "Couldn't load the letter activity",
  LETTER_ERROR_SAVING: 'Failed to save letter',
  LETTER_ERROR_SUBMITTING: 'Failed to submit letter',
  LETTER_OFFLINE_NOTICE: 'Offline mode - your letter will sync when connected',

  // Media Library
  MEDIA_TITLE: 'Our Photos',
  MEDIA_SHUFFLE: 'Shuffle',
  MEDIA_UPLOAD_PROGRESS: (progress: number) => `Uploading... ${progress}%`,
  MEDIA_ADD_PHOTO: 'Add Photo',
  MEDIA_ADD_ATTACHMENT: 'Add attachment',
  MEDIA_LOADING_ARIA: 'Loading photos',
  MEDIA_EMPTY: 'No photos yet',
  MEDIA_VIEW_PHOTO_ARIA: (n: number) => `View photo ${n}`,
  MEDIA_DELETE_PHOTO_ARIA: (n: number) => `Delete photo ${n}`,

  // Photo Attachment (Letter)
  PHOTO_ALT_ATTACHED: 'Attached photo',
  PHOTO_REMOVE_ARIA: 'Remove photo',
  PHOTO_SELECT_ARIA: 'Select photo to upload',

  // Name Game
  NAME_GAME_PROGRESS: (current: number, total: number) => `${current} of ${total}`,
  NAME_GAME_VOTE_LOVE: 'Love',
  NAME_GAME_VOTE_MAYBE: 'Maybe',
  NAME_GAME_VOTE_NOPE: 'Nope',
  NAME_GAME_GENERATING: 'Discovering names for your baby...',
  NAME_GAME_WAITING: 'Waiting for your partner to finish...',
  NAME_GAME_MATCHES_TITLE: 'You both loved',
  NAME_GAME_NEAR_MISSES_TITLE: 'Almost matched',
  NAME_GAME_WORTH_DISCUSSING_TITLE: 'Worth discussing',
  NAME_GAME_NO_MATCHES: 'No matches this round, but some close calls!',
  NAME_GAME_NEW_ROUND_TITLE: 'Ready for more names?',
  NAME_GAME_NEW_ROUND_PLACEHOLDER: 'Any preferences? (e.g., "More Italian names", "Something short and modern")',
  NAME_GAME_START_ROUND: 'Generate Names',
  NAME_GAME_SUBMIT_GUIDANCE: 'Submit Preferences',
  NAME_GAME_WAITING_FOR_GUIDANCE: 'Waiting for your partner to share their preferences...',
  NAME_GAME_PARTNER_SUBMITTED: 'Your partner has shared their preferences',
  NAME_GAME_ALL_MATCHES_TITLE: 'All matched names',
  NAME_GAME_ORIGIN_LABEL: 'Origin',
  NAME_GAME_MEANING_LABEL: 'Meaning',

  // Friend Dashboard
  FRIEND_GREETING: (name: string) => `Welcome, ${name}!`,
  FRIEND_SUBTITLE: 'We are so glad you are here. Write a letter to share your love and wisdom.',
  FRIEND_LETTERS_TITLE: 'Your Letters',
  FRIEND_THANK_YOU_LABEL: 'A note for you',
  FRIEND_BACK_TO_DASHBOARD: '\u2190 Back',

  // Friend Letter Card
  FRIEND_LETTER_TO: (name: string) => `To ${name}`,
  FRIEND_LETTER_NOT_STARTED: 'Not started',
  FRIEND_LETTER_DRAFT: 'Draft saved',
  FRIEND_LETTER_SUBMITTED: 'Sent',

  // Friend Letter Activity
  FRIEND_LETTER_TITLE_PLACEHOLDER: 'Give your letter a title (optional)',
  FRIEND_LETTER_PLACEHOLDER: 'Write your letter here...',
  FRIEND_LETTER_SUBMIT: 'Send Letter',
  FRIEND_LETTER_CONFIRM_MESSAGE: 'Once you send this letter, it cannot be edited. Ready?',
  FRIEND_LETTER_CONFIRM_SUBMIT: 'Yes, send it',
  FRIEND_LETTER_SENT_TITLE: 'Letter Sent!',
  FRIEND_LETTER_SENT_MESSAGE: (recipientName: string) =>
    `Your letter to ${recipientName} has been delivered. Thank you for your beautiful words.`,
  FRIEND_LETTER_SENT_ICON: '\u2709\uFE0F',

  // Friend Admin
  FRIEND_MANAGER_HEADING: 'Friend Letters',
  FRIEND_MANAGER_ADD: 'Add Friend',
  FRIEND_MANAGER_EMPTY: 'No friends added yet.',
  FRIEND_MANAGER_NAME_LABEL: 'Name',
  FRIEND_MANAGER_PIN_LABEL: 'PIN (MMDDYYYY)',
  FRIEND_MANAGER_LETTERS: (submitted: number) =>
    submitted === 1 ? '1 letter sent' : `${submitted} letters sent`,
  FRIEND_MANAGER_THANK_YOU: 'Thank-you note',
  FRIEND_MANAGER_VIEW_LETTERS: 'View letters',
  FRIEND_MANAGER_DELETE_CONFIRM:
    'This will permanently delete this friend and all their letters. This cannot be undone.',
  FRIEND_THANK_YOU_PLACEHOLDER: 'Write a personal thank-you note for this friend...',
  FRIEND_THANK_YOU_SAVE: 'Save Note',

  // Friend - new letter flow
  FRIEND_NEW_LETTER: 'Write a new letter',
  FRIEND_PICK_RECIPIENT: 'Who is this letter for?',
  RECIPIENT_NAMES: {
    you: 'Dylan',
    partner: 'Wife',
    baby: 'Baby',
  } as { readonly you: string; readonly partner: string; readonly baby: string },

  // Trivia
  TRIVIA_SUBMIT_BUTTON: 'Submit Answer',
  TRIVIA_NEXT_BUTTON: 'Next',
  TRIVIA_FINISH_BUTTON: 'See Results',
  TRIVIA_CORRECT: 'Correct!',
  TRIVIA_INCORRECT: 'Not quite!',
  TRIVIA_DID_YOU_KNOW: 'Did you know?',
  TRIVIA_COMPLETE_TITLE: 'All Done!',
  TRIVIA_COMPLETE_MESSAGE: 'You learned some fun baby facts!',
  TRIVIA_COMPLETE_CLOSE: 'Back to Envelopes',
  TRIVIA_REVIEW_TITLE: 'Trivia Review',
  TRIVIA_REVIEW_CLOSE: 'Back to Envelopes',
  TRIVIA_ERROR_LOADING: 'Could not load trivia questions.',
  TRIVIA_ERROR_SUBMITTING: 'Could not submit your answer. Please try again.',
  TRIVIA_OPTION_LABEL: (letter: string) => letter,

  // Content Manager
  CONTENT_MANAGER_HEADING: 'Content Library',
  CONTENT_TAB_TRIVIA: 'Trivia',
  CONTENT_TAB_WYR: 'Would You Rather',
  CONTENT_TAB_LETTERS: 'Letters',

  // Trivia Admin - Question Library
  TRIVIA_ADMIN_HEADING: 'Trivia Questions',
  TRIVIA_ADMIN_ADD: 'New Question',
  TRIVIA_ADMIN_EMPTY: 'No trivia questions yet. Create your first one!',
  TRIVIA_ADMIN_EDIT: 'Edit',
  TRIVIA_ADMIN_DELETE: 'Delete',
  TRIVIA_ADMIN_CONFIRM_DELETE: 'Delete?',
  TRIVIA_ADMIN_CANCEL: 'Cancel',
  TRIVIA_ADMIN_QUESTION_LABEL: 'Question',
  TRIVIA_ADMIN_OPTION_LABEL: (n: number) => `Option ${n}`,
  TRIVIA_ADMIN_CORRECT_LABEL: 'Correct answer',
  TRIVIA_ADMIN_EXPLANATION_LABEL: 'Explanation (optional)',
  TRIVIA_ADMIN_EXPLANATION_HINT: '"Did you know?" text shown after answer reveal',
  TRIVIA_ADMIN_ADD_OPTION: 'Add Option',
  TRIVIA_ADMIN_REMOVE_OPTION: 'Remove',
  TRIVIA_ADMIN_SAVE: 'Save Question',
  TRIVIA_ADMIN_SAVING: 'Saving...',

  // Trivia Admin - Envelope Assignment
  TRIVIA_ASSIGNER_HEADING: 'Assigned Questions',
  TRIVIA_ASSIGNER_EMPTY: 'No questions assigned. Add from the library below.',
  TRIVIA_ASSIGNER_AVAILABLE: 'Available Questions',
  TRIVIA_ASSIGNER_ADD: 'Add',
  TRIVIA_ASSIGNER_REMOVE: 'Remove',
  TRIVIA_ASSIGNER_SAVE_ORDER: 'Save Order',
  TRIVIA_ASSIGNER_SAVING: 'Saving...',
  TRIVIA_ASSIGNER_SELECT_ENVELOPE: 'Select a trivia envelope to manage questions:',
  TRIVIA_ASSIGNER_NO_ENVELOPES: 'No trivia envelopes exist. Create one in Envelope Management above.',

  // WYR Admin
  WYR_ADMIN_HEADING: 'Would You Rather Prompts',
  WYR_ADMIN_SELECT_ENVELOPE: 'Select a Would You Rather envelope to manage prompts:',
  WYR_ADMIN_NO_ENVELOPES: 'No Would You Rather envelopes exist. Create one in Envelope Management above.',
  WYR_ADMIN_ADD: 'New Prompt',
  WYR_ADMIN_EMPTY: 'No prompts for this envelope. Add one!',
  WYR_ADMIN_OPTION_A: 'Option A',
  WYR_ADMIN_OPTION_B: 'Option B',
  WYR_ADMIN_SAVE: 'Save Prompt',
  WYR_ADMIN_SAVING: 'Saving...',
  WYR_ADMIN_CONFIRM_DELETE: 'Delete?',
  WYR_ADMIN_CANCEL: 'Cancel',

  // Letter Admin
  LETTER_ADMIN_HEADING: 'Letter Prompts',
  LETTER_ADMIN_SELECT_ENVELOPE: 'Select a Letter envelope to manage its prompt:',
  LETTER_ADMIN_NO_ENVELOPES: 'No Letter envelopes exist. Create one in Envelope Management above.',
  LETTER_ADMIN_EMPTY: 'No prompt set for this envelope. Create one!',
  LETTER_ADMIN_PROMPT_LABEL: 'Prompt Text',
  LETTER_ADMIN_PROMPT_HINT: 'The question or topic that guides what participants write about',
  LETTER_ADMIN_SAVE: 'Save Prompt',
  LETTER_ADMIN_SAVING: 'Saving...',
  LETTER_ADMIN_EDIT: 'Edit Prompt',
  LETTER_ADMIN_DELETE: 'Delete Prompt',
  LETTER_ADMIN_CONFIRM_DELETE: 'Delete this prompt? This will also delete all letters written for it.',
  LETTER_ADMIN_CANCEL: 'Cancel',
  LETTER_ADMIN_CREATE: 'Create Prompt',

  // Gender Reveal - Participant
  REVEAL_HEADING: 'Gender Reveal',
  REVEAL_KEY_ENTRY_TITLE: 'Enter Your Key',
  REVEAL_KEY_ENTRY_SUBTITLE: 'Type the code you were given to unlock the reveal',
  REVEAL_KEY_ENTRY_ARIA: 'Enter your reveal key',
  REVEAL_KEY_INVALID: "That doesn't look right \u2014 try again",
  REVEAL_KEY_ALREADY_USED: 'This key has already been entered',
  REVEAL_WAITING_TITLE: 'Almost There...',
  REVEAL_WAITING_SUBTITLE: 'Waiting for your partner to enter their key',
  REVEAL_NOT_CONFIGURED: "The reveal hasn't been set up yet",
  REVEAL_NOT_CONFIGURED_SUBTITLE: 'Ask the admin to configure the gender reveal',
  REVEAL_BOY_TEXT: "It's a Boy!",
  REVEAL_GIRL_TEXT: "It's a Girl!",
  REVEAL_KEEPSAKE_MESSAGE: 'This is the moment you found out',
  REVEAL_KEEPSAKE_DATE: (date: string) => `Revealed on ${date}`,

  // Gender Reveal - Admin (for Plan 03)
  REVEAL_ADMIN_HEADING: 'Gender Reveal Configuration',
  REVEAL_ADMIN_SELECT_ENVELOPE: 'Select a Gender Reveal envelope to configure',
  REVEAL_ADMIN_GENDER_LABEL: "Baby's Gender",
  REVEAL_ADMIN_KEY_A_LABEL: 'Key for Participant A',
  REVEAL_ADMIN_KEY_B_LABEL: 'Key for Participant B',
  REVEAL_ADMIN_KEY_HINT: '6-8 alphanumeric characters',
  REVEAL_ADMIN_SAVE: 'Save Configuration',
  REVEAL_ADMIN_SAVING: 'Saving...',
  REVEAL_ADMIN_RESEAL: 'Re-seal Reveal',
  REVEAL_ADMIN_RESEAL_CONFIRM: 'This will reset the reveal so both keys must be entered again. The gender and keys will be preserved.',
  REVEAL_ADMIN_DELETE: 'Delete Configuration',
  REVEAL_ADMIN_DELETE_CONFIRM: 'This will permanently delete the gender reveal configuration.',
  REVEAL_ADMIN_STATUS_NOT_CONFIGURED: 'Not configured',
  REVEAL_ADMIN_STATUS_CONFIGURED: 'Configured \u2014 awaiting keys',
  REVEAL_ADMIN_STATUS_REVEALED: 'Revealed',
  REVEAL_ADMIN_CANCEL: 'Cancel',
} as const;

/**
 * Envelope type options for form select
 */
export const ENVELOPE_TYPES = [
  { value: 'would-you-rather', label: STRINGS.FORM_TYPE_WOULD_YOU_RATHER },
  { value: 'letter', label: STRINGS.FORM_TYPE_LETTER },
  { value: 'media', label: STRINGS.FORM_TYPE_MEDIA },
  { value: 'trivia', label: STRINGS.FORM_TYPE_TRIVIA },
  { value: 'name-game', label: STRINGS.FORM_TYPE_NAME_GAME },
  { value: 'gender-reveal', label: STRINGS.FORM_TYPE_GENDER_REVEAL },
] as const;
