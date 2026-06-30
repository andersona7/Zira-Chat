# Zira Chat Design System: "Aether"

## 1. Design Philosophy
Aether is built on simplicity, emotional comfort, futuristic elegance, and productivity. It discards the visually cluttered, high-anxiety utility look of standard messaging apps in favor of a calm, premium workspace. 

## 2. Visual Identity & Color System
**Primary Identity: Premium Purple Palette**
Psychological reasoning: Purple signifies luxury, wisdom, and calmness. It reduces the cognitive fatigue associated with the stark high-contrast blues and greens of traditional apps, creating a deep, focus-oriented environment.

| Token | Hex Code | Usage |
| :--- | :--- | :--- |
| Primary 50 | `#F5F3FF` | Subtle backgrounds |
| Primary 100 | `#EDE9FE` | Hover states |
| Primary 200 | `#DDD6FE` | Active states |
| Primary 300 | `#C4B5FD` | Disabled borders |
| Primary 400 | `#A78BFA` | Subdued icons |
| Primary 500 | `#8B5CF6` | Primary buttons, active tabs |
| Primary 600 | `#7C3AED` | Primary hover, bold text |
| Primary 700 | `#6D28D9` | High-contrast emphasis |
| Primary 800 | `#5B21B6` | Deep gradients |
| Primary 900 | `#4C1D95` | Brand text |

* Secondary Accent: Muted Teal (`#14B8A6`) - For read receipts and online status.
* Error Palette: Soft Rose (`#E11D48`) - Alerts and destructive actions.
* Dark Theme Base: `#0F0C20` (Deep indigo-black) - Reduces eye strain compared to `#000000`.

## 3. Typography Scale
* Font Family: 'Inter' (UI) and 'Outfit' (Headings/Brand).
* Scale: 12px (Caption), 14px (Body), 16px (Subheading), 20px (Heading 3), 24px (Heading 2), 32px (Heading 1).

## 4. Responsive Strategy
* Mobile (320px - 430px): Bottom navigation bar, full-screen chat views, gesture-based swipe to reply.
* Tablet (768px - 1024px): Split view (List + Chat). Collapsible sidebar. Touch-target scaling (min 44px).
* Desktop (1280px - 1920px+): Three-pane layout (Navigation, Chat List, Active Chat/Details). Keyboard shortcut overlays.

## 5. Innovative UI Requirements & UX Rationale
* Context-Aware Action Menu: Highlighting a message predicts the next action (e.g., if it's a date, suggests "Create Event"). Rationale: Reduces cognitive load and steps.
* Fluid Workspace: The right panel can host media browsing, contact details, or a scratchpad without losing sight of the chat. Rationale: Efficient multitasking for power users.
* Focus Mode: Dims all non-pinned chats and mutes standard notifications visually. Rationale: Solves the anxiety of constant unread badges.

## 6. Motion Specifications
* Duration: Micro-interactions (150ms), Screen Transitions (300ms).
* Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for smooth, natural physics.
* Skeleton States: Subtle shimmer effect (`opacity: 0.5` to `1.0`) using Primary 100.

## 7. Accessibility Specifications
* WCAG AA Target.
* Focus Rings: 2px solid Primary 500 with 2px offset.
* Screen Readers: Comprehensive ARIA landmarks for "Chat List", "Message History", and "Composer".
* Keyboard: `Ctrl/Cmd + K` for global search, `Esc` to close overlays, Up/Down arrows to navigate chats.