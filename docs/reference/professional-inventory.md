# Professional portfolio inventory

Source: `../portfolioV2` (read 2026-10-13). Facts below come from
`lib/content/seed.json`, `PRODUCT.md` and `public/`. Paths are relative to portfolioV2
unless noted. This is a reference, not a content plan.

## What the creative site can draw on

### Voice
- Tagline: "Learn something new. Make something useful. Share what helps."
- Register: direct and specific, no jargon, no terminal costume (PRODUCT.md).
- Hero: "Hi, I'm Miel." / "I build software and enjoy working with people."

### Interests stated on the professional site
Only **Music** is plainly personal. The rest are work interests.

| Interest | Line from the site |
|---|---|
| Music | "Tempo, arrangement, and the cut. Another way to think about parts that have to arrive on time." |
| Peer teaching | "The moment a hard concept finally holds in a room, not only on a slide." |
| Campus logistics | "Getting people, rooms, and supplies in place before anything starts." |
| On-device AI | "Private models that stay useful when the network does not." |
| Language systems | "Lexers, parsers, ASTs, interpreters, and tooling people can actually use." |

### Events (organised or competed in, not attended)
| Year | Event | Role |
|---|---|---|
| 2025 | NASA Space Apps Challenge | Built CitySense |
| 2024 | Code Green for Campuses | 4th place |
| 2023-2025 | Campus-wide events | Logistics (check-in, supply distribution, venue preparation) |
| 2023-now | iCARE peer tutoring and faculty-led review sessions | Student assistant, 700+ STEM students |

### Projects (one-line stories)
| Project | Story |
|---|---|
| KitaKo | Private semantic image search that understands Taglish queries, fully on-device |
| iCARE Reservation | Shared-facility booking portal that catches room conflicts before submission |
| BekiLang | A programming language and web playground built around Philippine Swardspeak |
| CitySense | Planning cockpit with live environmental layers and an AI-assisted policy workflow |

BekiLang is the most personality-rich of the four.

### Stack (17 items, 4 categories)
- **Languages:** Python, TypeScript, Dart, Kotlin, C / C++
- **Runtime:** Flutter, Next.js, ONNX Runtime, REST APIs
- **Domains:** On-device ML, vector retrieval, geospatial, compilers
- **Delivery:** Git, SAP Activate, Agile / Scrum, Claude Code

Logos exist for Python, TypeScript, Dart, Kotlin, C++, Flutter, Next.js, ONNX, Git, SAP,
Claude. Provenance is in `public/logos/SOURCES.txt`.

### Not reusable here
- Certificates, awards, rank, leadership roles and metrics (professional framing).
- Phone number (owner removed it in V1; keep it out).
- CV PDF.

## Assets

| Kind | Where | Notes |
|---|---|---|
| Portrait | `public/hero-profile.png` | Only portrait. Used as an ASCII portrait on the pro site |
| Project images | `public/projects/{kitako,icare,bekilang,citysense}.jpg` | Screenshots |
| Logos | `public/logos/*.svg` | See above |
| Events, hobbies, music, people | none | Owner supplies; see `content-inbox/` |

## Gaps (only the owner can fill)

Hobbies, events attended, music, people and communities, candid photography, and any
personality beyond the one-liners above.

## Admin reuse map

The editor is about 2,000 lines and **copied, not shared**: it is tied to Next.js route
handlers and `proxy.ts`.

| Piece | Path | Size | Change needed |
|---|---|---|---|
| Editor UI | `app/admin/AdminEditor.tsx`, `admin.css` | 849 / 508 lines | Mostly generic; driven by the content schema |
| Admin pages | `app/admin/{layout,page}.tsx`, `app/admin/preview/page.tsx` | small | Preview must render the new site |
| API routes | `app/api/admin/{content,publish,upload,export}/route.ts`, `app/api/media/[name]/route.ts` | 27-73 lines each | Asset allowlist reads content keys |
| Auth | `app/auth/{login,callback,logout}/route.ts`, `proxy.ts`, `lib/supabase/{server,http}.ts` | small | None expected |
| Content model | `lib/content/model.ts` (249), `repository.ts` (54) | | **Rewrite the hard-coded lists below** |
| Schema | `supabase/migrations/202610120001_portfolio.sql` | | Run in a **new** Supabase project |
| Setup guide | `docs/admin-setup.md` | | Replace URLs, redirect URLs and owner UUID |
| Env | `.env.example` | | New project URL and publishable key; never a service-role key |

How it works: `contentSchema` is **derived from the shape of `seed.json`** by
`describe()`, so a new seed yields a new editor automatically.

Hard-coded in `lib/content/model.ts`, to rewrite for the new content:
- `iconNames` (icon select)
- `selections`: `icon`, `section`, `source`, `kind`, `category`
- `urls` (keys treated as URLs) and `images` (keys treated as images)
- the `textarea` key list
- the `category` special case for credentials

Properties worth keeping: draft/publish with optimistic revision check, owner allowlist,
RLS, immutable upload names, uploads limited to JPEG/PNG/WebP/PDF at 4 MB, ZIP export,
public reads that fall back to repo seed content.

Known limits to design around: free Supabase projects pause when inactive; uploaded media
needs Supabase to be available; public text is cached for an hour.
