import { PrismaClient } from '@prisma/client';
import { hashKey } from '../src/utils/keyHash.js';
import { DEMO_PARTICIPANTS, DEMO_PINS, DEMO_REVEAL_KEYS } from './demo-data.js';

/**
 * Demo seed: fills a LOCAL database with fictional content for every activity,
 * so the app can be explored (and screenshotted) without real data.
 *
 * Wipes all tables first. Refuses to run in production or against a non-local host.
 *
 *   npm run db:seed:demo              partners A and B pre-registered, for scripts/demo-screenshots.ts
 *   npm run db:seed:demo -- --play    no partners yet: the first two browsers to sign in become A and B
 */

const prisma = new PrismaClient();
const PLAY = process.argv.includes('--play');

const WYR_WARMUP: [string, string][] = [
  ['Watch the sunrise from the balcony', 'Sleep in until the sun is high'],
  ['A long dinner somewhere fancy', 'Street food on the beach'],
  ['Plan every day of the trip', 'Wake up and see where the day goes'],
];

const WYR_PARENTHOOD: [string, string][] = [
  ['Handle every diaper change', 'Handle every 3 a.m. feeding'],
  ['A baby who sleeps through the night', 'A baby who never cries in the car'],
  ['Be the fun parent', 'Be the calm parent'],
  ['Know the first word in advance', 'Be surprised by it'],
  ['Take a photo every day for a year', 'Write one line in a journal every day'],
];

const TRIVIA: { q: string; options: [string, boolean][]; explanation: string }[] = [
  {
    q: 'Roughly how many bones is a newborn born with?',
    options: [['About 206', false], ['About 270–300', true], ['About 150', false], ['About 400', false]],
    explanation: 'Many of them fuse together during childhood, leaving the 206 bones of an adult skeleton.',
  },
  {
    q: 'At birth, a baby sees most clearly at about what distance?',
    options: [['8–12 inches', true], ['3 feet', false], ['Across the room', false], ['Only a few millimetres', false]],
    explanation: 'That happens to be about the distance to a parent’s face during feeding.',
  },
  {
    q: 'Whose voice can a newborn already recognize?',
    options: [['Nobody’s yet', false], ['Their mother’s', true], ['Only other babies’', false], ['Any adult’s equally', false]],
    explanation: 'Babies hear in the womb during the third trimester and prefer the voice they heard most.',
  },
  {
    q: 'What is the most common eye color at birth, worldwide?',
    options: [['Blue', false], ['Green', false], ['Brown', true], ['Gray', false]],
    explanation: 'Blue-eyed newborns are common in some populations, but globally brown is the most common.',
  },
];

const NAMES: { name: string; origin: string[]; meaning: string; notes: string }[] = [
  { name: 'Juniper', origin: ['English'], meaning: 'Juniper tree', notes: 'A nature name with an easy nickname, June. Bright, a little whimsical.' },
  { name: 'Theo', origin: ['Greek'], meaning: 'Gift of God', notes: 'Short form of Theodore that stands on its own. Soft sound, two syllables.' },
  { name: 'Isla', origin: ['Scottish'], meaning: 'Island', notes: 'Pronounced EYE-la. Gentle and short; spelling can trip people up.' },
  { name: 'Rowan', origin: ['Irish', 'Scottish Gaelic'], meaning: 'Little red one', notes: 'Also a tree name. Works across cultures and is used for any gender.' },
  { name: 'Mira', origin: ['Latin', 'Sanskrit', 'Slavic'], meaning: 'Wonderful; peace', notes: 'Appears independently in several languages, so it travels well.' },
  { name: 'Ezra', origin: ['Hebrew'], meaning: 'Help', notes: 'Classic but uncommon. The z gives it energy.' },
  { name: 'Wren', origin: ['English'], meaning: 'Small songbird', notes: 'One syllable, very short. Pairs well with a longer middle name.' },
  { name: 'Felix', origin: ['Latin'], meaning: 'Lucky, happy', notes: 'Cheerful meaning and recognized in many European languages.' },
];

