import type { ReactNode } from "react";

import chatStyles from "@/app/chat.module.css";
import { createStyleClass } from "@/features/dashboard/style-classes";

const chatClass = createStyleClass(chatStyles);
const indentBlockStyle = {
  display: "grid",
  width: "fit-content",
  maxWidth: "min(760px, calc(100% - 1rem))",
  gap: "8px",
  margin: "4px 0 4px 0.65rem",
  borderLeft: "2px solid rgba(94, 234, 212, 0.42)",
  borderRadius: "0 6px 6px 0",
  background: "rgba(20, 184, 166, 0.08)",
  padding: "9px 12px 9px 14px",
  color: "rgba(232, 238, 247, 0.9)",
} as const;
const bulletListStyle = {
  display: "grid",
  gap: "8px",
  margin: "2px 0 2px 0.35rem",
} as const;
const nestedBulletListStyle = {
  ...bulletListStyle,
  margin: "-2px 0 4px 2.45rem",
} as const;
const bulletItemStyle = {
  display: "grid",
  gridTemplateColumns: "0.65rem minmax(0, 1fr)",
  gap: "0.55rem",
  alignItems: "baseline",
} as const;
const orderedItemStyle = {
  display: "grid",
  gridTemplateColumns: "1.8rem minmax(0, 1fr)",
  gap: "0.55rem",
  alignItems: "baseline",
} as const;
const bulletDotStyle = {
  width: "0.34rem",
  height: "0.34rem",
  borderRadius: "999px",
  background: "rgba(94, 234, 212, 0.9)",
  boxShadow: "0 0 0 3px rgba(94, 234, 212, 0.1)",
  transform: "translateY(-0.05rem)",
} as const;
const orderedIndexStyle = {
  color: "rgba(94, 234, 212, 0.9)",
  fontSize: "0.82em",
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
} as const;
const fieldLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  transform: "translateY(-0.08em)",
  marginRight: "0.32rem",
  border: "1px solid rgba(94, 234, 212, 0.24)",
  borderRadius: "4px",
  background: "rgba(20, 184, 166, 0.08)",
  padding: "0.08rem 0.32rem",
  color: "rgba(94, 234, 212, 0.92)",
  fontSize: "0.68em",
  fontWeight: 850,
  letterSpacing: "0.08em",
  lineHeight: 1.25,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
} as const;
const fieldPattern = /\b(Name|Followers|Bio|Why|Post|Post context|Comment|Suggested DM|Suggested comment|Best action|Action|Profile|Handle|Engagement|URL|Link):/gi;

function safeMarkdownHref(href: string) {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|#)/i.test(trimmed)) return trimmed;
  return "#";
}

function splitTrailingUrlPunctuation(value: string) {
  const match = /^(.*?)([),.;:!?]+)?$/.exec(value);
  return {
    href: match?.[1] ?? value,
    trailing: match?.[2] ?? "",
  };
}

function renderInlineMarkdown(text: string, options: { links?: "anchor" | "text" } = {}): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|(?:https?:\/\/|mailto:)[^\s<]+)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    if (value.startsWith("`")) {
      parts.push(<code key={`${index}-code`}>{value.slice(1, -1)}</code>);
    } else if (value.startsWith("**")) {
      parts.push(<strong key={`${index}-strong`}>{value.slice(2, -2)}</strong>);
    } else if (value.startsWith("*")) {
      parts.push(<em key={`${index}-em`}>{value.slice(1, -1)}</em>);
    } else if (value.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value);
      parts.push(link ? options.links === "text" ? link[1] : (
        <a href={safeMarkdownHref(link[2])} key={`${index}-link`} onClick={(event) => event.stopPropagation()}>
          {link[1]}
        </a>
      ) : value);
    } else {
      const { href, trailing } = splitTrailingUrlPunctuation(value);
      parts.push(options.links === "text" ? href : (
        <a
          href={safeMarkdownHref(href)}
          key={`${index}-link`}
          onClick={(event) => event.stopPropagation()}
          rel="noopener noreferrer"
          target={href.startsWith("#") ? undefined : "_blank"}
        >
          {href}
        </a>
      ));
      if (trailing) parts.push(trailing);
    }
    cursor = index + value.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function renderFieldLine(text: string) {
  const matches = [...text.matchAll(fieldPattern)];
  if (!matches.length) return renderInlineMarkdown(text);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(...renderInlineMarkdown(text.slice(cursor, index)));
    parts.push(
      <strong
        key={`field-${index}`}
        style={{ ...fieldLabelStyle, marginLeft: parts.length ? "0.65rem" : 0 }}
      >
        {match[1]}
      </strong>,
    );
    cursor = index + match[0].length;
    if (text[cursor] === " ") cursor += 1;
  }
  if (cursor < text.length) parts.push(...renderInlineMarkdown(text.slice(cursor)));
  return parts;
}

