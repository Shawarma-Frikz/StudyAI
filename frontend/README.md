# StudyAI — React Refactor

This is the full React (JSX) rewrite of the original `main.html` + `script.js` + `styles.css` project.
Design and interactions are **identical** to the original; the code is restructured into one file per page/concern.

## Project Structure

```
studyai/
├── index.html                   # HTML entry point (Vite)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                 # React root mount + CSS import
    ├── App.jsx                  # Shell: wires navigation + all sections
    ├── styles.css               # Original stylesheet (unchanged)
    │
    ├── context/
    │   └── AppContext.jsx       # Global state (auth, docs, study time, learning data, toast)
    │
    └── components/
        ├── Particles.jsx        # Animated background particles
        ├── Navbar.jsx           # Top navigation bar
        ├── AuthOverlay.jsx      # Auth modal (Login / Register / Reset / Profile / Edit Profile)
        ├── HeroSection.jsx      # Landing hero + live stats
        ├── FeaturesSection.jsx  # "Powerful Features" grid
        ├── DocsSection.jsx      # Document management (upload, search, rename, delete)
        ├── QuizOverlay.jsx      # Quiz modal (questions → results → review)
        ├── ChatSection.jsx      # AI Chat with @mention support
        ├── DashboardSection.jsx # Learning analytics dashboard
        ├── Footer.jsx           # Page footer
        └── Toast.jsx            # Toast notification
```

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Key Design Decisions

- **AppContext** is the single source of truth for all cross-cutting state (current user, documents list, learning data, study timer, toast). Components subscribe only to what they need.
- **Navigation** is handled by a simple `currentSection` string in context — no router needed, matching the original show/hide approach.
- **`styles.css`** is imported once in `main.jsx` and is byte-for-byte the same as the original.
- **QuizOverlay** is rendered inside `DocsSection` as a child (so it can receive `docName`) rather than at the app shell level.
- **Quick Summary** from a doc card: `DocsSection` calls back to `App.jsx` which bumps a key counter to force a fresh `ChatSection` mount and pre-fills the input.
