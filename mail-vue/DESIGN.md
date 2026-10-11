---
name: Cloud Mail
description: "A familiar Gmail-inspired workspace for reading, finding, organizing, and composing mail."
colors:
  primary: "#0b57d0"
  primary-dark: "#409eff"
  mail-shell: "#f6f8fc"
  mail-shell-dark: "#202124"
  mail-surface: "#fff"
  mail-surface-dark: "#141414"
  mail-search: "#e9eef6"
  mail-search-dark: "#303134"
  mail-compose: "#c2e7ff"
  mail-compose-dark: "#004a77"
  mail-on-accent: "#001d35"
  mail-on-accent-dark: "#c2e7ff"
  mail-selected: "#d3e3fd"
  mail-selected-dark: "#004a77"
  mail-nav-hover: "#e4e7ec"
  mail-nav-hover-dark: "#3c4043"
  mail-read-row: "#f2f6fc"
  mail-read-row-dark: "#292a2d"
  mail-avatar: "#7b4f9d"
  mail-avatar-dark: "#79509c"
  mail-row-border: "#e4e7eb"
  mail-row-border-dark: "#3c4043"
  mail-checkbox-border: "#747775"
  mail-checkbox-border-dark: "#9aa0a6"
  text-primary: "#202124"
  text-primary-dark: "#e5eaf3"
  text-regular: "#3c4043"
  text-regular-dark: "#cfd3dc"
  text-secondary: "#5f6368"
  text-secondary-dark: "#bdc1c6"
  mail-row-hover: "#e8f0fe"
  mail-row-hover-dark: "#353b45"
  starred: "#b06000"
  starred-dark: "#fdd663"
  overlay-scrim: "rgb(0 0 0 / .32)"
typography:
  title:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.4
  title-compact:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.4
  page-title:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
  state-title:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  metadata:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  search:
    fontFamily: "Arial, \"Helvetica Neue\", Helvetica, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"微软雅黑\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  small: "4px"
  mailbox: "12px"
  panel: "16px"
  pill: "20px"
  search: "24px"
  control: "50%"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
components:
  button-compose:
    backgroundColor: "{colors.mail-compose}"
    textColor: "{colors.mail-on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.panel}"
    padding: "0 24px"
    height: "56px"
  button-compose-dark:
    backgroundColor: "{colors.mail-compose-dark}"
    textColor: "{colors.mail-on-accent-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.panel}"
    padding: "0 24px"
    height: "56px"
  button-send:
    backgroundColor: "{colors.primary}"
    textColor: "#fff"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-send-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "#fff"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.mail-surface}"
    textColor: "{colors.text-regular}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-icon:
    rounded: "{rounded.control}"
    size: "36px"
  button-icon-touch:
    rounded: "{rounded.control}"
    size: "44px"
  input-search:
    backgroundColor: "{colors.mail-search}"
    textColor: "{colors.text-primary}"
    typography: "{typography.search}"
    rounded: "{rounded.search}"
    padding: "0 4px"
    height: "48px"
  input-search-dark:
    backgroundColor: "{colors.mail-search-dark}"
    textColor: "{colors.text-primary-dark}"
    typography: "{typography.search}"
    rounded: "{rounded.search}"
    padding: "0 4px"
    height: "48px"
  nav-active:
    backgroundColor: "{colors.mail-selected}"
    textColor: "{colors.mail-on-accent}"
    rounded: "0 20px 20px 0"
    padding: "0 24px"
    height: "36px"
  nav-active-dark:
    backgroundColor: "{colors.mail-selected-dark}"
    textColor: "{colors.mail-on-accent-dark}"
    rounded: "0 20px 20px 0"
    padding: "0 24px"
    height: "36px"
  card-mailbox-selected:
    backgroundColor: "{colors.mail-selected}"
    rounded: "{rounded.mailbox}"
    padding: "8px"
  card-main:
    backgroundColor: "{colors.mail-surface}"
    rounded: "{rounded.panel}"
  row-read:
    backgroundColor: "{colors.mail-read-row}"
    typography: "{typography.body}"
    padding: "8px 0"
    height: "44px"
  row-unread:
    backgroundColor: "{colors.mail-surface}"
    typography: "{typography.body}"
    padding: "8px 0"
    height: "44px"
  row-selected:
    backgroundColor: "{colors.mail-selected}"
    typography: "{typography.body}"
    padding: "8px 0"
    height: "44px"
  chip-recipient:
    textColor: "{colors.primary}"
    rounded: "{rounded.small}"
    height: "22px"
    padding: "0 9px"
---
# Design System: Cloud Mail

## Overview

**Creative North Star: "The Familiar Mail Workspace"**

