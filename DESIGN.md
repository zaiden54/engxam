# Engxam interface

Engxam is a Russian-language workspace for postgraduate foreign-language exam preparation. Students collect scientific literature, maintain a glossary, and edit their research profile. Teachers read assigned students' work. Administrators manage people, cohorts, groups, and enrollments. Permissions, accepted volumes, and admission remain server-owned.

## Direction

The interface supports recurring reading and editing. Use continuous record lists, reveal lengthy editors inline, and preserve the selected enrollment when moving between literature and terminology. Use semantic links, native form inputs, and the shared button, collapsible, and dialog components.

```text
Desktop header    Engxam                          Theme / Sign out
Desktop sidebar   Home | Sources | Glossary | Profile
Main              Page title, study context, page content
Mobile header     Engxam                                       Menu
Mobile bottom     Home | Sources | Glossary | Profile
```

## Tokens and typography

- Use `background`, `card`, and `muted` for surfaces. Use `foreground` and `muted-foreground` for text.
- Use `primary` and `primary-foreground` for principal actions. Use the readable red `accent-ink` for links and progress, `accent` for the selected surface, `destructive` for errors, and `ring` for offset keyboard focus. The warmer brand accent is available for decorative borders.
- Light surfaces use `#F6F5F9`, `#FFFFFF`, and `#EEECF3`. Dark surfaces use `#25262F`, `#393B48`, and `#343642`. Main text is `#171520` or `#F5F5F5`. The CSS resolves each theme from `data-theme` on the document root, with the system theme as fallback.
- Use Manrope for Cyrillic and Latin text, with system fallbacks. Product text uses a rem scale. Mobile input text is at least 16px.
- Spacing follows a 4px scale. The radius token is 6px, with related sizes for controls and panels. Borders establish structure.
- Input outlines use a stronger semantic control-border token. Interactive states include hover, pressed, keyboard focus, disabled, and pending feedback. Muted text remains readable; metadata is not a decorative eyebrow.
- Use the local Radix-based shadcn components in `src/components/ui`. Pair fields with explicit labels and use Native Select for existing form submissions. See the development-only `/ui-preview` for component examples in both themes.

## Responsive behavior and accessibility

At 1024 CSS px and above, a sidebar lists the role’s sections. The menu holds those links at 768–1023 CSS px and closes on navigation or Escape, with Escape restoring focus to the trigger. Below 768 CSS px, the header menu holds account actions and the fixed bottom bar holds the section links. Links wrap and identify the active page with `aria-current`. The bottom bar reserves its measured height, including the device safe area, for content and keyboard scrolling. Editors and definition lists stack. Give controls on coarse pointers a target of at least 44px. Keep visible keyboard focus, the skip link, native form validation, password-manager support, and 200% text reflow.

Use status messages for routine updates and alerts for errors. Keep form values after a failed request and disable repeated submission while it is pending. The modal returns focus to its trigger after dismissal and keeps the explicit PDF cancellation action available during upload.

## Screen coverage

| Route or state | Roles | Shared components in use |
| --- | --- | --- |
| `/login`, `/password` | Guest | Guest panel, buttons, labeled inputs, errors and status |
| Study header | Student, teacher, administrator | Role-specific links, theme switch and sign-out |
| `/` | Student | Current group, accessible source and glossary progress, links to preparation sections |
| `/` | Teacher | Group directory, student list and selected student's progress, with empty and unavailable states |
| `/` | Administrator | Home heading and management action |
| `/library` | Student, assigned teacher | Filters, history, pagination, progress and empty states; student-only source dialog, PDF operations, revision and archive actions |
| `/glossary` | Student, assigned teacher | Filters, context disclosures, pagination, progress and empty states; student-only entry and revision forms, batch preview and archive actions |
| `/account` | Student, teacher | Enrollment records and links; student-only dissertation topic and supervisor editing |
| `/account` | Administrator | User, cohort, group and enrollment forms, inline directories, checkbox and pagination |
| Access denied, unavailable enrollment, route error and 404 | Guests and relevant signed-in roles | Shared headings, messages and recovery actions |
| `/ui-preview` | Developer | Component examples, dialog, themes, progress and empty, error and pending states |

## Product truth

Library totals are declared volume, not accepted results. Glossary additions are not automatically accepted. The 600,000-character and 500-term targets are preparation requirements. Do not show progress, acceptance, or admission states without real data. No metrics may be invented for visual effect.
