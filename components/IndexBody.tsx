import Link from "next/link";
import type { ChapterId } from "@/lib/chapters";
import type { SiteContent } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";

/** One chapter's content as plain text and lists, with no motion. */
export function IndexBody({ id, content }: { id: ChapterId; content: SiteContent }) {
  switch (id) {
    case "about":
      return (
        <>
          {content.about.letter.map((p, i) => <p key={i}>{p}</p>)}
          {content.about.toolbox.length > 0 && <p>Toolbox: {content.about.toolbox.join(", ")}.</p>}
        </>
      );
    case "events":
      return (
        <ul>
          {content.events.map((e) => (
            <li key={e.slug}>
              <Link href={`/events/${e.slug}`}>{e.name}</Link>, {formatDate(e.date)}{e.place ? `, ${e.place}` : ""}. {e.summary}
            </li>
          ))}
        </ul>
      );
    case "music":
      return (
        <ol>
          {content.music.map((t, i) => (
            <li key={i}>{t.link ? <a href={t.link}>{t.title}</a> : t.title}{t.note ? `: ${t.note}` : ""}</li>
          ))}
        </ol>
      );
    case "hobbies":
      return (
        <ul>
          {content.hobbies.map((h, i) => (
            <li key={i}>{h.link ? <a href={h.link}>{h.name}</a> : h.name}: {h.note}</li>
          ))}
        </ul>
      );
    case "shelf":
      return (
        <ul>
          {content.shelf.map((s, i) => (
            <li key={i}>{s.title} ({s.kind}): {s.note.replace(/\s*\n\s*\n\s*/g, " ")}</li>
          ))}
        </ul>
      );
    case "people":
      return (
        <ul>
          {content.people.map((p, i) => (
            <li key={i}>{p.link ? <a href={p.link}>{p.name}</a> : p.name}, {p.relation}{p.note ? `. ${p.note}` : ""}</li>
          ))}
        </ul>
      );
  }
}
