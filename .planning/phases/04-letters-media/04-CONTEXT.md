# Phase 4: Letters to Baby & Media - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users write letters with text and photos; media library provides browsing and slideshow. Letters have admin-created prompts, each partner writes their own response, and they see each other's letters after both submit. Photos are uploaded to Azure Blob Storage and can be attached to letters or browsed in a dedicated media envelope.

</domain>

<decisions>
## Implementation Decisions

### Letter writing experience
- Simple textarea, no formatting — intimate like a handwritten note
- Admin-created prompts for each letter envelope (e.g., "What do you hope for baby?")
- Two letters per envelope — each partner writes their own response to the prompt
- Reveal after both submit — like WYR, see partner's letter only after you've written yours

### Photo attachment flow
- Photos attached below letter text (not inline)
- One photo per letter — simple, focused
- Upload new or pick from existing library
- Progress bar during upload — visual percentage indicator

### Media library & slideshow
- Grid of thumbnails layout
- Lives inside its own special envelope (not top-level nav)
- Manual swipe to advance in slideshow — user controls pace
- Shuffle option available for random order viewing

### Spotify integration
- Floating button (corner placement)
- Opens Spotify app/web directly — no embedded player
- Only visible when admin has configured a playlist URL
- Button styled to match app theme (Golden Hour aesthetic, not Spotify green)

### Claude's Discretion
- Exact grid dimensions and thumbnail sizing
- Letter textarea placeholder text and height
- Auto-save debounce timing
- Slideshow transition animation style
- Floating button exact position and size

</decisions>

<specifics>
## Specific Ideas

- Letter reveal flow mirrors WYR — familiar pattern for users
- Media envelope is "special" — different from activity envelopes but uses same system
- One photo per letter keeps focus on the words, photo is accent

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-letters-media*
*Context gathered: 2026-02-08*
