import { Fragment } from "react";
import { headingId, type KnowledgeHeading } from "@/lib/knowledge/headings";

export function RichNote({
  text,
  className,
  headingIds,
}: {
  text: string;
  className?: string;
  headingIds?: Set<string>;
}) {
  const used = headingIds ?? new Set<string>();
  const blocks = parseNoteBlocks(text);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const id = headingId(block.text, used);
          const Tag = block.level === 3 ? "h3" : "h2";
          return (
            <Tag key={`${block.type}-${index}`} id={id}>
              <InlineMarkdown text={block.text} />
            </Tag>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${item.slice(0, 32)}-${itemIndex}`}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`${block.type}-${index}`}>
            <InlineMarkdown text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

export function extractNoteHeadings(text: string, used = new Set<string>()): KnowledgeHeading[] {
  return parseNoteBlocks(text).flatMap((block) => {
    if (block.type !== "heading") return [];
    return [
      {
        id: headingId(block.text, used),
        title: block.text.replace(/:$/, ""),
        level: block.level,
      },
    ];
  });
}

export function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        const bold = part.match(/^\*\*(.+)\*\*$/);
        if (bold) {
          return <strong key={index}>{bold[1]}</strong>;
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

type NoteBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level: 2 | 3 }
  | { type: "list"; items: string[] };

function parseNoteBlocks(text: string): NoteBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: NoteBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const value = paragraph.join(" ").replace(/\s+/g, " ").trim();
    paragraph = [];
    if (value) blocks.push({ type: "paragraph", text: value });
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: "list", items: list });
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      list.push(listMatch[1].trim());
      continue;
    }

    const hashHeading = line.match(/^(#{1,3})\s+(.+)$/);
    if (hashHeading) {
      flushList();
      flushParagraph();
      blocks.push({
        type: "heading",
        level: hashHeading[1].length >= 3 ? 3 : 2,
        text: hashHeading[2].replace(/^\*\*|\*\*$/g, "").trim(),
      });
      continue;
    }

    if (/^(?:\*\*)?[A-Za-z][^:]{0,40}:\s*(?:\*\*)?$/.test(line)) {
      flushList();
      flushParagraph();
      blocks.push({
        type: "heading",
        level: 2,
        text: line.replace(/^\*\*|\*\*$/g, "").replace(/:$/, "").trim(),
      });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}