// Partner B's round-1 votes, so partner A's votes complete the round in the demo
const B_VOTES = ['love', 'love', 'maybe', 'love', 'nope', 'maybe', 'love', 'nope'] as const;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (process.env.NODE_ENV === 'production' || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Refusing to seed demo data: not a local database.');
    process.exit(1);
  }

  console.log('Clearing tables...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE app_config, wyr_votes, wyr_prompts, letters, letter_prompts,
      photo_prompt_responses, photo_prompts, photos, name_game_votes, name_game_guidance,
      name_game_names, name_game_rounds, trivia_answers, trivia_envelope_questions,
      trivia_questions, gender_reveal_configs, envelopes, participants,
      friend_thank_you_notes, friend_letters, friends CASCADE`);

  await prisma.appConfig.createMany({
    data: [
      { key: 'guest_pin', value: DEMO_PINS.guest },
      { key: 'admin_pin', value: DEMO_PINS.admin },
    ],
  });

  // Friends and their letters
  const maya = await prisma.friend.create({
    data: { id: DEMO_PARTICIPANTS.maya.friendId, name: 'Maya', pin: DEMO_PINS.friendMaya, isGenderKeeper: true },
  });
  const jordan = await prisma.friend.create({ data: { name: 'Jordan', pin: DEMO_PINS.friendJordan } });
  await prisma.friend.create({ data: { name: 'Sam', pin: DEMO_PINS.friendSam } });

  const mayaToBaby = await prisma.friendLetter.create({
    data: {
      friendId: maya.id,
      recipient: 'baby',
      title: 'For when you are old enough to read this',
      content:
        'Little one — your parents spent a whole week on a beach arguing happily about your name ' +
        'and building you a box of letters. You were loved long before you arrived. I can’t wait to meet you.\n\nAuntie Maya',
      submittedAt: new Date(),
    },
  });
  await prisma.friendLetter.create({
    data: {
      friendId: jordan.id,
      recipient: 'partner',
      title: 'Advice nobody asked for',
      content: 'Sleep when the baby sleeps is a myth. Eat when the baby sleeps. Trust me on this one.',
      submittedAt: new Date(),
    },
  });
  await prisma.friendLetter.create({
    data: {
      friendId: maya.id,
      recipient: 'you',
      title: 'Draft — still working on it',
      content: 'I’ve started this three times...',
    },
  });

  // Participants. In --play mode the partners are left for real sign-ins to claim.
  await Promise.all([
    prisma.participant.create({
      data: { id: DEMO_PARTICIPANTS.admin.id, deviceFingerprint: DEMO_PARTICIPANTS.admin.fingerprint, role: 'admin' },
    }),
    prisma.participant.create({
      data: { id: DEMO_PARTICIPANTS.maya.id, deviceFingerprint: DEMO_PARTICIPANTS.maya.fingerprint, role: 'friend', friendId: maya.id },
    }),
  ]);
  const partners = PLAY
    ? null
    : await Promise.all(
        (['a', 'b'] as const).map((k) =>
          prisma.participant.create({
            data: {
              id: DEMO_PARTICIPANTS[k].id,
              deviceFingerprint: DEMO_PARTICIPANTS[k].fingerprint,
              designation: DEMO_PARTICIPANTS[k].designation,
              role: 'guest',
            },
          }),
        ),
      );

  // `order` is the position in the pile; the completed warm-up sits near the back
  const envelope = (order: number, title: string, type: string, status = 'sealed', friendLetterId?: string) =>
    prisma.envelope.create({ data: { title, type, status, order, friendLetterId } });

  // Warm-up would-you-rather, already completed by both partners (sealed in --play mode)
  const wyr1 = await envelope(6, 'Warm-up: Would You Rather', 'would-you-rather', partners ? 'completed' : 'sealed');
  for (const [i, [optionA, optionB]] of WYR_WARMUP.entries()) {
    const prompt = await prisma.wyrPrompt.create({ data: { envelopeId: wyr1.id, optionA, optionB, sortOrder: i } });
    if (!partners) continue;
    const [pa, pb] = partners;
    await prisma.wyrVote.createMany({
      data: [
        { promptId: prompt.id, participantId: pa.id, choice: 'option_a' },
        { promptId: prompt.id, participantId: pb.id, choice: i === 1 ? 'option_a' : 'option_b' },
      ],
    });
  }

  // Parenthood would-you-rather (fresh)
  const wyr2 = await envelope(1, 'Would You Rather: Parenthood Edition', 'would-you-rather');
  await prisma.wyrPrompt.createMany({
    data: WYR_PARENTHOOD.map(([optionA, optionB], i) => ({ envelopeId: wyr2.id, optionA, optionB, sortOrder: i })),
  });

  // Name game, round 1 generated; partner B has already voted (unless --play)
  const nameGame = await envelope(2, 'The Name Game', 'name-game', 'opened');
  const round = await prisma.nameGameRound.create({
    data: { envelopeId: nameGame.id, roundNumber: 1, status: 'ready' },
  });
  for (const [i, n] of NAMES.entries()) {
    const created = await prisma.nameGameName.create({ data: { roundId: round.id, ...n, sortOrder: i } });
    if (partners) {
      await prisma.nameGameVote.create({ data: { nameId: created.id, participantId: partners[1].id, choice: B_VOTES[i] } });
    }
  }

  // Trivia
  const trivia = await envelope(3, 'Baby Trivia', 'trivia');
  for (const [i, t] of TRIVIA.entries()) {
    const q = await prisma.triviaQuestion.create({
      data: {
        questionText: t.q,
        options: t.options.map(([text, isCorrect]) => ({ text, isCorrect })),
        explanation: t.explanation,
      },
    });
    await prisma.triviaEnvelopeQuestion.create({ data: { envelopeId: trivia.id, questionId: q.id, sortOrder: i } });
  }

  // Letter to the baby
  const letter = await envelope(4, 'A Letter to Our Baby', 'letter');
  await prisma.letterPrompt.create({
    data: { envelopeId: letter.id, prompt: 'What do you most want our baby to know about the two of us, right now, before everything changes?' },
  });

  // Photo prompt
  const photo = await envelope(5, 'Golden Hour', 'photo-prompt');
  await prisma.photoPrompt.create({
    data: { envelopeId: photo.id, prompt: 'Take a photo of the place on this trip you’d most like to bring the baby back to one day.' },
  });

  // A friend's letter, delivered as its own envelope
  await envelope(7, 'A letter from Maya', 'friend-letter', 'sealed', mayaToBaby.id);

  // Gender reveal: Maya (the keeper) has set the value; each partner holds a key
  const reveal = await envelope(8, 'The Big Reveal', 'gender-reveal');
  await prisma.genderRevealConfig.create({
    data: {
      envelopeId: reveal.id,
      keyA: await hashKey(DEMO_REVEAL_KEYS.keyA),
      keyB: await hashKey(DEMO_REVEAL_KEYS.keyB),
      genderValue: 'girl',
      setByFriendId: maya.id,
    },
  });

  console.log(`Seeded 8 envelopes and 3 friends${PLAY ? '; partners will be assigned on sign-in' : ', with partners A and B'}.`);
  console.log(`Guest PIN ${DEMO_PINS.guest} · Admin PIN ${DEMO_PINS.admin} · Friend PIN (Maya) ${DEMO_PINS.friendMaya}`);
  console.log(`Reveal keys: A ${DEMO_REVEAL_KEYS.keyA}, B ${DEMO_REVEAL_KEYS.keyB}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
