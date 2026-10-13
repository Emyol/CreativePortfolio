import { Fragment } from "react";
import { ChapterBody } from "@/components/chapters/ChapterBody";
import { ChapterSection } from "@/components/chapters/ChapterSection";
import { Footer } from "@/components/frame/Footer";
import { ScrollFrame } from "@/components/frame/ScrollFrame";
import { Hero } from "@/components/hero/Hero";
import { BrushDivider } from "@/components/motion/BrushDivider";
import { visibleChapters } from "@/lib/chapters";
import { getContent } from "@/lib/content/load";

export default async function Home() {
  const content = await getContent();
  const chapters = visibleChapters(content);

  return (
    <ScrollFrame>
      <Hero chapters={chapters} />
      <main id="main" tabIndex={-1}>
        {chapters.map((chapter, i) => (
          <Fragment key={chapter.id}>
            <BrushDivider from={i === 0 ? "top" : chapters[i - 1].season} to={chapter.season} seal={chapter.seal} />
            <ChapterSection chapter={chapter}>
              <ChapterBody id={chapter.id} content={content} />
            </ChapterSection>
          </Fragment>
        ))}
      </main>
      <Footer />
    </ScrollFrame>
  );
}
