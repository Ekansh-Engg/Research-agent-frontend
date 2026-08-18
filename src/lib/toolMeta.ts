export type ToolKey = "web_search" | "sql_query" | "rag_retrieval" | "none";

export const toolMeta: Record<
  ToolKey,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  web_search: {
    label: "Web Search",
    dot: "bg-coral",
    text: "text-coral",
    bg: "bg-coral-soft",
    border: "border-coral",
  },
  sql_query: {
    label: "SQL Query",
    dot: "bg-teal",
    text: "text-teal",
    bg: "bg-teal-soft",
    border: "border-teal",
  },
  rag_retrieval: {
    label: "Document Search",
    dot: "bg-violet",
    text: "text-violet",
    bg: "bg-violet-soft",
    border: "border-violet",
  },
  none: {
    label: "Reasoning",
    dot: "bg-amber",
    text: "text-amber",
    bg: "bg-amber-soft",
    border: "border-amber",
  },
};

export function getToolMeta(tool: string) {
  return toolMeta[tool as ToolKey] ?? toolMeta.none;
}
