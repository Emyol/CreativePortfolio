import type { ChapterId } from "@/lib/chapters";
import { About } from "./About";
import type { SiteContent } from "@/lib/content/schema";

export function ChapterBody({ id, content }: { id: ChapterId; content: SiteContent }) {
  switch (id) {
    case "about":
      return <About about={content.about} />;
    case "events":
      return null; // Task 14
    case "music":
      return null; // Task 16
    case "hobbies":
      return null; // Task 17
    case "shelf":
      return null; // Task 18
    case "people":
      return null; // Task 19
  }
}
