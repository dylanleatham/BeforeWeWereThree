import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Anthropic API wrapper for AI-powered baby name generation
 *
 * Isolated service — never called from routes directly, only from nameGame.ts service.
 * Follows the locked prompt contract from docs/babymoon_portal_feature_blueprint.md Section 10.
 */

// ============================================================
// Response schema (matches Section 10.4 output schema)
// ============================================================

const nameResponseSchema = z.object({
  names: z.array(z.object({
    name: z.string(),
    origin: z.array(z.string()),
    meaning: z.string(),
    notes: z.string(),
  })),
});

export type AINameResponse = z.infer<typeof nameResponseSchema>;

// ============================================================
// Parameters
// ============================================================

export interface GenerateNamesParams {
  count: number;
  excludeNames: string[];       // Names already shown in any round
  participantGuidance?: Array<{ guidance: string }>; // Free-text from participants for subsequent rounds
}

// ============================================================
// Prompt composition (Section 10.3)
// ============================================================

/**
 * System prompt — Section 10.1 + 10.2 + 10.6
 * Defines role, tone, neutrality rules, and constraints.
 * This prompt is not user-editable.
 */
function buildSystemPrompt(): string {
  return `You are a neutral baby name ideation assistant. Your role is to broaden name exploration while respecting participant decisions.

Rules:
- No ranking, scoring, or prioritization of names
- No persuasive or opinionated language
- Neutral, factual tone
- Names are presented as discussion starters only
- Common, rare, traditional, modern, and pop-culture-adjacent names are all allowed
- No filtering based on popularity, trendiness, or media presence
- If origin or meaning is debated or uncertain, respond conservatively
- Return fewer names rather than violating constraints
- Do not include apologies, explanations, or meta-commentary`;
}

/**
 * User prompt — Section 10.3 (B + C + D layers)
 * Composed from base context, session state, and optional user guidance.
 */
function buildUserPrompt(params: GenerateNamesParams): string {
  const parts: string[] = [];

  // B. Base context (fixed for this app)
  parts.push(
    'Generate baby names with diverse cultural origins. Names should function comfortably across cultures. Provide concise, factual notes about each name including observations about sound, feel, or cross-cultural usability.'
  );

  // Count
  parts.push(`Generate exactly ${params.count} names.`);

  // C. Session state — exclusion list
  if (params.excludeNames.length > 0) {
    parts.push(
      `Do NOT include any of these names (already shown): ${params.excludeNames.join(', ')}`
    );
  }

  // D. Round tweaks — participant guidance
  if (params.participantGuidance && params.participantGuidance.length === 1) {
    parts.push(`Additional guidance for this round: ${params.participantGuidance[0]!.guidance}`);
  } else if (params.participantGuidance && params.participantGuidance.length >= 2) {
    const half = Math.ceil(params.count / 2);
    const otherHalf = params.count - half;
    parts.push(
      `Two participants have each provided their own preferences for this round.\n\n` +
      `Participant A's preferences: ${params.participantGuidance[0]!.guidance}\n` +
      `Participant B's preferences: ${params.participantGuidance[1]!.guidance}\n\n` +
      `Generate ${half} names inspired by Participant A's preferences and ${otherHalf} names inspired by Participant B's preferences. ` +
      `Each name should clearly reflect the preference it was generated for. ` +
      `Interleave the names in the output — do not group them by participant.`
    );
  }

  return parts.join('\n\n');
}

// ============================================================
// JSON schema for structured outputs (Section 10.4)
// ============================================================

const NAME_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    names: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          origin: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          meaning: { type: 'string' as const },
          notes: { type: 'string' as const },
        },
        required: ['name', 'origin', 'meaning', 'notes'] as const,
        additionalProperties: false,
      },
    },
  },
  required: ['names'] as const,
  additionalProperties: false,
};

// ============================================================
// Main export
// ============================================================

/**
 * Generate baby names using the Anthropic API with structured outputs.
 *
 * Uses output_config.format with json_schema for guaranteed valid JSON
 * via constrained decoding. No retry logic needed.
 *
 * @throws Error if ANTHROPIC_API_KEY is not set
 * @throws Error if API call fails
 * @throws z.ZodError if response doesn't match expected schema
 */
export async function generateNames(params: GenerateNamesParams): Promise<AINameResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const message = process.env.NODE_ENV === 'production'
      ? 'AI name generation is not available. Please contact the administrator.'
      : 'ANTHROPIC_API_KEY environment variable is not set. Add it to your server/.env file.';
    throw new Error(message);
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(params);

  logger.info(`Generating ${params.count} names with model ${model}`, {
    excludeCount: params.excludeNames.length,
    guidanceCount: params.participantGuidance?.length ?? 0,
  });

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: NAME_JSON_SCHEMA,
        },
      },
    });
  } catch (err) {
    logger.error('Anthropic API call failed', { error: err });
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AI name generation failed. Please try again later.');
    }
    throw err;
  }

  // Structured outputs guarantee valid JSON in response.content[0].text
  const firstBlock = response.content[0] as { type: string; text?: string } | undefined;
  if (!firstBlock || firstBlock.type !== 'text') {
    const detail = `Unexpected response content type: ${firstBlock?.type ?? 'empty'}`;
    logger.error(detail);
    throw new Error(
      process.env.NODE_ENV === 'production'
        ? 'AI name generation failed. Please try again later.'
        : detail
    );
  }

  const parsed = JSON.parse(firstBlock.text!) as unknown;
  const validated = nameResponseSchema.parse(parsed);

  logger.info(`Generated ${validated.names.length} names successfully`);

  return validated;
}
