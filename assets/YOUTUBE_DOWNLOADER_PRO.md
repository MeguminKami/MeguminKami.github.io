# Youtube Downloader Pro — Complete App Specification

## 1) App Overview

**Youtube Downloader Pro** is a desktop application built in Python for downloading YouTube content with a polished modern UI.  
It supports:

- Single video downloads
- Playlist downloads
- Video or audio-only modes
- Quality selection
- Queue-based workflow
- Real-time progress feedback
- Dependency installation flow (yt-dlp guided installer)

The app is designed for clarity and ease of use, with a clean, card-based interface and strong visual hierarchy.

---

## 2) Core Product Purpose

The app solves a simple user problem:

1. User provides a YouTube URL
2. User chooses download preferences
3. App adds task(s) to queue
4. App downloads while showing detailed progress

It aims to make technical download operations feel intuitive through guided dialogs and visual feedback.

---

## 3) Primary User Flows

## 3.1 Dependency Installation Flow (First-run / Missing dependency)

If required dependency (yt-dlp) is not available, user sees an **Installer Dialog**.

### Installer Dialog behavior

- Modal dialog attached to parent window
- Prevents accidental closing while installation is running
- Shows:
  - Header: “Installing yt-dlp”
  - Status line
  - Scrollable log output (live)
- Installation runs in background thread
- Progress callback updates:
  - Log textbox
  - Status label
- Completion states:
  - **Success**:
    - Displays success message
    - Auto closes shortly
    - Calls success callback
  - **Failure**:
    - Displays error details in log
    - Shows Retry and Exit buttons
    - Retry clears log and restarts install
    - Exit triggers failure callback

### UX intention

- Keep user informed during technical setup
- Avoid blocking UI thread
- Provide clear recovery path on failure

---

## 3.2 Download Configuration Flow

When user submits a URL and video metadata is available, app opens **Options Dialog**.

### Options Dialog structure

- Modal centered window
- Scrollable content layout with card sections
- Displays media title
- If playlist: shows total number of videos

### User choices

#### A) Download type

- Video (MP4)
- Audio only (MP3)

Switching type toggles relevant quality section visibility.

#### B) Playlist options (only for playlist URLs)

- Download videos separately
- Merge all into one file
- Optional custom name for merged output

#### C) Video quality

For single videos:

- App fetches actual available formats asynchronously
- Shows dynamic options from yt metadata (resolution/fps/container style label)
- Stores selected format_id for precise download
- Marks incompatible options as disabled if no compatible audio stream
- Auto-selects first compatible option

Fallback behavior if dynamic formats unavailable:

- Shows static quality options:
  - 1080p
  - 720p
  - 480p
  - 360p

For playlists:

- Static quality options only (height-based), because per-item format probing isn’t used in this dialog stage

#### D) Audio quality (when Audio mode selected)

- 320 kbps (High)
- 192 kbps (Medium, default)
- 128 kbps (Low)

### Add-to-Queue action logic

- Validates selected video format availability if required
- Handles “requires merge but no compatible audio” error state
- Builds queue items with normalized metadata:
  - URL
  - item type (video/audio)
  - quality / format IDs
  - height / quality label
  - playlist flags
  - merge behavior
  - custom name
  - title

Playlist behavior:
- **Separate mode**: creates one queue item per entry
- **Merge mode**: creates one playlist queue item

Cancel behavior:
- Returns empty result and closes dialog

---

## 3.3 Download Progress Flow

When queue starts processing, user sees **Progress Dialog**.

### Progress Dialog content

- Header with download icon + title (“Download in Progress”)
- Queue status label (“Preparing...” etc.)
- Current item card
- Overall progress card:
  - Percentage
  - Progress bar
- Stats row:
  - Speed
  - Time Left (ETA)
  - Downloaded size
  - Total size
- Helper status message at bottom

### UX behavior

- Modal and non-closable by standard window close
- Clear real-time feedback
- Designed for confidence during long downloads

---

## 4) Data & Download Item Model Intent

The app creates download tasks using a structured item model (DownloadItem).  
Fields represented in workflow include:

- `url`
- `item_type` (video/audio)
- `quality` (format_id when available)
- `audio_format` (kbps selection)
- `is_playlist`
- `merge_playlist`
- `custom_name`
- `title`
- `quality_label`
- `height`
- `requires_merge`
- `selected_audio_format_id`
- `selected_video_format_id`

This model allows both simple fallback download logic and advanced format-specific downloading.

