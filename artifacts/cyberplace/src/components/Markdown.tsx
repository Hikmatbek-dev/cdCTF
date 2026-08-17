import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * Renders **bold**, *italic* and `code` inside one line.
 */
export function renderInline(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|!\[.*?\]\(.*?\))/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return <strong key={key} className="font-bold text-foreground">{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return <code key={key} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[0.85em] border border-primary/15">{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return <em key={key}>{tok.slice(1, -1)}</em>;
    }
    if (tok.startsWith("![") && tok.endsWith(")")) {
      const mdImageMatch = tok.match(/!\[(.*?)\]\((.*?)\)/);
      if (mdImageMatch) {
        return (
          <img 
            key={key} 
            src={mdImageMatch[2]} 
            alt={mdImageMatch[1]} 
            className="inline-block max-h-48 rounded-lg shadow-sm align-middle mx-2" 
          />
        );
      }
    }
    return tok;
  });
}

function tableCells(line: string) {
  return line.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
}

function isTableSeparator(line: string) {
  return /^\|[\s:|-]+\|$/.test(line.trim()) && line.includes("-");
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden bg-[#111726] border border-[#243049] group/code">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#243049] bg-[#161d30]">
        <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
          {lang || t("shell", "shell", "shell")}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 -mr-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={t("Copy code", "Nusxa olish", "Копировать")}
        >
          {copied
            ? <><Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />{t("Copied", "Nusxa olindi", "Скопировано")}</>
            : <><Copy className="w-3.5 h-3.5" aria-hidden="true" />{t("Copy", "Nusxa", "Копия")}</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderLines(lines: string[], blockKey: number) {
  const out: React.ReactNode[] = [];
  let j = 0;
  while (j < lines.length) {
    const line = lines[j];

    if (line.trim().startsWith("|") && j + 1 < lines.length && isTableSeparator(lines[j + 1])) {
      const header = tableCells(line);
      const rows: string[][] = [];
      let k = j + 2;
      while (k < lines.length && lines[k].trim().startsWith("|")) {
        rows.push(tableCells(lines[k]));
        k++;
      }
      out.push(
        <div key={`t-${blockKey}-${j}`} className="my-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary/[0.05]">
                {header.map((cell, c) => (
                  <th key={c} className="text-left font-semibold py-2.5 px-4 align-top border-b border-border">
                    {renderInline(cell, `th-${blockKey}-${j}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-border/50 last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="py-2.5 px-4 align-top text-muted-foreground">
                      {renderInline(cell, `td-${blockKey}-${j}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      j = k;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      let k = j;
      while (k < lines.length && lines[k].startsWith("- ")) {
        items.push(lines[k].slice(2));
        k++;
      }
      out.push(
        <ul key={`ul-${blockKey}-${j}`} className="my-4 space-y-2">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-3 text-[15px] leading-7 text-muted-foreground">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden="true" />
              <span>{renderInline(it, `li-${blockKey}-${j}-${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      j = k;
      continue;
    }

    if (line.startsWith("## ")) {
      out.push(<h2 key={j} className="text-xl font-semibold tracking-tight mt-8 mb-3 text-foreground scroll-mt-24">{renderInline(line.slice(3), `h2-${blockKey}-${j}`)}</h2>);
    } else if (line.startsWith("# ")) {
      out.push(<h1 key={j} className="text-2xl font-bold tracking-tight mt-8 mb-3">{renderInline(line.slice(2), `h1-${blockKey}-${j}`)}</h1>);
    } else if (line.trim() === "") {
      // blank
    } else if (line.trim().startsWith("<img") || line.trim().startsWith("![")) {
      // Parse markdown image ![alt](url) or HTML img tag
      const mdImageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (mdImageMatch) {
        out.push(
          <img 
            key={`img-${blockKey}-${j}`} 
            src={mdImageMatch[2]} 
            alt={mdImageMatch[1]} 
            className="w-full max-w-2xl mx-auto rounded-xl shadow-lg border border-border/50 my-8 object-contain bg-muted/20" 
          />
        );
      } else {
        const srcMatch = line.match(/src=["'](.*?)["']/);
        const altMatch = line.match(/alt=["'](.*?)["']/);
        if (srcMatch) {
          out.push(
            <img 
              key={`img-${blockKey}-${j}`} 
              src={srcMatch[1]} 
              alt={altMatch ? altMatch[1] : ""} 
              className="w-full max-w-2xl mx-auto rounded-xl shadow-lg border border-border/50 my-8 object-contain bg-muted/20" 
            />
          );
        } else {
          out.push(<p key={j} className="text-[15px] leading-7 text-muted-foreground my-3">{renderInline(line, `p-${blockKey}-${j}`)}</p>);
        }
      }
    } else {
      out.push(<p key={j} className="text-[15px] leading-7 text-muted-foreground my-3">{renderInline(line, `p-${blockKey}-${j}`)}</p>);
    }
    j++;
  }
  return out;
}

export function Markdown({ content }: { content: string }) {
  const parts = (content || "").split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return <CodeBlock key={i} code={code} lang={lang} />;
        }
        return <div key={i}>{renderLines(part.split("\n"), i)}</div>;
      })}
    </>
  );
}
