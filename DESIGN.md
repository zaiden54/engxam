# Engxam interface

Engxam is a Russian-language workspace for postgraduate foreign-language exam preparation. Students collect scientific literature, maintain a glossary, and edit their research profile. Teachers read assigned students' work. Administrators manage people, cohorts, groups, and enrollments. Permissions, accepted volumes, and admission remain server-owned.

## Direction

The interface serves recurring work: compact reading and editing surfaces, predictable navigation, and visible context. Use continuous record lists rather than a grid of cards. Reveal lengthy forms inline. Preserve the selected enrollment when moving between literature and terminology. Use native controls and semantic links, buttons, details, and dialogs.

```text
Navigation | Course context
           | Preparation sections / back to account
           | Page title                     Actual record counts
           | Description or acceptance caveat
           | Add actions / inline editor
           | Search and filters
           | Continuous records
           | Pagination
```

## Tokens and typography

- Canvas `#fafbfa`; paper `#ffffff`; secondary surface `#f3f5f3`.
- Text `#242c28`; secondary text `#626c65`; separator `#dfe4e0`.
- Interaction `#285b46`; selected surface `#e8f0eb`; error `#a2352c`.
- Native system sans with Cyrillic support. Product text uses a fixed rem scale: 12px metadata, 13px controls, 14px content, 18px section titles, 26px page titles. Mobile input text is at least 16px.
- Spacing follows 4/8/12/16/24/32px. Small control radii are 5px; grouped surfaces are 6px. Borders establish structure; no decorative shadows, gradients, illustrations, or blur.
- Input outlines use a stronger semantic control-border token. Interactive states include hover, pressed, keyboard focus, disabled, and pending feedback. Muted text remains readable; metadata is not a decorative eyebrow.

## Responsive behavior and accessibility

Desktop navigation occupies 224px. At tablet widths it narrows; at mobile widths it becomes wrapping horizontal navigation. Editors and definition lists stack. Controls on coarse pointers have 44px minimum height. Content wraps without hiding values. Preserve password managers, paste, native form validation, skip navigation, and native dialog focus handling. No unsolicited animation.

## Product truth

Library totals are declared volume, not accepted results. Glossary additions are not automatically accepted. The 600,000-character and 500-term targets are preparation requirements. Do not show progress, acceptance, or admission states without real data. No metrics may be invented for visual effect.
