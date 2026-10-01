# SIAPAJAR Design Specification

## 1. Design Goal

SIAPAJAR is a productivity tool for Indonesian teachers creating assessment documents.

The interface should feel:

- simple;
- clear;
- professional;
- fast;
- familiar to users accustomed to document editors;
- focused on completing an assessment document.

The UI should not feel like a complex enterprise administration system.

## 2. Core Design Principles

### 2.1 One Primary Action

Every major screen should have a clear primary action.

### 2.2 Minimal Cognitive Load

Teachers should not need to understand:

- prompt engineering;
- JSON;
- API;
- database;
- AI provider configuration.

### 2.3 Progressive Disclosure

Advanced information should appear only when it becomes relevant.

### 2.4 Editor First

Once users reach the question editor, the editor is the primary focus.

### 2.5 Preserve User Work

Autosave and recovery states should be visible and understandable.

## 3. Primary Product Flow

Access
→ Parameter
→ Prompt
→ External AI
→ Import
→ Parse & Validate
→ Editor
→ Blueprint / Answer Key / School Header
→ Word / Print-PDF

The UI must make the current step obvious.

## 4. Responsive Priority

Priority:

1. Desktop
2. Laptop
3. Tablet
4. Mobile

The editor is primarily optimized for desktop/laptop because long-form assessment editing is more comfortable on larger screens.

## 5. Visual Language

Use a restrained, consistent visual system.

Define and centralize:
- color tokens;
- typography;
- spacing;
- radius;
- shadows;
- border styles;
- focus states.

Do not introduce arbitrary colors or one-off component styling when an existing token/component can be reused.

### 5.1 Implemented tokens

Tokens live in `src/index.css` (Tailwind 4 `@theme`) and are used as normal utilities, e.g. `bg-surface`, `text-fg-muted`, `border-line`.

| Group | Tokens | Notes |
|---|---|---|
| Brand scale | `brand-50` … `brand-900` | Green family; `brand-600` is the primary action color |
| Surfaces | `canvas`, `surface`, `subtle` | Page background, panels, quiet fills |
| Lines | `line`, `line-strong` | 1px borders and dividers |
| Text | `fg`, `fg-muted`, `fg-subtle` | All pass WCAG AA on `surface` and `canvas` |
| Primary | `primary`, `primary-hover`, `primary-soft`, `primary-fg`, `primary-text` | Use `primary-text` (not `primary`) for green text |
| Status | `danger`, `danger-soft`, `danger-line`, `success`, `success-soft` | Always paired with an icon and text |
| Shadow | `shadow-card`, `shadow-overlay` | Two levels only |

Semantic colors switch with `[data-theme="dark"]`. Public pages (landing, masuk) are light only; the app shell supports dark mode.

- Typography: Plus Jakarta Sans; Tailwind's default size scale; weights 400–700 in new UI; minimum text size 12px.
- Radius: `rounded-md` (6px) for controls, `rounded-lg` (8px) for panels. No pill-shaped buttons.
- Containers: 1120px marketing, 960px app content, 400px forms.
- Focus: 2px `primary` outline with 2px offset on `:focus-visible`.
- Motion: 150ms color transitions only; everything respects `prefers-reduced-motion`.

The legacy variables (`--surface`, `--ink`, `--brand-lime`, …) remain only for the existing workflow screens and should be migrated when those screens are reworked.

### 5.2 Admin panel (`/super-admin`)

The admin panel uses the same tokens and components as the teacher app. Additional rules:

- Light theme only; a small "ADMIN" label next to the logo makes the area recognisable.
- Built for phones as much as laptops: lists become stacked rows below `md`, the sidebar becomes a drawer below `lg`, primary actions sit in the top bar.
- Destructive or irreversible actions (disable code, regenerate code, reset password) always use a confirmation `Dialog` that states the consequence; disabling a code requires a reason.
- Secrets shown once (new access codes, temporary passwords) are displayed in a dedicated panel with copy actions and a clear "shown once" warning.
- No dashboards or charts; the overview shows a few plain numbers and recent orders.

## 6. Core Components

Implemented in `src/components/ui/`: Button, Input, Select, Textarea, FormField, Alert, Badge, Dialog, EmptyState, PageHeader, Container, Logo (see `src/README.md` §3).

Prefer reusable components such as:

- Button
- Input
- Select
- Textarea
- Checkbox
- Radio
- Card
- Badge
- Alert
- Modal/Dialog
- Toast
- Tabs
- Step Indicator
- Question Card
- Empty State
- Loading State
- Error State

A new component should have a clear reusable responsibility.

## 7. Question Editor

The question editor is a vertical, document-oriented editing experience.

Each question should expose, as applicable:

- question number;
- type badge;
- cognitive level badge;
- question/stem;
- stimulus;
- options;
- answer;
- explanation;
- score;
- rubric;
- actions.

Actions include:

- edit;
- duplicate;
- delete;
- reorder.

Question numbering must be derived from current order rather than manually stored display numbers.

## 8. Question Type Labels

Use the PRD terminology:

- PG
- PGK
- BS
- ISIAN
- URAIAN

Cognitive levels may be displayed as:

- C1
- C2
- C3
- C4
- C5
- C6

## 9. Forms

Forms should:
- group related fields;
- show required/optional state clearly;
- validate close to the input;
- preserve user input on errors;
- avoid unnecessary multi-step nesting.

## 10. Feedback States

Every asynchronous operation should consider:

- idle;
- loading;
- success;
- recoverable error;
- unrecoverable error.

User-facing errors must use plain language.

Do not expose raw exceptions, stack traces, or internal schema errors.

## 11. Destructive Actions

Delete/reset actions should be explicit.

For destructive operations that can cause meaningful data loss, provide confirmation and make the consequence clear.

## 12. Accessibility

Use:
- semantic HTML;
- keyboard-accessible controls;
- visible focus states;
- associated labels;
- adequate contrast;
- meaningful button text;
- accessible error messages.

Do not use color alone to communicate status.

## 13. Do Not

Do not:
- add a feature because it looks modern;
- create unnecessary dashboards;
- add complex navigation to a simple workflow;
- hide core actions inside obscure menus;
- redesign the product around an AI chat interface;
- make teachers interact with raw JSON;
- require technical knowledge to complete the main workflow.
