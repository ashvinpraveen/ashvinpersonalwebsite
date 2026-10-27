"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type TextareaHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWorkspace } from "../data";
import { useUi } from "../ui";
import { Avatar } from "../icons";
import { cn } from "@/lib/utils";

function linkify(markdown: string, handles: Set<string>, teamKeys: Set<string>, base: string) {
  // Leave code blocks and inline code untouched.
  return markdown
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part
        .replace(/(^|[^\w@/[])@([a-z0-9][a-z0-9._-]{0,38})/gi, (match, lead: string, handle: string) =>
          handles.has(handle.toLowerCase()) ? `${lead}[@${handle}](#mention-${handle.toLowerCase()})` : match,
        )
        .replace(/(^|[\s(])([A-Z][A-Z0-9]{0,6})-(\d+)\b(?![\]/])/g, (match, lead: string, key: string, number: string) =>
          teamKeys.has(key) ? `${lead}[${key}-${number}](${base}/issue/${key}-${number})` : match,
        );
    })
    .join("");
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  const ws = useWorkspace();
  const ui = useUi();
  const source = useMemo(
    () =>
      linkify(
        children,
        new Set(ws.members.map((member) => member.handle)),
        new Set(ws.teams.map((team) => team.key)),
        `/quadratic/${ws.workspace.slug}`,
      ),
    [children, ws.members, ws.teams, ws.workspace.slug],
  );
  const base = `/quadratic/${ws.workspace.slug}`;
  return (
    <div className={cn("q-prose", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: content }) => {
            if (href?.startsWith("#mention-")) return <span className="q-mention">{content}</span>;
            if (href?.startsWith(base)) {
              return (
                <a
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    ui.navigate(href.slice(base.length));
                  }}
                >
                  {content}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" onClick={(event) => event.stopPropagation()}>
                {content}
              </a>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

/** Auto-growing textarea with @mention autocomplete. */
export function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  className,
  minRows = 1,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}) {
  const ws = useWorkspace();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ query: string; start: number; index: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
    // Restore the caret after a programmatic edit (mention insert) before the next keystroke.
    if (pendingCaret.current !== null) {
      element.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  const matches = useMemo(() => {
    if (!mention) return [];
    const query = mention.query.toLowerCase();
    return ws.members
      .filter((member) => member.handle.startsWith(query) || member.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [mention, ws.members]);

  const detectMention = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const match = /(^|\s)@([a-z0-9._-]{0,30})$/i.exec(before);
    setMention(match ? { query: match[2], start: caret - match[2].length - 1, index: 0 } : null);
  };

  const insert = (handle: string) => {
    if (!mention || !ref.current) return;
    const caret = ref.current.selectionStart;
    const next = `${value.slice(0, mention.start)}@${handle} ${value.slice(caret)}`;
    pendingCaret.current = mention.start + handle.length + 2;
    onChange(next);
    setMention(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && matches.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setMention({ ...mention, index: (mention.index + delta + matches.length) % matches.length });
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insert(matches[mention.index].handle);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMention(null);
        return;
      }
    }
    onKeyDown?.(event);
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={minRows}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          detectMention(event.target.value, event.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        data-mention-open={mention && matches.length ? "true" : undefined}
        onBlur={(event) => {
          setMention(null);
          props.onBlur?.(event);
        }}
        className={cn("block w-full resize-none overflow-hidden outline-none", className)}
        {...props}
      />
      {mention && matches.length ? (
        <div className="q-popover absolute left-0 top-full z-30 mt-1 w-[240px] p-1">
          {matches.map((member, index) => (
            <button
              key={member._id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                insert(member.handle);
              }}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-left text-q-text2",
                index === mention.index && "bg-q-active text-q-text",
              )}
            >
              <Avatar name={member.name} hue={member.avatarHue} size={16} />
              <span className="truncate">{member.name}</span>
              <span className="ml-auto text-[12px] text-q-text4">@{member.handle}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Click-to-edit markdown field used for issue and project descriptions. */
export function EditableMarkdown({
  value,
  onSave,
  placeholder = "Add description…",
  className,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <AutoTextarea
        autoFocus
        value={draft}
        onChange={setDraft}
        minRows={4}
        placeholder={placeholder}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setDraft(value);
            setEditing(false);
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
          }
        }}
        className={cn("text-[14px] leading-[1.65] text-q-text2", className)}
      />
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) return;
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") setEditing(true);
      }}
      className={cn("min-h-[44px] cursor-text rounded-[4px] outline-none", className)}
    >
      {value.trim() ? <Markdown>{value}</Markdown> : <span className="text-[14px] text-q-text4">{placeholder}</span>}
    </div>
  );
}
