# Babymoon Portal – Feature Blueprint

This document captures the current feature thinking and design direction for the Babymoon web application. It is intended as a living reference that can later be translated into formal spec, design, and backlog documents.

---

## 1. Experience Pillars & Tone

### Core Themes
- **Nostalgia & Reflection**  
  Focus on memories, relationship history, reflective prompts, and keepsakes.
- **Planning & Decision-Making**  
  Structured, collaborative activities that help make decisions together (e.g., baby names).

### Emotional Design Goals
- Encourage conversation, eye contact, and shared reflection
- Avoid passive scrolling; favor prompts and turn-based interactions
- Balance playfulness with sincerity ("fun, not goofy")

### Visual & Interaction Tone
- Bright, warm color palette (sunrise / coastal / babymoon energy)
- Gentle motion and celebratory transitions (reveals, envelope opens)
- Large touch targets, minimal text density, one-handed use

---

## 2. Access Model

### PIN-Based Entry
- **Guest PIN**: Required to access the app during the trip
- **Admin / Host PIN**: Unlocks configuration and secret setup

### Participants
- Exactly two participants (e.g., Dylan and partner)
- Two-device real-time sync is supported so each person can participate independently

---

## 3. Global App Elements

### Spotify Playlist
- One global Spotify playlist link
- Configured in Admin mode
- Accessible from anywhere in the app (e.g., persistent header button)
- Not tied to specific moments or activities

### Media Library
- Photos and videos uploaded directly into the app (Approach 1)
- Media can be:
  - Shown in slideshow shuffle mode
  - Attached to activities (envelopes, letters, etc.)
  - Randomly surfaced as "memory cards" throughout the experience

---

## 4. Activity Modules

### A. Dramatic Gender Reveal (Two-Key Unlock)

**Concept**  
A highly ceremonial reveal that requires both participants to unlock.

**Experience Goals**
- Build anticipation and tension
- Ensure the reveal feels like a "moment," not just a screen

**Flow**
1. Activity starts locked
2. Each participant enters their key (same device or separate devices)
3. Once both keys are validated server-side:
   - Full-screen transition (fade-out of UI chrome)
   - Countdown or breathing-style animation
   - Dramatic reveal sequence
   - Final reveal screen ("It’s a …") with celebratory effects
4. Activity becomes completed and optionally replayable

**Host Controls**
- Set the gender value
- Set or generate two keys
- Optional reveal availability window

**Security / Spoiler Prevention**
- Gender value stored server-side only
- Not delivered to clients until both keys are validated

---

### B. Activity Envelopes

**Concept**  
Envelopes act as a playful, ceremonial container for activities rather than moment-based triggers. Each envelope clearly indicates the activity it contains (e.g., trivia, would-you-rather, letter prompts).

**Experience Goals**
- Preserve the tactile, intentional feel of opening something together
- Make activities feel special without relying on contextual timing
- Encourage exploration without enforcing a rigid flow

**Envelope Model**
- The app supports **any number of envelopes**, configurable over time
- **Multiple envelopes per activity type** are supported (e.g., multiple Trivia envelopes, multiple Letter to Baby envelopes)
- New envelopes can be created during the trip via Admin/Host mode

**Envelope Structure**
- Title reflecting the activity (e.g., "Would You Rather", "Baby Trivia", "Letter to Baby")
- Optional subtitle or prompt preview
- Optional associated photo(s) or illustration
- Activity type reference (links to the underlying module)
- Optional suggested order index

**Availability & Order**
- All envelopes are **freely openable** once the app is unlocked
- No hard ordering or prerequisites by default
- A **suggested order** may be displayed visually (e.g., subtle numbering or grouping), but does not block access

**Completion Rules**
- Envelope is marked completed when the contained activity is completed
- Completion may require both participants, depending on the activity
- Completed envelopes remain accessible for review

**UX Notes**
- Envelope list presented as a collection of sealed envelopes
- Opening animation transitions directly into the activity
- Completed envelopes visually change state (opened / stamped / archived)

---



### C. AI-Powered Baby Name Game

**Concept**  
A playful, structured game to explore baby names collaboratively.

**Experience Goals**
- Reduce decision pressure
- Make discussion easier by surfacing structure (matches vs conflicts)

**Core Loop**
1. Start a name round
2. App generates a batch of names via AI
3. Each name is presented as a card with:
   - Name
   - AI-generated notes (origin, meaning, cultural context, vibe)
   - Actions: **Love / Maybe / Nope**
