import { Fragment } from "react";

export function RichNote({ text, className }: { text: string; className?: string }) {
  const blocks = parseNoteBlocks(text);

  return (
    <div className={className ?? "space-y-5 text-base leading-8 text-foreground/90"}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={`${block.type}-${index}`} className="pt-2 text-lg font-semibold tracking-tight">
              <InlineMarkdown text={block.text} />
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`} className="space-y-3">
              {block.items.map((item, itemIndex) => (
                <li key={`${item.slice(0, 32)}-${itemIndex}`} className="flex gap-3">
                  <span className="mt-3 size-1.5 shrink-0 rounded-full bg-foreground" />
                  <span>
                    <InlineMarkdown text={item} />
                  </span>
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
  | { type: "heading"; text: string }
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

    if (/^#{1,3}\s+/.test(line) || /^(?:\*\*)?[A-Za-z][^:]{0,40}:\s*(?:\*\*)?$/.test(line)) {
      flushList();
      flushParagraph();
      blocks.push({
        type: "heading",
        text: line.replace(/^#{1,3}\s+/, "").replace(/^\*\*|\*\*$/g, "").trim(),
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
