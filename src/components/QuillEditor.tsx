import { useEffect, useRef } from "react";
import type Quill from "quill";

export function QuillEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<Quill | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const initial = useRef(value);
  useEffect(() => {
    let cancelled = false;
    const container = host.current;
    if (!container) return;
    import("quill").then(({ default: Quill }) => {
      if (cancelled) return;
      const node = document.createElement("div");
      container.appendChild(node);
      const quill = new Quill(node, { theme: "snow", placeholder: "Write your article…", modules: { toolbar: [[{ header: [2, 3, false] }], ["bold", "italic", "underline", "strike"], [{ list: "ordered" }, { list: "bullet" }], ["blockquote", "link"], ["clean"]] } });
      editor.current = quill;
      quill.clipboard.dangerouslyPasteHTML(initial.current);
      quill.root.setAttribute("aria-label", "Article content");
      quill.on("text-change", () => callback.current(quill.getSemanticHTML()));
    });
    return () => { cancelled = true; editor.current = null; container.replaceChildren(); };
  }, []);
  useEffect(() => {
    const q = editor.current;
    if (q && value !== q.getSemanticHTML()) q.clipboard.dangerouslyPasteHTML(value, "silent");
  }, [value]);
  return <div ref={host} className="blog-editor min-w-0" />;
}