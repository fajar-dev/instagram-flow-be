// Runs inside the n8n JavaScript runner with the explicitly allowed sharp module.
const sharp = require("sharp")
const event = $("Validate Event").first().json
const manifest = $("Get Manifest").first().json
const content = $("Parse Caption").first().json
const images = $("Materialize Images").first().json.images
const references = manifest.designReferences
const width = 1080
const height = event.output === "story" ? 1920 : 1350
const headerY = event.output === "story" ? 190 : 18
const footerY = event.output === "story" ? 1660 : 1260
const svg = (body) =>
    Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`
    )
const escape = (text) =>
    String(text).replace(
        /[&<>"']/g,
        (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]
    )

async function logo(url, targetWidth, targetHeight) {
    const data = images[url]
    if (typeof data !== "string" || !/^data:image\/(png|jpeg);base64,/.test(data)) {
        throw new Error("Missing original branding asset")
    }
    const bytes = Buffer.from(data.split(",")[1], "base64")
    return sharp(bytes, { limitInputPixels: 40000000 })
        .trim({ threshold: 10 })
        .resize(targetWidth, targetHeight, { fit: "contain", background: "#ffffff" })
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer()
}

const [partner, amti] = await Promise.all([
    logo(references?.partnerLogoUrl, 266, 96),
    logo(references?.logoUrl, 246, 84)
])
// Every frame receives identical pixel coordinates, official logo pixels and vector icons.
const panels = svg(`<path fill="white" d="M0 ${headerY}H246a60 60 0 0 1 0 120H0Z"/>
<path fill="white" d="M1080 ${headerY}H834a60 60 0 0 0 0 120H1080Z"/>
<text x="927" y="${headerY + 22}" text-anchor="middle" font-family="DejaVu Sans" font-size="16" fill="#222">Powered by:</text>
<path fill="white" d="M1080 ${footerY}H82a24 24 0 0 0 0 48H1080Z"/>
<g transform="translate(78 ${footerY + 12})" fill="none" stroke="#1684ae" stroke-width="1.7"><circle cx="12" cy="12" r="11"/><ellipse cx="12" cy="12" rx="5" ry="11"/><path d="M1 12h22M3 6h18M3 18h18"/></g>
<defs><linearGradient id="ig" x2="1" y2="1"><stop stop-color="#713ac7"/><stop offset=".5" stop-color="#e52d84"/><stop offset="1" stop-color="#ffb544"/></linearGradient></defs>
<g transform="translate(251 ${footerY + 12})"><rect width="24" height="24" rx="6" fill="url(#ig)"/><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="white" stroke-width="2"/><circle cx="17" cy="7" r="1.3" fill="white"/></g>
<g transform="translate(431 ${footerY + 12})"><circle cx="12" cy="12" r="12" fill="#25d366"/><path d="M5 21l1-5a8 8 0 1 1 4 3Z" fill="none" stroke="white" stroke-width="1.4"/><path d="M8 7q-2 5 7 10l2-3-3-2-1 2-3-3 1-1Z" fill="white"/></g>
<g transform="translate(662 ${footerY + 12})"><rect width="24" height="24" rx="2" fill="#087eb2"/><text x="3" y="19" font-family="DejaVu Sans" font-size="20" font-weight="bold" fill="white">in</text></g>
<g fill="#222" font-family="DejaVu Sans" font-size="14"><text x="110" y="${footerY + 30}">amti.co.id</text><text x="283" y="${footerY + 30}">Amtiofficial</text><text x="463" y="${footerY + 30}">+62 821-7370-1845</text><text x="694" y="${footerY + 30}" font-size="12">Asset Monitoring Teknologi Indonesia</text></g>`)

function titleLayer(title) {
    const words = String(title).trim().toUpperCase().split(/\s+/)
    const lines = []
    let line = ""
    for (const word of words) {
        // Long unbroken titles are wrapped too; never silently truncate factual text.
        for (const chunk of word.match(/.{1,30}/gu) || []) {
            if ((line + " " + chunk).trim().length > 30) {
                lines.push(line)
                line = chunk
            } else {
                line = (line + " " + chunk).trim()
            }
        }
    }
    if (line) {
        lines.push(line)
    }
    const size = Math.min(52, Math.floor(260 / Math.max(lines.length, 1)))
    const y = headerY + 178
    return svg(
        `<defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#103d60" stop-opacity=".82"/><stop offset="1" stop-color="#103d60" stop-opacity="0"/></linearGradient></defs><rect y="${headerY + 136}" width="1080" height="340" fill="url(#shade)"/>${lines.map((text, i) => `<text x="50" y="${y + i * (size + 8)}" font-family="DejaVu Sans" font-size="${size}" font-weight="bold" font-style="italic" fill="${i === 0 ? "white" : "#ffe229"}">${escape(text)}</text>`).join("")}`
    )
}

const responses = $input.all()
const expected = event.output === "feed" ? manifest.assets.length : 1
if (responses.length !== expected) {
    throw new Error("Cannot brand an incomplete image series")
}
const result = []
for (let index = 0; index < responses.length; index++) {
    const source = responses[index].json
    const encoded = source.data?.[0]?.b64_json
    if (
        source.error ||
        source.data?.length !== 1 ||
        typeof encoded !== "string" ||
        encoded.length > 16 * 1024 * 1024 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    ) {
        throw new Error("Invalid AI photograph for branding")
    }
    const input = Buffer.from(encoded, "base64")
    const metadata = await sharp(input, { limitInputPixels: 40000000 }).metadata()
    if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) !== 1) {
        throw new Error("AI photograph must be a static raster image")
    }
    const layers = [
        ...(index === 0 ? [{ input: titleLayer(content.title), top: 0, left: 0 }] : []),
        { input: panels, top: 0, left: 0 },
        { input: partner, top: headerY + 12, left: 12 },
        { input: amti, top: headerY + 28, left: 813 }
    ]
    const bytes = await sharp(input, { limitInputPixels: 40000000 })
        .rotate()
        .trim({ background: "#ffffff", threshold: 8 })
        .resize(width, height, { fit: "cover", position: "centre" })
        .flatten({ background: "#2e506f" })
        .composite(layers)
        .jpeg({ quality: 92 })
        .toBuffer()
    result.push({
        json: { data: [{ b64_json: bytes.toString("base64") }] },
        pairedItem: { item: index }
    })
}
return result