4. Each participant votes independently
5. Each presses **Complete Voting**
6. Results screen appears once both are complete

**Results Views**
- **Matches**: both selected Love
- **Conflicts**: Love vs Nope (or Love vs Maybe)
- **Shortlist**: Matches + starred favorites

**AI Prompt Design**
- Base prompt includes:
  - Cultural context of the baby
  - High-level naming rules
  - Structured JSON response requirements
- Player-provided tweak input per round
- App avoids repeating previously shown names

---

### D. Slideshow (Shuffle Mode)

- Shuffle-based slideshow of uploaded photos and videos
- Used as a standalone activity and as ambient context
- Random “memory cards” may appear between activities

---

### E. Letters to Baby

**Concept**  
Personal written keepsakes created during the trip.

**Flow**
1. Open Letters activity
2. Prompt is displayed (admin-configured)
3. Each participant writes their own letter
4. Optional photo attachment
5. Letter is saved for export

**Export**
- Letters included in a post-trip keepsake

---

### F. Parenthood-Themed “Would You Rather”

**Flow**
1. Prompt with two options is shown
2. Each participant selects an option
3. Once both have answered:
   - Answers are revealed side-by-side
4. Prompt is marked complete

---

### G. Trivia (Baby Facts)

**Flow**
1. Trivia question is shown
2. Participant answers
3. Correct answer and explanation revealed

**Content Source**
- Initially curated trivia bank

---

## 5. Offline & Sync Requirements


### Offline Support
- App shell cached as a PWA
- Current trip session data cached locally
- Thumbnails and recently used media cached
- Writes queued while offline and synced when reconnected

### Real-Time Sync
- Two-device synchronization for:
  - Votes
  - Unlocks
  - Answers
- Append-only event model preferred to minimize conflicts

---

## 6. Admin / Host Mode (Initial Scope)

Admin tools enable experimentation and future expansion.

**Minimum Capabilities**
- Set Guest PIN and Admin PIN
- Configure global Spotify playlist
- Upload and manage media library
- Create/edit:
  - Open When envelopes
  - Would You Rather prompts
  - Trivia questions
  - Letter prompts
- Configure Gender Reveal (value, keys, availability)

---

## 7. Key Architectural Implications

Because the app includes:
- Offline caching
- Real-time two-device sync
- AI-generated content
- Media uploads
- Secret reveals

The system must be:
- Backend-backed (not static-only)
- Data-driven (activities defined by content, not hardcoded pages)
- Extensible to support new activity types later

---

## 8. Current Defaults (Unless Changed Later)

- Exactly two participants
- Two-key gender reveal supported on same or separate devices
- Name AI returns structured JSON with notes and tags
- Slideshow is shuffle-only for v1
- Approximately 15 pre-created “Open When…” envelopes
- Envelope completion requires both participants to mark done

---

## 9. V1 Envelope Catalog (Initial Content Set)

This section defines the initial set of envelopes intended for the first complete Babymoon experience. These envelopes establish tone, pacing, and emotional range. Additional envelopes can be added at any time via Admin/Host mode.

### 1. Milestone Envelope

1. **The Big Reveal**  
   Contains the Dramatic Gender Reveal activity. This envelope is locked until both keys are entered.

---

### 2. Would You Rather Envelopes

These envelopes are designed to spark lighthearted but meaningful conversations about becoming parents.

2. **Would You Rather #1 – Early Days**  
   Focus: newborn stage preferences, instincts, and expectations.

3. **Would You Rather #2 – Parenting Styles**  
   Focus: routines, boundaries, and how each of you imagines showing care.

4. **Would You Rather #3 – Looking Ahead**  
   Focus: toddler and childhood scenarios, values, and priorities.

---

### 3. Baby Trivia Envelopes

These envelopes provide fun, surprising, and reassuring baby-related facts.

5. **Baby Trivia #1 – Pregnancy & Newborn Facts**  
   Short, accessible facts intended to educate without overwhelming.

6. **Baby Trivia #2 – Development & Milestones**  
   Focus on how babies grow and change in their first year.

7. **Baby Trivia #3 – Gentle Reassurances**  
   Facts framed to normalize uncertainty and reduce anxiety.

---

### 4. Letters to Baby Envelopes

These envelopes create lasting keepsakes tied to reflection and emotion.

8. **Letter to Baby – Before We Meet You**  
   Prompt theme: feelings, hopes, and thoughts before the baby’s arrival.