The Familiar Mail Workspace gives Cloud Mail the recognizable rhythm of Gmail: a cool shell, quiet folder navigation, a broad search field, and a continuous message surface. The configurable site title remains the product identity. Density supports repeated reading and organizing tasks; sender, subject, preview, and time establish the scan order.

Light mode separates a pale shell from white message and reading surfaces. Dark mode uses charcoal and near-black surfaces with pale blue accents. Rounded controls and restrained feedback communicate actions and state. Shipping visuals are CSS and registered SVG icons; this build introduces no generated raster assets.

**Key Characteristics:**

- Cool tonal surfaces with blue compose and selection.
- Compact sans typography and a continuous message list.
- One navigation rail with a modal drawer on smaller screens.
- Visible keyboard focus and permission-aware actions.

This is a scan of the implemented mail workspace, not a visual approval. Source evidence: `src/style.css`, `src/responsive.css`, the layout/header/aside/account/write components, message list, reader, and editor. Effective palette values were checked against computed styles in the built desktop fixture. The companion sidecar carries preview snippets, breakpoints, motion, and shadow metadata.

## Colors

Cool light neutrals, charcoal dark neutrals, and blue action surfaces support scanning without competing with message content. The frontmatter owns the values; CSS custom properties remain the application source of truth. Suffixed `-dark` tokens describe effective dark mode.

### Primary

- **Action Blue** (`primary` / `primary-dark`): send actions, the mail mark, caret, and keyboard focus.
- **Sky Compose** (`mail-compose` / `mail-compose-dark`): the large Compose action and the floating tablet/phone action.
- **Selected Blue** (`mail-selected` / `mail-selected-dark`): selected folder, mailbox, and message state. Shared on-accent tokens carry dark navy in light mode and pale blue in dark mode.

### Secondary

- **Star Amber** (`starred` / `starred-dark`): filled starred-message controls in the list. It conveys message state, not a second call to action.
- **Profile Plum** (`mail-avatar` / `mail-avatar-dark`): the compact account avatar in the global header.

### Neutral

- **Cool Shell** (`mail-shell` / `mail-shell-dark`): viewport and navigation backdrop.
- **Reading Surface** (`mail-surface` / `mail-surface-dark`): rounded main panel, focused search, and composer. Dark mode intentionally separates the near-black panel from the charcoal shell.
- **Search Cloud** (`mail-search` / `mail-search-dark`): resting search field and sender avatar.
- **Read Tint** (`mail-read-row` / `mail-read-row-dark`): read messages. Unread rows use white in light mode and the shell tone in dark mode.
- **Neutral Hover** (`mail-nav-hover` / `mail-nav-hover-dark`): navigation and header control feedback. Message hover uses `mail-row-hover` / `mail-row-hover-dark`.
- **Primary, Regular, and Secondary Ink** (`text-*`): sender/subject content, regular controls, and preview/metadata hierarchy.
- **Fine Divider and Checkbox Stroke** (`mail-row-border*`, `mail-checkbox-border*`): lightweight separation and selection affordance.
- **Overlay Scrim** (`overlay-scrim`): drawer and modal composer backdrop.

**The State Contrast Rule.** Use the defined read, unread, selected, and hover surfaces for their respective message states; unread sender, subject, and time also use bold weight.

Cascade note: the imported Element Plus dark stylesheet supplies effective dark primary and text colors. Its `html.dark` declarations supersede the custom primary-text declaration in `src/style.css`; the frontmatter records the computed result. This discrepancy is evidence, not a new policy to duplicate theme declarations. Element Plus continues to own standard success, warning, danger, disabled, border, and fill variables.

## Typography

**Body and UI Font:** Arial with Helvetica and Chinese-language sans fallbacks, as declared on `body`. There are no downloaded fonts or separate display face.

The hierarchy is compact and task focused. Regular weight is the default, labels use medium weight, active folders use semibold, and unread sender/subject/time use bold. Browser-inherited UI line height is one and a half; the reader subject uses the tighter title role.

- **Title:** regular reader subject; `title` on desktop and `title-compact` on phones.
- **Page title:** regular administrative page heading; `page-title`.
- **State title:** medium loading/error/empty-state heading; `state-title`.
- **Body:** message lists, controls, and UI text; `body`.
- **Label:** Compose and compact section labels; `label`.
- **Metadata:** phone time, current mailbox, and shared mailbox role; `metadata`. Selection count uses 13px on desktop and the metadata size on phones.
- **Search:** larger desktop search entry; `search`, reduced to the body size below 768px.

The configurable wordmark uses a regular 22px UI face. Numeric counts and attachment sizes use tabular numerals. Desktop subject text caps at 55ch before truncation, preview uses the remaining row space, and empty-state help caps at 36ch. These are contextual limits, not a reading-width rule for all mail.