export function ChatInlineMarkdown({ text }: { text: string }) {
  return <>{renderInlineMarkdown(text.replace(/\s+/g, " "), { links: "text" })}</>;
}

export function ChatMarkdown({ text, className, headingClassName }: { text: string; className?: string; headingClassName?: string }) {
  if (!text.trim()) return null;
  const lines = text.trim().split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let previousBlockKind = "";

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
      previousBlockKind = "code";
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(<strong className={headingClassName ?? chatClass("markdownHeading")} key={`heading-${index}`}>{renderInlineMarkdown(heading[2])}</strong>);
      index += 1;
      previousBlockKind = "heading";
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      const nested = previousBlockKind === "ordered";
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <div className={chatClass("markdownBulletList")} key={`list-${index}`} role="list" style={nested ? nestedBulletListStyle : bulletListStyle}>
          {items.map((item, itemIndex) => (
            <div className={chatClass("markdownBulletItem")} key={`${index}-${itemIndex}`} role="listitem" style={bulletItemStyle}>
              <span aria-hidden="true" className={chatClass("markdownBulletDot")} style={bulletDotStyle} />
              <span>{renderFieldLine(item)}</span>
            </div>
          ))}
        </div>,
      );
      previousBlockKind = "bullet";
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: Array<{ marker: string; text: string }> = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        const ordered = /^\s*(\d+)[.)]\s+(.+)$/.exec(lines[index]);
        if (ordered) items.push({ marker: `${ordered[1]}.`, text: ordered[2] });
        index += 1;
      }
      blocks.push(
        <div className={chatClass("markdownBulletList")} key={`ordered-${index}`} role="list" style={bulletListStyle}>
          {items.map((item, itemIndex) => (
            <div className={chatClass("markdownBulletItem")} key={`${index}-${itemIndex}`} role="listitem" style={orderedItemStyle}>
              <span aria-hidden="true" style={orderedIndexStyle}>{item.marker}</span>
              <span>{renderFieldLine(item.text)}</span>
            </div>
          ))}
        </div>,
      );
      previousBlockKind = "ordered";
      continue;
    }
    if (/^\s{2,}\S/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s{2,}\S/.test(lines[index])) {
        body.push(lines[index].replace(/^\s+/, ""));
        index += 1;
      }
      blocks.push(
        <div className={chatClass("markdownIndentBlock")} key={`indent-${index}`} style={indentBlockStyle}>
          {body.map((item, itemIndex) => <p key={`${index}-${itemIndex}`}>{renderFieldLine(item)}</p>)}
        </div>,
      );
      previousBlockKind = "indent";
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().startsWith("```")
      && !/^(#{1,3})\s+/.test(lines[index])
      && !/^\s*[-*]\s+/.test(lines[index])
      && !/^\s*\d+[.)]\s+/.test(lines[index])
      && !/^\s{2,}\S/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderFieldLine(paragraph.join("\n"))}</p>);
    previousBlockKind = "paragraph";
  }

  return <div className={className ?? chatClass("messageMarkdown")}>{blocks}</div>;
}