---

## 5) Visual Design System

## 5.1 Design language

The app uses a modern desktop UI aesthetic:

- Rounded cards and containers
- Layered surfaces
- Strong spacing rhythm
- Clear typography hierarchy
- Accent-driven highlights
- Minimal visual clutter

## 5.2 Color system

Theme system supports **Dark** and **Light** modes with a shared semantic palette.

### Dark theme

- Background: deep navy
- Surface: muted blue-slate
- Hover: slightly brighter slate
- Accent blue: bright cyan-blue
- Accent purple: vibrant violet
- Text primary: white
- Text secondary: cool desaturated blue-gray
- Text tertiary: muted gray-blue

### Light theme

- Background: soft gray
- Surface: white
- Hover: pale gray
- Accent blue and purple preserved for brand continuity
- Text roles adapted for contrast

## 5.3 Theme behavior

- ThemeManager stores current mode
- Toggle switches mode and appearance globally
- Registered callbacks update UI components reactively

---

## 6) Micro-Interactions & Reusable UI Behavior

## 6.1 Tooltips

Reusable tooltip helper:

- Appears on hover near cursor
- Uses themed surface + text colors
- Dismisses on pointer leave

Purpose:
- Explain controls without cluttering main UI

## 6.2 Responsive dialog positioning

Installer dialog:
- Centers relative to parent window
- Repositions when parent moves
- Preserves “attached modal” feeling

Other dialogs:
- Centered on screen for focus and consistency

---

## 7) Technical UX Principles in the App

- Background threading for long operations (install/fetch)
- UI updates marshaled back to main thread
- Modal dialogs for task-focused flow
- Defensive validation before queue insertion
- Fallback options when dynamic fetch fails
- Error messaging with clear next actions

---

## 8) Feature Inventory (Website-ready)

For marketing/feature sections, this is the complete app feature set:

1. YouTube video downloading
2. Audio-only extraction (MP3 mode)
3. Playlist support
4. Per-video or merged playlist output options
5. Custom filename for merged playlist
6. Dynamic video format discovery (single video)
7. Automatic compatibility checks for muxing/merge cases
8. Static fallback quality presets
9. Audio bitrate selection
10. Queue-ready item creation
11. Real-time progress visualization
12. Speed, ETA, downloaded/total size stats
13. First-run dependency installer with live logs
14. Retry/failure recovery in installer
15. Dark/light theme architecture
16. Reusable tooltip component
17. Clean card-based modern UI

---

## 9) End-to-End User Journey (Condensed)

1. Launch app
2. If dependency missing → installer appears
3. Paste YouTube URL
4. App reads metadata
5. Options dialog opens
6. User selects download type and quality settings
7. User adds to queue
8. Progress dialog shows active download telemetry
9. Download completes

For playlists:
- user chooses separate items or merged file before queue insertion.

---

## 10) Brand & Presentation Identity for Webpage Generation

## Product name
**Youtube Downloader Pro**

## Brand personality
- Reliable
- Fast
- Technical but beginner-friendly
- Clean and modern

## Suggested visual style for webpage
- Dominant blues + violets
- Dark-first hero aesthetic (optional light mode showcase)
- Glassy cards / soft gradients
- Rounded UI mockups
- Download/progress motifs
- Minimal but feature-rich sectioning

## Messaging pillars
- “Simple workflow”
- “Advanced control when you need it”
- “Real-time transparency”
- “Built for playlists and single videos alike”

---

## 11) Functional Boundaries (Important for accurate website copy)

The app scope represented in the provided implementation is:

- Desktop GUI app (Python + CustomTkinter style architecture)
- YouTube download management workflow
- Dependency bootstrap for yt-dlp
- Local queue/task preparation and progress display

No additional assumptions should be made beyond this scope.

---

## 12) Website Content Requirements Derived from App

Any generated webpage should include:

- Clear app summary
- Installation/dependency helper explanation
- Download options explanation (video/audio, quality, playlist)
- Queue/progress transparency explanation
- Theme system mention (dark/light)
- Visuals matching blue/violet brand direction
- Screens or mock sections for:
  - Installer dialog
  - Options dialog
  - Progress dialog
- Strong CTA around “Youtube Downloader Pro”

---

## 13) One-line Value Proposition

**Youtube Downloader Pro makes YouTube downloading effortless with smart format selection, playlist controls, and real-time progress in a polished blue-violet desktop interface.**