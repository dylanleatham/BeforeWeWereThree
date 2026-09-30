/**
 * Captures the README screenshots from a locally running app with demo data.
 *
 *   1. docker run -d --name bwwt-demo-pg -e POSTGRES_USER=bwwt -e POSTGRES_PASSWORD=demo \
 *        -e POSTGRES_DB=bwwt_demo -p 5433:5432 postgres:16-alpine
 *   2. server/.env.demo with DATABASE_URL, JWT_SECRET, NODE_ENV=development (see README)
 *   3. migrate + `npm run db:seed:demo` in server/, start the API and the client
 *   4. npx tsx scripts/demo-screenshots.ts [scene ...]
 *
 * Drives an installed Edge or Chrome (no browser download). Each partner gets their own
 * browser context with a session minted for a seeded participant, because two windows on
 * one machine would otherwise share a device fingerprint and count as the same person.
 * Scenes change data, so reseed before a full run.
 */
import { mkdir } from 'node:fs/promises';
import { chromium, type Browser, type Page } from 'playwright-core';
import sharp from 'sharp';
import { SignJWT } from 'jose';
import { DEMO_PARTICIPANTS, DEMO_PINS, DEMO_REVEAL_KEYS } from '../server/prisma/demo-data.js';

const BASE = process.env.DEMO_URL ?? 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-demo-secret-not-used-anywhere-else';
const OUT = 'docs/screenshots';
const PHONE = { width: 390, height: 844 };
const SETTLE_MS = 900;
// Palette PNGs are about half the size of full-colour ones. Below quality 100 the quantizer
// folds small accents into nearby greys (the sage presence dot came out grey).
const PNG_OPTIONS = { palette: true, quality: 100, effort: 10, compressionLevel: 9 } as const;

type Who = 'a' | 'b' | 'admin' | 'maya' | 'nobody';

async function mintSession(who: Exclude<Who, 'nobody'>): Promise<string> {
  const p = DEMO_PARTICIPANTS[who];
  const payload: Record<string, unknown> = {
    participantId: p.id,
    deviceFingerprint: p.fingerprint,
    role: who === 'admin' ? 'admin' : who === 'maya' ? 'friend' : 'guest',
    designation: 'designation' in p ? p.designation : null,
  };
  if ('friendId' in p) payload.friendId = p.friendId;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

async function open(browser: Browser, who: Who, viewport = PHONE): Promise<Page> {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
    colorScheme: 'light',
  });
  if (who !== 'nobody') {
    await context.addCookies([{ name: 'session', value: await mintSession(who), url: BASE }]);
  }
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SETTLE_MS);
  return page;
}

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(SETTLE_MS);
  await sharp(await page.screenshot())
    .png(PNG_OPTIONS)
    .toFile(`${OUT}/${name}.png`);
  console.log(`  saved ${name}.png`);
}

/** Scrolls the page so the given text sits mid-screen, framing the activity rather than the header */
async function frame(page: Page, text: string | RegExp): Promise<void> {
  await page.getByText(text).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

/** Tapping the top of the stack spreads the pile into a list; then open the envelope from it */
async function openEnvelope(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: /^(Open|Play) / }).first().click();
  await page.waitForTimeout(SETTLE_MS);
  await page.getByRole('button', { name: new RegExp(`^(Open|Play) ${title}`) }).click();
  await page.waitForTimeout(2500);
}

