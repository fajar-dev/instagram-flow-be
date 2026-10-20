import { DOMParser, XMLSerializer } from "@xmldom/xmldom"
import { BadRequestException } from "../../../../core/exceptions/base"

const tags = new Set([
    "svg",
    "g",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "path",
    "text",
    "tspan",
    "image"
])
const attributes = new Set([
    "xmlns",
    "width",
    "height",
    "viewBox",
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "d",
    "points",
    "fill",
    "stroke",
    "stroke-width",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "transform",
    "font-size",
    "font-family",
    "font-weight",
    "text-anchor",
    "preserveAspectRatio",
    "href"
])

/** Reject active/XML content; images are embedded from our asset, never fetched from callback URLs. */
export function sanitizeSvg(
    svg: string,
    image: Buffer,
    validateImageUrl: (url: string) => boolean
): string {
    if (/<!DOCTYPE|<!ENTITY|<\?/i.test(svg)) {
        throw new BadRequestException("Unsafe SVG")
    }
    let invalid = false
    let doc: ReturnType<DOMParser["parseFromString"]>
    try {
        doc = new DOMParser({
            onError: () => {
                invalid = true
            }
        }).parseFromString(svg, "image/svg+xml")
    } catch {
        throw new BadRequestException("Invalid SVG")
    }
    if (invalid || doc.documentElement?.tagName !== "svg") {
        throw new BadRequestException("Invalid SVG")
    }
    const walk = (element: Element) => {
        if (!tags.has(element.tagName)) {
            throw new BadRequestException("Unsafe SVG element")
        }
        for (let i = element.attributes.length - 1; i >= 0; i--) {
            const attr = element.attributes.item(i)!
            if (
                !attributes.has(attr.name) ||
                (/url\s*\(|javascript:|data:|https?:/i.test(attr.value) &&
                    !["href", "xmlns"].includes(attr.name))
            ) {
                throw new BadRequestException("Unsafe SVG attribute")
            }
            if (attr.name === "xmlns" && attr.value !== "http://www.w3.org/2000/svg") {
                throw new BadRequestException("Unsafe SVG namespace")
            }
            if (attr.name === "href") {
                if (element.tagName !== "image" || !validateImageUrl(attr.value)) {
                    throw new BadRequestException("Unsafe SVG image source")
                }
                element.setAttribute("href", `data:image/jpeg;base64,${image.toString("base64")}`)
            }
        }
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes.item(i)!
            if (child.nodeType === 1) {
                walk(child as unknown as Element)
            } else if (child.nodeType !== 3 && child.nodeType !== 8) {
                throw new BadRequestException("Unsafe SVG node")
            }
        }
    }
    walk(doc.documentElement as unknown as Element)
    return new XMLSerializer().serializeToString(doc)
}