## Layout

The viewport shell is a two-row grid: a global header (64px) and the remaining workspace. Desktop navigation is 256px expanded and 72px collapsed. The collapsed rail retains a centered 56px Compose icon and 48px folder items, with labels and mailbox section hidden. The header maintains its own 240px brand column, a search column up to 720px, and right-aligned controls.

The main panel fills the remaining width, with 16px right/bottom clearance and rounded corners. Lists use a minimum 48px toolbar and 44px rows; sender receives up to 180px and subject/preview fill the remaining width. Administrative all-mail rows use 65px to accommodate ownership metadata. Scrolling belongs to the list or reader, not the shell.

At widths up to 1024px, navigation becomes a fixed drawer with a scrim and explicit close control. Header branding hides to preserve search width. A floating 56px Compose action remains visible at the lower right, above the safe area. The main panel gains a 16px left margin. Opening the drawer makes the header and main content inert, traps Tab/Shift+Tab within navigation, closes on Escape or scrim click, and returns focus to its trigger. Selecting a mailbox or composing from the drawer closes it.

At widths up to 767px, the main panel becomes edge to edge with square corners. Search becomes 44px high, settings and announcement buttons hide, and normal message rows become 88px with sender/time, subject, and preview on separate lines. All-mail rows become 132px. Desktop row actions hide; checkbox selection and toolbar actions remain. Phone list/reader bottom padding leaves room for floating Compose. Reader padding reduces from 32px to 16px, and the 48px desktop message indent is removed from subject/body/actions.

The spacing rhythm uses the frontmatter `space-*` steps. Core icon actions become 44px on coarse pointers or phones; coarse-pointer folder rows are also 44px. Element Plus dialogs, popovers, notifications, and TinyMCE portals are bounded by viewport and safe-area insets, scroll internally, and wrap their footer controls. They use an observed 16px minimum overlay gutter.

## Elevation & Depth

The workspace uses tonal layering with state-dependent lift. Its white or near-black main panel has no resting shadow. Mailbox cards remain flat; separators and surface changes carry structure.

- **Compose hover:** short, diffuse lift under the large sidebar action.
- **Floating Compose:** modest persistent lift separates the action from scrolling mail.
- **Search focus:** shallow lift on the focused field, accompanied by a surface change.
- **Message interaction:** a fine inset divider and shallow shadow appear on hover or focus within.
- **Drawer:** a lateral shadow separates the fixed navigation from the scrim.
- **Composer:** the Element Plus light shadow is used in both themes; the dark library variant is stronger. Expanded/phone compose has a modal scrim.

Exact shadow declarations are in the sidecar. These are role-specific values, not a universal elevation scale.

**The Flat Workspace Rule.** Keep the main workspace flat at rest. Reserve shadows for focus, hover feedback, floating compose, drawers, and overlays.

Most action feedback takes 150ms; composer resize follows the library's 300ms duration. Theme switching uses the existing 520ms radial view transition where supported. Reduced-motion settings collapse transition/animation duration and bypass radial theme animation. No decorative entrance motion is part of this world.

## Shapes

Main panels and Compose use generous corners; mailbox cards and compose windows use moderate corners. Search and send/reply actions are pills, icon actions and avatars are circles. Expanded folder items round their right corners only; collapsed folder items are centered pills. Recipient and attachment chips use the small corner token.

Continuous rows remain rectangular. Composer recipient/subject fields are flat with only a bottom divider. The desktop composer rounds its top corners, the expanded composer rounds all corners, and the phone composer and main workspace use square outer corners. Fine borders communicate fields, attachments, and separation; the rest of the shell relies on tone.

## Components

### Buttons

Compose is the dominant navigation action: a 56px-high light-blue or deep-blue surface, 24px horizontal padding, an outline edit icon, and a medium label. Hover adds lift. The collapsed rail shows the icon centered in the same footprint. Floating Compose uses 20px horizontal padding and appears below the desktop navigation breakpoint.

Send is a solid primary-blue pill (40px nominal height, 24px horizontal padding). Sending shows loading state; validation and send errors preserve the editable message. Reply and Forward use the outlined secondary pill. Standard Element Plus buttons follow their library hover, disabled, and loading behavior; coarse-pointer/phone overrides raise their minimum height to 44px.

Icon actions use the semantic control size/radius, a 150ms background transition, library light-fill on hover, stronger fill on active, and disabled text coloring. Header controls use an observed 40px circular footprint. Global keyboard focus uses a 2px primary outline with 3px offset. Labels and titles accompany icon-only actions.

### Inputs / Fields

