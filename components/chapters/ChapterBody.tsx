import type { ChapterId } from "@/lib/chapters";
import type { SiteContent } from "@/lib/content/schema";

export function ChapterBody({ id, content }: { id: ChapterId; content: SiteContent }) {
  void content; // used once the chapter components land (Tasks 13-19)
  switch (id) {
    case "about":
      return null; // Task 13
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