9. **Letter to Baby – Our Promises**  
   Prompt theme: values, intentions, and how you hope to show love.

10. **Letter to Baby – This Babymoon**  
    Prompt theme: what this trip means and how it felt preparing together.

Each letter supports optional photo attachment (taken in the moment or selected from the library).

---

### 5. Relationship & Reflection Envelopes

These envelopes emphasize nostalgia and partnership.

11. **Us, Then and Now**  
    Prompt theme: reflecting on how your relationship has grown and changed.

12. **What We’re Most Excited About**  
    Prompt theme: shared excitement and anticipation about parenthood.

---

### 6. Baby Name Game Envelope

13. **Baby Name Game**  
    A single, reusable envelope that launches the AI-powered Baby Name Game. The activity supports multiple rounds internally (exploratory, refined, shortlist) without requiring multiple envelopes.

---

**Notes**
- Envelope numbering represents a *suggested* order only.
- Any envelope can be opened at any time unless explicitly locked.
- The Baby Name Game envelope may be revisited multiple times during the trip.
- Additional envelopes of any type can be created during the trip.

---

## 10. AI Baby Name Game – Prompt Contract (Locked)

This section defines the final, locked contract for the AI-powered Baby Name Game. It governs how name suggestions are generated, constrained, and presented. This contract is implementation-binding and should not be altered without revisiting product intent.

---

### 10.1 AI Role & Intent

The AI acts as a **neutral baby name ideation assistant**, not a decision-maker.

**Core principles:**
- No ranking, scoring, or prioritization of names
- No persuasive or opinionated language
- Neutral, factual tone
- Names are presented as discussion starters only

The AI’s role is to broaden exploration while respecting participant decisions.

---

### 10.2 Hard Constraints (Always Enforced)

The AI must **never** suggest names that:
- Have already appeared earlier in the same trip session
- Were declined by **both** participants in any prior round

Additional constraints:
- No name repetition across rounds
- Common, rare, traditional, modern, and pop-culture-adjacent names are all allowed
- No filtering based on popularity, trendiness, or media presence
- Output must be strictly valid JSON
- No explanatory prose outside the JSON payload

---

### 10.3 Prompt Composition Model

Each name-generation request is composed of four layered inputs.

#### A. System Prompt (Fixed)
Defines role, tone, neutrality rules, and output formatting. This prompt is not user-editable.

#### B. Base Context (Fixed for the App)
Encodes the values of the app, including:
- Cultural background of the baby
- Preference for names that function comfortably across cultures
- Requirement for concise, factual notes
- Instruction to remain neutral and non-directive

#### C. Session State (Dynamic, App-Generated)
Provided on every request:
- List of names already shown during the trip
- List of names mutually declined by both participants
- Optional shortlist names (for awareness only, not exclusion)

The AI is stateless; the application enforces continuity using this data.

#### D. Round Tweaks (User-Provided, Lightly Normalized)
Free-text input provided by participants (e.g., "more androgynous sounding names", "avoid overly formal names").

- The app lightly normalizes this input into constraint-style instructions
- The AI silently complies without explaining how the tweak was applied

---

### 10.4 Output Schema (Strict)

The AI must return a single JSON object with the following structure:

```json
{
  "names": [
    {
      "name": "Amara",
      "origin": ["Igbo", "Latin"],
      "meaning": "Grace; eternal",
      "notes": "Soft vowel sounds with a confident rhythm; commonly used across multiple cultures."
    }
  ]
}
```

**Field requirements:**
- `name` (string, required)
- `origin` (array of strings; best-effort, factual; may include multiple origins)
- `meaning` (short, factual description)
- `notes` (neutral observations about sound, feel, or cross-cultural usability)

**Explicit omissions (by design):**
- No pronunciation field
- No gender classification
- No ranking, scoring, or recommendation language

If an origin or meaning is debated or uncertain, the AI should respond conservatively.

---

### 10.5 Batch Behavior

- Names are generated in small batches (controlled by the app)
- Multiple rounds may occur within the same Baby Name Game envelope
- The AI must return fewer names if constraints cannot be fully satisfied
- The AI must not invent or repeat names to fill a quota

---

### 10.6 Error & Edge Handling

If full compliance is not possible:
- Return a reduced list rather than violating constraints
- Maintain valid JSON output
- Do not include apologies, explanations, or meta-commentary

---

This prompt contract is considered **locked** and serves as the definitive reference for implementation.

---

This document reflects the current agreed direction and is intended to be saved as a reference point before formal specification and implementation planning.

