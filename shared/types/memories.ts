/**
 * Memories & export types
 * Used for the post-babymoon keepsake feature
 */

// --- Per-activity result types ---

export interface MemoryWyrResult {
  envelopeTitle: string;
  optionA: string;
  optionB: string;
  /** Designation of who picked what */
  voteA: string | null;
  voteB: string | null;
}

export interface MemoryLetter {
  envelopeTitle: string;
  prompt: string;
  participantDesignation: string;
  content: string;
  photoUrl: string | null;
}

export interface MemoryPhotoPrompt {
  envelopeTitle: string;
  prompt: string;
  responses: {
    participantDesignation: string;
    photoUrl: string | null;
    caption: string | null;
  }[];
}

export interface MemoryNameMatch {
  name: string;
  /** Both participants loved this name */
  matchedAt: string;
}

export interface MemoryTriviaResult {
  participantDesignation: string;
  correctCount: number;
  totalCount: number;
}

export interface MemoryGenderReveal {
  genderValue: string | null;
  revealedAt: string | null;
}

export interface MemoryFriendLetter {
  friendName: string;
  recipient: string;
  content: string;
  submittedAt: string;
}

export interface MemoryPhoto {
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  uploadedAt: string;
}

// --- API response types ---

export interface BabymoonStatusResponse {
  closedAt: string | null;
}

export interface CloseBabymoonResponse {
  closedAt: string;
}

export interface MemoriesDataResponse {
  closedAt: string;
  wyrResults: MemoryWyrResult[];
  letters: MemoryLetter[];
  photoPrompts: MemoryPhotoPrompt[];
  nameMatches: MemoryNameMatch[];
  triviaResults: MemoryTriviaResult[];
  genderReveal: MemoryGenderReveal | null;
  friendLetters: MemoryFriendLetter[];
  photos: MemoryPhoto[];
}
