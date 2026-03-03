import { db } from '../db/connection.js';
import type { MemoriesDataResponse } from 'shared';

/**
 * Memories data aggregation service
 * Queries all activity tables and returns a unified keepsake view
 */

/** Map participant IDs to their designations */
async function getDesignationMap(): Promise<Map<string, string>> {
  const participants = await db.participant.findMany({
    where: { role: 'guest' },
    select: { id: true, designation: true },
  });
  const map = new Map<string, string>();
  for (const p of participants) {
    map.set(p.id, p.designation ?? 'Unknown');
  }
  return map;
}

/**
 * Get all memories data for the keepsake export
 */
export async function getMemoriesData(closedAt: string): Promise<MemoriesDataResponse> {
  const designations = await getDesignationMap();

  const [
    wyrData,
    letterData,
    photoPromptData,
    nameVoteData,
    triviaAnswerData,
    genderRevealData,
    friendLetterData,
    photoData,
  ] = await Promise.all([
    // WYR: prompts with votes, scoped to envelopes
    db.wyrPrompt.findMany({
      include: {
        envelope: { select: { title: true } },
        votes: { select: { participantId: true, choice: true } },
      },
      orderBy: [{ envelope: { order: 'asc' } }, { sortOrder: 'asc' }],
    }),

    // Letters: submitted letters with prompts
    db.letter.findMany({
      where: { submittedAt: { not: null } },
      include: {
        prompt: {
          include: { envelope: { select: { title: true } } },
        },
      },
    }),

    // Photo Prompts: prompts with responses
    db.photoPrompt.findMany({
      include: {
        envelope: { select: { title: true } },
        responses: { select: { participantId: true, photoUrl: true } },
      },
    }),

    // Name Game: votes for matched names (both voted 'love')
    db.nameGameName.findMany({
      include: {
        votes: { select: { participantId: true, choice: true } },
      },
    }),

    // Trivia: all answers for scoring
    db.triviaAnswer.findMany({
      select: { participantId: true, isCorrect: true },
    }),

    // Gender Reveal: config
    db.genderRevealConfig.findFirst({
      select: { genderValue: true, revealedAt: true },
    }),

    // Friend Letters: submitted only
    db.friendLetter.findMany({
      where: { submittedAt: { not: null } },
      include: { friend: { select: { name: true } } },
    }),

    // Photos: all uploaded photos
    db.photo.findMany({
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // --- Map WYR results ---
  const wyrResults = wyrData.map((prompt) => {
    const voteA = prompt.votes.find((v) => v.choice === 'option_a');
    const voteB = prompt.votes.find((v) => v.choice === 'option_b');
    return {
      envelopeTitle: prompt.envelope.title,
      optionA: prompt.optionA,
      optionB: prompt.optionB,
      voteA: voteA ? designations.get(voteA.participantId) ?? null : null,
      voteB: voteB ? designations.get(voteB.participantId) ?? null : null,
    };
  });

  // --- Map Letters ---
  const letters = letterData.map((letter) => ({
    envelopeTitle: letter.prompt.envelope.title,
    prompt: letter.prompt.prompt,
    participantDesignation: designations.get(letter.participantId) ?? 'Unknown',
    content: letter.content,
    photoUrl: letter.photoUrl,
  }));

  // --- Map Photo Prompts ---
  const photoPrompts = photoPromptData.map((pp) => ({
    envelopeTitle: pp.envelope.title,
    prompt: pp.prompt,
    responses: pp.responses.map((r) => ({
      participantDesignation: designations.get(r.participantId) ?? 'Unknown',
      photoUrl: r.photoUrl,
      caption: null,
    })),
  }));

  // --- Name matches: names where BOTH participants voted "love" ---
  const nameMatches = nameVoteData
    .filter((name) => {
      const loveVotes = name.votes.filter((v) => v.choice === 'love');
      // Need at least 2 love votes (both participants)
      return loveVotes.length >= 2;
    })
    .map((name) => ({
      name: name.name,
      matchedAt: name.createdAt.toISOString(),
    }));

  // --- Trivia results: per-participant scores ---
  const triviaScores = new Map<string, { correct: number; total: number }>();
  for (const answer of triviaAnswerData) {
    const existing = triviaScores.get(answer.participantId) ?? { correct: 0, total: 0 };
    existing.total++;
    if (answer.isCorrect) existing.correct++;
    triviaScores.set(answer.participantId, existing);
  }
  const triviaResults = Array.from(triviaScores.entries()).map(([pid, scores]) => ({
    participantDesignation: designations.get(pid) ?? 'Unknown',
    correctCount: scores.correct,
    totalCount: scores.total,
  }));

  // --- Gender Reveal ---
  const genderReveal = genderRevealData
    ? {
        genderValue: genderRevealData.genderValue,
        revealedAt: genderRevealData.revealedAt?.toISOString() ?? null,
      }
    : null;

  // --- Friend Letters ---
  const friendLetters = friendLetterData.map((fl) => ({
    friendName: fl.friend.name,
    recipient: fl.recipient,
    content: fl.content,
    submittedAt: fl.submittedAt!.toISOString(),
  }));

  // --- Photos ---
  const photos = photoData.map((p) => ({
    url: p.blobUrl,
    thumbnailUrl: null,
    caption: null,
    uploadedAt: p.createdAt.toISOString(),
  }));

  return {
    closedAt,
    wyrResults,
    letters,
    photoPrompts,
    nameMatches,
    triviaResults,
    genderReveal,
    friendLetters,
    photos,
  };
}
