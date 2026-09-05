"use client";

import React from "react";

/*
  A deliberately small renderer for what the coach actually writes.

  Models reach for markdown whether you ask them to or not — **bold** for emphasis, "- " for
  lists, "1." for steps, "###" for headings. Printed raw those asterisks are noise, so rather
  than fighting the model in the prompt this renders the handful of constructs it really uses.

  Not a markdown parser: no links, images, tables, code blocks or HTML. That is the point —
  the coach's output is text from a third-party service, and the safe way to display it is to
  support a closed set of formatting and treat everything else as literal characters. Nothing
  here can produce markup the model chose.
*/

/** Inline: **bold**, *italic* / _italic_, `code`. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])|_(.+?)_|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={key} className="font-semibold text-[var(--text)]">{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key}>{m[2]}</em>);
    else if (m[3] !== undefined) out.push(<em key={key}>{m[3]}</em>);
    else if (m[4] !== undefined)
      out.push(
        <code key={key} className="rounded bg-[var(--surface-2)] px-1 py-px text-[0.92em]">
          {m[4]}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Renders coach output: paragraphs, bullet and numbered lists, bold headings. */
export function CoachText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="ml-[3px] flex flex-col gap-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="area-text mt-[2px] leading-none">•</span>
              <span>{inline(b, `u${blocks.length}-${i}`)}</span>
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    }
    if (numbers.length) {
      blocks.push(
        <ol key={`o${blocks.length}`} className="ml-[3px] flex flex-col gap-1">
          {numbers.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="num area-text shrink-0 font-semibold">{i + 1}.</span>
              <span>{inline(b, `o${blocks.length}-${i}`)}</span>
            </li>
          ))}
        </ol>,
      );
      numbers = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const number = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);

    if (bullet) {
      if (numbers.length) flush();
      bullets.push(bullet[1]);
      continue;
    }
    if (number) {
      if (bullets.length) flush();
      numbers.push(number[1]);
      continue;
    }
    flush();
    if (heading) {
      blocks.push(
        <p key={blocks.length} className="font-semibold text-[var(--text)]">
          {inline(heading[1], `h${blocks.length}`)}
        </p>,
      );
      continue;
    }
    if (!line.trim()) continue;
    blocks.push(<p key={blocks.length}>{inline(line, `p${blocks.length}`)}</p>);
  }
  flush();

  return <div className={`flex flex-col gap-2 ${className ?? ""}`}>{blocks}</div>;
}
