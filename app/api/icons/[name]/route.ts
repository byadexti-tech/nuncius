import dynamicIconImports from "lucide-react/dynamicIconImports";

type IconContext = { params: Promise<{ name: string }> };
type LucideIconName = keyof typeof dynamicIconImports;
type IconNode = Array<
  [string, Record<string, string | number | undefined>]
>;

function escapeAttribute(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderIconNode(iconNode: IconNode) {
  const children = iconNode
    .map(([tag, attributes]) => {
      const serializedAttributes = Object.entries(attributes)
        .filter(([attribute, value]) => attribute !== "key" && value != null)
        .map(([attribute, value]) => {
          const svgAttribute = attribute.replace(
            /[A-Z]/g,
            (letter) => `-${letter.toLowerCase()}`,
          );
          return `${svgAttribute}="${escapeAttribute(value!)}"`;
        })
        .join(" ");
      return `<${tag}${serializedAttributes ? ` ${serializedAttributes}` : ""}/>`;
    })
    .join("");

  return `<svg class="nc-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
}

export async function GET(_request: Request, context: IconContext) {
  const { name } = await context.params;
  if (!(name in dynamicIconImports)) {
    return new Response("Ícone não encontrado.", { status: 404 });
  }

  const iconModule = await dynamicIconImports[name as LucideIconName]();
  const markup = renderIconNode(iconModule.__iconNode as IconNode);

  return new Response(markup, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
