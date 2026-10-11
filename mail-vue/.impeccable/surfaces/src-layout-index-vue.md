---
version: 1
slug: "src-layout-index-vue"
primary_target: "src/layout/index.vue"
related_targets: ["src/layout/header/index.vue","src/layout/aside/index.vue","src/components/email-scroll/index.vue","src/views/content/index.vue","src/layout/write/index.vue"]
---

# Mail workspace

Mode: Operate. Scope: the authenticated mail shell, inbox, sent and starred lists, message reading, mailbox switching, and compose on desktop and mobile. Preserve administration and mail permissions. The user pinned Gmail as the reference; the optional scope question went unanswered, so Cloud Mail branding is retained for this session.

## Direction contract

THESIS: A familiar Gmail-style workspace makes reading, finding, and composing mail immediately discoverable. Replace the incumbent double-sidebar arrangement with one navigation rail.

OWN-WORLD: Cool pale shell, white reading surface, blue selected folders and compose button, neutral outline icons, compact sans type, round controls and a rounded main panel. Dark mode uses charcoal surfaces and pale blue selection.

STORY: Choose a mailbox and folder, scan sender/subject/preview, search the folder, select messages for actions, open a conversation, reply or compose, and return with context preserved.

FIRST VIEWPORT: A 64px global header holds a menu button and Cloud Mail wordmark at left, a broad search field in the center, and settings/theme/profile at right. A 256px sidebar has Compose, folders, and expandable mailboxes; collapsing it retains a 72px icon rail. At widths up to 1024px, navigation becomes a modal drawer with an explicit close control, a scrim, inert background, trapped focus, Escape close, and focus restoration; a floating Compose action remains available on tablet and phone. The white main panel has a 48px toolbar and 44px desktop rows; phone rows stack sender, subject, preview.

FORM: User-pinned Gmail convention overrides the direction roll, seed d9828775. Desktop compose is a compact bottom-right window with expand; mobile compose uses the full viewport. Motion is short state feedback, respecting reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