const scenes: Record<string, (browser: Browser) => Promise<void>> = {
  async pin(browser) {
    const page = await open(browser, 'nobody');
    await page.locator('input').first().pressSequentially(DEMO_PINS.guest.slice(0, 4), { delay: 60 });
    await shot(page, 'pin-entry');
  },

  async home(browser) {
    const page = await open(browser, 'a');
    await shot(page, 'home-pile');
    await page.getByRole('button', { name: /^Open Would You Rather: Parenthood/ }).click();
    await shot(page, 'home-list');
  },

  async wyr(browser) {
    const [a, b] = [await open(browser, 'a'), await open(browser, 'b')];
    for (const page of [a, b]) await openEnvelope(page, 'Would You Rather: Parenthood Edition');
    await frame(a, /^or$/);
    await shot(a, 'wyr-voting');
    await b.getByRole('button', { name: /3 a\.m\. feeding/ }).click();
    await a.getByRole('button', { name: /diaper change/ }).click();
    await frame(a, "Partner's choice");
    await shot(a, 'wyr-reveal');
  },

  async names(browser) {
    const [page, partner] = [await open(browser, 'a'), await open(browser, 'b')];
    await openEnvelope(partner, 'The Name Game'); // so presence reads "Partner is here"
    await openEnvelope(page, 'The Name Game');
    await frame(page, 'Meaning');
    // Votes are swipes: right = love, left = nope, down = maybe
    const moves = { love: [220, 0], nope: [-220, 0], maybe: [0, 220] } as const;
    const swipe = async (vote: keyof typeof moves, pauseForShot = false): Promise<void> => {
      const box = await page.locator('[aria-label^="Name: "]').first().boundingBox();
      if (!box) throw new Error('No name card on screen');
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const [dx, dy] = moves[vote];
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx * 0.4, y + dy * 0.4, { steps: 8 });
      if (pauseForShot) await shot(page, 'name-game-card');
      await page.mouse.move(x + dx, y + dy, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(900);
    };
    const votes = ['love', 'maybe', 'love', 'love', 'nope', 'maybe', 'love', 'nope'] as const;
    for (const [i, vote] of votes.entries()) await swipe(vote, i === 0);
    await page.waitForTimeout(1500);
    await frame(page, 'You both loved');
    await shot(page, 'name-game-results');
  },

  async trivia(browser) {
    const page = await open(browser, 'a');
    await openEnvelope(page, 'Baby Trivia');
    await page.getByRole('button', { name: /270/ }).click();
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await page.getByText('Did you know?').waitFor();
    await page.waitForTimeout(2500); // answer-reveal animation
    await frame(page, 'Did you know?');
    await shot(page, 'trivia-reveal');
  },

  async letter(browser) {
    const [page, partner] = [await open(browser, 'a'), await open(browser, 'b')];
    await openEnvelope(partner, 'A Letter to Our Baby');
    await openEnvelope(page, 'A Letter to Our Baby');
    await page.getByPlaceholder('Write your letter here...').pressSequentially(
      'Right now we are on a balcony watching the light go gold, ' +
        'arguing about whether you will love the beach as much as we do.',
      { delay: 5 },
    );
    await frame(page, /before everything changes/);
    await shot(page, 'letter-writing');
  },

  async reveal(browser) {
    const page = await open(browser, 'a');
    await openEnvelope(page, 'The Big Reveal');
    // The eighth digit submits the key, so capture the entry screen one digit early
    const input = page.locator('input').first();
    await input.pressSequentially(DEMO_REVEAL_KEYS.keyA.slice(0, 7), { delay: 40 });
    await shot(page, 'reveal-key-entry');
    await input.pressSequentially(DEMO_REVEAL_KEYS.keyA.slice(7));
    await shot(page, 'reveal-waiting');
  },

  async friend(browser) {
    const page = await open(browser, 'maya');
    await shot(page, 'friend-dashboard');
  },

  async admin(browser) {
    const page = await open(browser, 'admin', { width: 1280, height: 860 });
    await shot(page, 'admin');
  },
};

/** README banner: four phone screenshots with rounded corners on the app's warm background */
async function hero(): Promise<void> {
  const shots = ['name-game-card', 'wyr-reveal', 'trivia-reveal', 'reveal-key-entry'];
  const [w, h, gap, pad, radius] = [390, 844, 48, 64, 36];
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}"/></svg>`);
  const outline = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${radius - 1}" fill="none" stroke="#d9c7b0" stroke-width="2"/></svg>`,
  );
  const phones = await Promise.all(
    shots.map((name) =>
      sharp(`${OUT}/${name}.png`).resize(w, h)
        .composite([{ input: mask, blend: 'dest-in' }, { input: outline }])
        .png()
        .toBuffer(),
    ),
  );
  const width = pad * 2 + shots.length * w + (shots.length - 1) * gap;
  const height = pad * 2 + h;
  const shadow = await sharp(
    Buffer.from(
      `<svg width="${width}" height="${height}">${shots
        .map((_, i) => `<rect x="${pad + i * (w + gap)}" y="${pad + 10}" width="${w}" height="${h}" rx="${radius}" fill="#bc6c4a" fill-opacity="0.22"/>`)
        .join('')}</svg>`,
    ),
  )
    .blur(18)
    .png()
    .toBuffer();
  await sharp({ create: { width, height, channels: 4, background: '#faf3e8' } })
    .composite([
      { input: shadow, left: 0, top: 0 },
      ...phones.map((input, i) => ({ input, left: pad + i * (w + gap), top: pad })),
    ])
    .png(PNG_OPTIONS)
    .toFile(`${OUT}/hero.png`);
  console.log('  saved hero.png');
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  if (wanted.length === 1 && wanted[0] === 'hero') return hero();
  const names = wanted.length ? wanted : Object.keys(scenes);
  await mkdir(OUT, { recursive: true });
  const browser = await chromium
    .launch({ channel: 'msedge' })
    .catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    for (const name of names) {
      const scene = scenes[name];
      if (!scene) throw new Error(`Unknown scene "${name}". Scenes: ${Object.keys(scenes).join(', ')}`);
      console.log(name);
      await scene(browser);
    }
  } finally {
    await browser.close();
  }
  if (!wanted.length) await hero();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
