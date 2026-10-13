import type { ChapterId } from "@/lib/chapters";
import { About } from "./About";
import { Events } from "./Events";
import { Hobbies } from "./Hobbies";
import { Music } from "./Music";
import { People } from "./People";
import { Shelf } from "./Shelf";
import type { SiteContent } from "@/lib/content/schema";

export function ChapterBody({ id, content }: { id: ChapterId; content: SiteContent }) {
  switch (id) {
    case "about":
      return <About about={content.about} />;
    case "events":
      return <Events events={content.events} />;
    case "music":
      return <Music tracks={content.music} />;
    case "hobbies":
      return <Hobbies hobbies={content.hobbies} />;
    case "shelf":
      return <Shelf items={content.shelf} />;
    case "people":
      return <People people={content.people} />;
  }
}
