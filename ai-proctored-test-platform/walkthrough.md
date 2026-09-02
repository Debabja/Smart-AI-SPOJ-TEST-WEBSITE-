# Walkthrough: Resizable 4-Panel Single-Row Workspace on Candidate AI Test Screen

We have updated the Candidate AI Test Screen ([`CandidateAITestScreen.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/candidate/pages/CandidateAITestScreen.jsx)) to use the requested **single-row 4-panel horizontal layout** with **3 vertical draggable splitters**.

---

## 1. Workspace Layout Structure

All four sections are positioned in a single horizontal row from left to right, filling the workspace height:

```text
┌─────────────────┬───┬─────────────────┬───┬─────────────────┬───┬─────────────────┐
│                 │   │                 │   │                 │   │                 │
│  1  Question    │ ↔ │ 2  Code Editor  │ ↔ │  3  Preview     │ ↔ │ 4  AI Assistant │
│  (Purple Border)│   │ (Blue Border)   │   │ (Green Border)  │   │ (Orange Border) │
│                 │   │                 │   │                 │   │                 │
└─────────────────┴───┴─────────────────┴───┴─────────────────┴───┴─────────────────┘
                    ↑                     ↑                     ↑
                Splitter 0            Splitter 1            Splitter 2
```

- **Panel 1 (Left)**: **Question Section** (Purple theme `#7c3aed`, badge `1 Question`, scrollable problem statement, hint card, word/line count footer).
- **Vertical Splitter 0**: Draggable divider between Question and Code Editor. Shows `col-resize` cursor and `↔` handle.
- **Panel 2 (Center-Left)**: **Code Editor Section** (Blue theme `#0284c7`, badge `2 Code Editor`, multi-file tabs bar, Monaco Editor with `automaticLayout: true`, language & Prettier status footer).
- **Vertical Splitter 1**: Draggable divider between Code Editor and Preview. Shows `col-resize` cursor and `↔` handle.
- **Panel 3 (Center-Right)**: **Preview Section** (Green theme `#10b981`, badge `3 Preview`, browser address bar `http://localhost:3000`, live reload `↻`, external open `↗`, iframe live sandbox, device toggle: Desktop/Tablet/Mobile).
- **Vertical Splitter 2**: Draggable divider between Preview and AI Assistant. Shows `col-resize` cursor and `↔` handle.
- **Panel 4 (Right)**: **AI Assistant Section** (Orange theme `#ea580c`, badge `4 AI Assistant`, Kimi AI avatar + connected status, scrollable chat bubble stream with snippet copy, chat input form).

---

## 2. Resizing Mechanics

- **Independent Pair Resizing**:
  - Dragging **Splitter 0** dynamically adjusts the widths of **Question** and **Code Editor** only. Preview and AI Chat remain unchanged.
  - Dragging **Splitter 1** dynamically adjusts the widths of **Code Editor** and **Preview** only. Question and AI Chat remain unchanged.
  - Dragging **Splitter 2** dynamically adjusts the widths of **Preview** and **AI Assistant** only. Question and Code Editor remain unchanged.
- **Strict 100% Width Conservation**:
  - The sum of panel widths is conserved (`100%`), guaranteeing no horizontal scrollbars on the browser page.
- **Sensible Clamping**:
  - Panel 1 (Question): min 160px.
  - Panel 2 (Code Editor): min 200px.
  - Panel 3 (Preview): min 180px.
  - Panel 4 (AI Assistant): min 180px.
- **Drag Shield & Iframe Protection**:
  - Fixed transparent overlay (`zIndex: 999999`, `cursor: col-resize`) mounted during dragging so neither the Preview `<iframe>` nor Monaco Editor interrupts mouse drag tracking.
  - Text selection prevented (`userSelect: 'none'`) during drag.
- **Persistence**:
  - Saved to `sessionStorage.getItem('ai_test_panel_widths')`.
- **Maximize & Restore**:
  - Header maximize button (`⛶` / `🗗`) expands that specific panel to 100% width while temporarily hiding the other panels, and restores back to the resizable 4-column layout when clicked again.

---

## 3. Verification & Build Integrity

- Built the frontend client bundle with `npm run build`:
  - **Result**: `✓ built in 1.81s` with 0 errors.
- Verified all 4 panels, 3 vertical splitters, and docked bottom proctoring bar match the reference layout.
