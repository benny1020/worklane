# Worklane wiki · research, design and verification

2026-10-22. Scope: standalone `mock/`. The existing production Confluence adapter and credentials are unchanged. No frontend-design skill was used.

## Primary references

| Reference | Inspected | Adopted in Worklane |
| --- | --- | --- |
| [Confluence Cloud](https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/) | Official documentation: drafts, published pages, content tree, versions, inline discussion | Explicit reading/editing states, local draft save, publish review, revision snapshots |
| [Docmost](https://github.com/docmost/docmost) | Source `9250ca8305cbb7d04dc1973b8b83346784fc361a`: `space-sidebar.tsx`, `readonly-bubble-menu.tsx`, `use-editor-scroll.ts`, `slash-command.ts` | Space tree, contextual child-page creation, selection comments, slash insert; independently implemented |
| [Outline navigation](https://docs.getoutline.com/s/guide/doc/navigation-Nxnr2lWbck) / [source](https://github.com/outline/outline) | Public live UI and source `45bf9e290c2c6837c8ce9c8a689adc9281f9898e`: `TableOfContentsMenu.tsx`, `DocumentBreadcrumb.tsx`, `HoverPreviewDocument.tsx` | Favorites, command search, ancestor breadcrumbs, outline, related-document preview |
| [BookStack](https://www.bookstackapp.com/docs/user/content-overview/) | Official structured-content and editor documentation | Clear hierarchy and orientation; retain Confluence spaces/pages instead of adding a second books/chapters taxonomy |
| [BlockNote](https://www.blocknotejs.org/docs/features/blocks) | Official block/schema documentation | Discoverable table, code and task-block insertion |
| [Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react), [tables](https://tiptap.dev/docs/editor/extensions/nodes/table), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) | Current official APIs and installed extension source | Actual rich-text editor, selection, undo/redo, tables, code, lists, headings, checklists |

This is a representative comparison, not an audit of every editor. Docmost is AGPL-3.0; the inspected Outline release is BSL-1.1, source available rather than OSI open source. Their implementation code was not copied or vendored. Reference clones are outside the repository under `/tmp/worklane-wiki-references`. Tiptap is the adopted MIT-licensed editor dependency, pinned to 3.32.0.

## Information architecture

```text
Worklane
├─ My planner · Today / Week / Month / Sprint
└─ Wiki
   ├─ Home · continue reading / recent updates / templates
   ├─ Spaces · Payments / Order platform / Engineering
   ├─ Recent · last-opened order
   ├─ Favorites · personal saved documents
   ├─ My drafts · resume editing directly
   └─ Space tree · parent / child pages
      └─ Document
         ├─ Read · outline / comments / linked work
         ├─ Edit · local draft / formatting / slash insert
         ├─ Publish review · location / version / change summary
         └─ History · previous read-only snapshots
```

## Design decisions

- Keep global workspace navigation and the wiki tree distinct. Both collapse independently. Focus mode hides supporting navigation and the context rail together.
- The document body owns the main space. A narrow rail switches between outline, discussion and linked work. Related-document previews preserve the current document.
- Use the same Tiptap schema for read and edit. No handwritten rich-text engine or raw HTML rendering was introduced.
- Store published content and personal drafts separately. Close draft returns to the published page, or to My drafts for an unpublished page. Reading never consumes a draft.
- Drafts persist in localStorage under `worklane-wiki-v1`. The publish review explicitly targets this browser's mock. Storage failure is visible and blocks publishing.
- Search title, body, draft content and labels. Exact title matches rank first. The command palette searches all spaces independently of list filters. Keyboard: Cmd/Ctrl K search, N create, J context helper, S save feedback, Escape close, arrows/Enter select.
- Comments retain their quotation and source revision, support replies and resolve/reopen. A missing quotation produces feedback rather than a guessed jump. This is quote-based anchoring, not collaborative CRDT anchoring.
- Read-only task boxes are disabled. The editor supports bold/italic/inline code, links, headings, lists, callouts, code, checklists, tables and row/column actions. Slash opens in empty paragraphs; mouse users have the same toolbar insert menu.
- Increased secondary text contrast after visual inspection. No fabricated live collaborator presence or connected-account success state.

## Implemented boundaries

Three spaces, eleven published documents, one initial draft. The planner's PAY-382 inline document preview opens the full wiki. Jira/MR context is a fixture preview with return to the planner. Browser Back restores wiki routes.

This is not a live Confluence editor. Production work still requires supported storage/ADF conversion, macro/attachment handling, permission enforcement, version-conflict handling, synchronization and real comment anchoring. No external API calls, notifications, live collaboration or production search index are included. History retains 20 local versions; no server restore operation is offered.

## Verification

Model tests: draft isolation and serialization, explicit publishing, immutable prior versions, preserving unrelated drafts/comments, blank-title blocking, template drafts, title/body/label/space search, exact-title ranking and breadcrumb cycles.

Actual local UI checks: planner → wiki; tree navigation; title/body editing; reload recovery; close/resume without changing the published page; publish review; old version preservation; new child-page draft; slash heading/table insertion; adding a table row; keyboard search; Back preserving a draft; quote comment; reply/resolve; contextual document preview; navigation collapse.

Final screenshots and viewport checks are documented with `screenshots/wiki-*.jpg`. Native block dragging, real-time multiuser editing, screen-reader sessions, exhaustive IME testing and live-account operations were not tested. This is main-agent implementation and verification, not a new independent agent review.

Final results: **17 model tests passed**, Vite production build passed, whitespace check passed. The production preview was opened separately from the development session. At 1440×900 all primary views were inspected and four screenshots saved; at 1280×800 reading, comments, editor action bounds and focus mode were inspected. Published-draft discard preserved the current document and versions. Space filtering returned only that space's three pages; returning Home cleared the filter and restored continue-reading cards. The app footer remains pinned to the viewport on short lists. Screenshots show a real interaction session (a sample v5 revision, comments and an additional local draft); a fresh browser starts from the seeded v4 document.

The final production-preview session had **no captured runtime errors**. Link input rejected a JavaScript URL with visible feedback and inserted a valid HTTPS link at the cursor; discarding that verification draft retained the published page.
