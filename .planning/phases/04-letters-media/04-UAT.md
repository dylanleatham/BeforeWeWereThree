---
status: testing
phase: 04-letters-media
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md
started: 2026-02-08T20:30:00Z
updated: 2026-02-08T20:35:00Z
---

## Current Test

number: 5
name: Write Letter with Auto-save
expected: |
  Open a letter envelope. Type in the text area.
  After 1-2 seconds of inactivity, "Saved at X:XX pm" indicator appears.
awaiting: user response

## Tests

### 1. Upload a Photo
expected: Click upload button, select image, see progress bar, photo appears in grid after upload
result: skipped
reason: Azure Storage not configured for local dev

### 2. View Photo Grid
expected: Multiple uploaded photos display in a responsive grid (3 columns desktop, 2 mobile). Clicking a photo opens slideshow.
result: skipped
reason: Azure Storage not configured for local dev

### 3. Slideshow with Zoom and Navigation
expected: In slideshow, use arrows or swipe to navigate. Zoom in/out works. Thumbnails appear at bottom.
result: skipped
reason: Azure Storage not configured for local dev

### 4. Shuffle Slideshow Order
expected: Toggle "Shuffle" option. Slideshow plays photos in random order rather than chronological.
result: skipped
reason: Azure Storage not configured for local dev

### 5. Write Letter with Auto-save
expected: Open a letter envelope. Type in the text area. After 1-2 seconds of inactivity, "Saved at X:XX pm" indicator appears.
result: [pending]

### 6. Attach Photo to Letter
expected: In letter writing, click photo attachment area. Select from library or upload new. Photo appears below the text area.
result: skipped
reason: Azure Storage not configured for local dev

### 7. Submit Letter
expected: Click Submit button. See "Letter Sent!" waiting screen. If partner hasn't submitted yet, shows waiting message.
result: [pending]

### 8. Letter Reveal (Both Submitted)
expected: After both participants submit letters, both letters display side by side with smooth reveal animation.
result: [pending]

### 9. Letter Complete Screen
expected: After reading revealed letters, see completion screen with warm messaging before returning to envelope pile.
result: [pending]

### 10. Spotify Button Visible
expected: Floating button appears in bottom-right corner of guest view. Uses warm/golden color theme (not Spotify green).
result: [pending]

### 11. Spotify Button Opens Playlist
expected: Clicking the Spotify button opens the configured Spotify playlist URL in a new tab.
result: [pending]

### 12. Admin Configure Spotify URL
expected: Admin can set/update Spotify URL via API or admin interface. URL persists and Spotify button uses it.
result: [pending]

### 13. Reset Session Clears Letters
expected: Admin resets session. Letters are deleted. Letter envelopes return to sealed state. Photos persist (not deleted).
result: [pending]

### 14. Media Envelope Type Exists
expected: Admin can create envelope with type 'media'. Guest opening it sees the media library activity.
result: [pending]

## Summary

total: 14
passed: 0
issues: 0
pending: 9
skipped: 5

## Gaps

[none yet]
