import defaultMdxComponents from "fumadocs-ui/mdx";

export function getMDXComponents(components = {}) {
  return {
    ...defaultMdxComponents,
    ...components,
  };
}
