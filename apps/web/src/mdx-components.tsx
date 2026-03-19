import defaultMdxComponents from "fumadocs-ui/mdx";

import Mermaid from "@/components/mdx/mermaid";

export function getMDXComponents(components = {}) {
  return {
    ...defaultMdxComponents,
    Mermaid,
    ...components,
  };
}
