import sanitize from "sanitize-html";

/**
 * Allowlist sanitiser for product descriptions (old site or admin). Produces well-formed HTML with
 * only simple formatting tags. Links are dropped (keeping their text) because many old descriptions
 * were copied from other shops and link back to them.
 */
export function sanitizeHtml(html: string): string {
  return sanitize(html || "", {
    allowedTags: ["p", "br", "ul", "ol", "li", "b", "strong", "i", "em", "u", "sup", "sub", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td", "dl", "dt", "dd", "hr"],
    allowedAttributes: {},
    transformTags: { h1: "h2", h5: "h4", h6: "h4", mark: "strong", pre: "p" },
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "svg", "math", "button", "select", "iframe", "template"],
    exclusiveFilter: (frame) => ["p", "li", "h2", "h3", "h4", "strong", "b"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren?.length,
  })
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .trim();
}