Global search is a pale pill with an inline search icon and clear button. Focus changes it to the panel surface with shallow lift. Submit trims the query and searches the current folder; from a message it returns to that folder. Inbox, Sent, and Starred use server queries; Drafts filters its complete local result. Search is limited to 200 input characters. Escape clears the query and focuses the field; `/` focuses search outside editing, dialogs, and compose.

Compose fields use bottom dividers and transparent surfaces. Recipient tags validate email addresses, deduplicate recipients, accept comma-separated entry, and offer recent-contact completion. Phone Element Plus form fields use 16px text and touch-sized wrappers. The compose search/input and mail search exceptions follow their explicit component rules.

### Navigation

Folders keep the working Inbox, Starred, Sent, Drafts, and Settings vocabulary. Active folders receive selected tone, on-selected ink, semibold text, and `aria-current`. Sent, Drafts, Compose, and administration links follow permission gates. A reader retains its originating folder's active state. Expanded folders are 36px high on fine-pointer desktop; collapsed folders are 40px high.

Mailboxes are an expandable section with the current address below its heading. Items show mailbox name/address and shared access role where applicable; the current item uses selected tone and `aria-pressed`. The mailbox list remains a bounded scrolling area with loading and empty states. Switching updates the current account, reloads the active list, and respects shared mailbox permissions.

### Chips / Cards / Containers

Recipient tags use Element Plus primary-tag styling with a small corner and removable state. Shared-role and profile status tags retain library semantic styling. Mailbox cards have 12px corners, 8px internal padding, and no resting border/shadow. The main panel uses 16px corners on desktop/tablet. Attachments are compact small-corner surfaces with filename truncation, tabular size, labeled preview/download/remove actions, and a wrapping responsive grid.

### Message list and reader

The message list is virtualized with row height matched to its breakpoint. Read rows use a tint, unread rows use stronger surface contrast and bold sender/subject/time, and selected rows use selected tone. Checkboxes support batch selection with a status count; refresh, permitted delete, and mark-read appear in the toolbar. Desktop hover/focus reveals permitted row actions in the time position. Rows open on click or Enter; nested action clicks do not open the message. Filled stars use amber.

Skeletons precede loaded rows. Empty folder/search states explain the result and expose Clear search when relevant. Load errors expose Retry and are announced as alerts. Thread reading shows a regular large subject, sender avatar, recipient/date metadata, attachment controls, and permitted Reply/Forward buttons. Thread failure retains the available message and offers Retry. Escape returns to the originating folder when no editing or overlay owns the event.

HTML mail renders in a sandboxed iframe with a white canvas and 14px/1.6 Arial default, independent of the shell theme; sender styles may override that default. Plain text inherits UI typography. This content isolation is not a shell card variant.

### Composer and keyboard behavior

Desktop/tablet compose is a bottom-right window up to 600px wide and 580px tall, bounded by viewport clearance. It is non-modal at this size. Expand centers a modal window up to 1100px wide with 40px clearance on each side. Phones below 768px use the full viewport, safe-area padding, and a modal focus boundary; the expand control hides. Background workspace becomes inert for modal compose. Opening focuses the recipient field; closing restores prior focus.

`c` opens compose outside text editing/overlays, subject to send permission. Ctrl/Cmd+Enter sends from compose, including the rich editor. Escape closes compose when a nested dialog or menu does not own it. Closing a new edited message prompts to save a local draft; existing drafts update their local data. TinyMCE supplies formatting and theme-aware editor chrome. Switching theme preserves rich-editor content and restores editor focus where it had focus. A sending failure keeps the composer content available.

### Icons and assets

Core mail actions use locally registered Material Symbols Rounded outline SVGs through Iconify (typically 20–24px; the header mail mark is 32px). Filled star is the state variant. Existing auxiliary/admin/attachment icons retain their registered Iconify families. Keep icons vector, neutral, and labeled; the brand mark uses primary blue. No icon font or generated raster is needed for the mail shell.

## Do's and Don'ts

### Do:

- **Do** reuse semantic CSS custom properties so light and dark themes follow the effective cascade.
- **Do** retain the single rail, continuous message list, and clear sender/subject/preview hierarchy.
- **Do** use labeled native buttons, visible keyboard focus, and the existing permission gates.
- **Do** let long mail subjects, filenames, and overlay content truncate or wrap according to their established contexts.
- **Do** preserve local draft persistence and recoverable loading, empty, and error states.

### Don't:

- **Don't** add archive, snooze, categories, or trash controls without supported product behavior.
- **Don't** replace registered SVG icons with text glyphs or decorative images.
- **Don't** add shadows to every row or mailbox card at rest.
- **Don't** promote incidental legacy administration styles or sender-authored email styles into the mail workspace system.
