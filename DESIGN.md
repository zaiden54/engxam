# Engxam interface

Engxam is a Russian-language workspace for postgraduate foreign-language exam preparation. Students collect scientific literature, maintain a glossary, and edit their research profile. Teachers read assigned students' work. Administrators manage people, cohorts, groups, and enrollments. Permissions, accepted volumes, and admission remain server-owned.

## Direction

The interface supports recurring reading and editing. Use continuous record lists, reveal lengthy editors inline, and preserve the selected enrollment when moving between literature and terminology. Use semantic links, native form inputs, and the shared button, collapsible, and dialog components.

```text
Engxam                                    Theme / Sign out
Home / Literature / Glossary / Profile
Page title and description
Selected enrollment and progress
Add actions, search and filters
Continuous records
Pagination
```

## Tokens and typography

- Use `background`, `card`, and `muted` for surfaces. Use `foreground` and `muted-foreground` for text.
- Use the burgundy `primary` token for principal actions, `accent` for selection, `destructive` for errors, and `ring` for focus. The CSS resolves each theme from `data-theme` on the document root, with the system theme as fallback.
- Use Manrope for Cyrillic and Latin text, with system fallbacks. Product text uses a rem scale. Mobile input text is at least 16px.
- Spacing follows a 4px scale. The radius token is 6px, with related sizes for controls and panels. Borders establish structure.
- Input outlines use a stronger semantic control-border token. Interactive states include hover, pressed, keyboard focus, disabled, and pending feedback. Muted text remains readable; metadata is not a decorative eyebrow.
- Use the local Radix-based shadcn components in `src/components/ui`. Pair fields with explicit labels and use Native Select for existing form submissions. See the development-only `/ui-preview` for component examples in both themes.

## Responsive behavior and accessibility

The header places role-specific links below the brand and account actions. Links wrap on narrow screens and identify the active page with `aria-current`. Editors and definition lists stack. Give controls on coarse pointers a target of at least 44px. Keep visible keyboard focus, the skip link, native form validation, password-manager support, and 200% text reflow.

Use status messages for routine updates and alerts for errors. Keep form values after a failed request and disable repeated submission while it is pending. The modal returns focus to its trigger after dismissal and keeps the explicit PDF cancellation action available during upload.

## Screen coverage

| Route or state | Roles | Shared components in use |
| --- | --- | --- |
| `/login`, `/password` | Guest | Guest panel, buttons, labeled inputs, errors and status |
| Study header and enrollment picker | Student, teacher, administrator | Role-specific links, theme switch and sign-out; Native Select for available enrollments |
| `/` | Student, teacher | Selected enrollment, accessible source and glossary progress, links to preparation sections, empty and unavailable states |
| `/` | Administrator | Home heading and management action |
| `/library` | Student, assigned teacher | Filters, history, pagination, progress and empty states; student-only source dialog, PDF operations, revision and archive actions |
| `/glossary` | Student, assigned teacher | Filters, context disclosures, pagination, progress and empty states; student-only entry and revision forms, batch preview and archive actions |
| `/account` | Student, teacher | Enrollment records and links; student-only dissertation topic and supervisor editing |
| `/account` | Administrator | User, cohort, group and enrollment forms, inline directories, checkbox and pagination |
| Access denied, unavailable enrollment, route error and 404 | Guests and relevant signed-in roles | Shared headings, messages and recovery actions |
| `/ui-preview` | Developer | Component examples, dialog, themes, progress and empty, error and pending states |

## Product truth

Library totals are declared volume, not accepted results. Glossary additions are not automatically accepted. The 600,000-character and 500-term targets are preparation requirements. Do not show progress, acceptance, or admission states without real data. No metrics may be invented for visual effect.
