const sources = $("Prepare Image Inputs").all()
const downloads = $input.all()
if (downloads.length !== sources.length) {
    throw new Error("Incomplete design image downloads")
}
const images = {}
let totalBytes = 0
for (let index = 0; index < downloads.length; index++) {
    const bytes = await this.helpers.getBinaryDataBuffer(index, "data")
    totalBytes += bytes.length
    if (!bytes.length || bytes.length > 12 * 1024 * 1024 || totalBytes > 48 * 1024 * 1024) {
        throw new Error("Design image download exceeds size limit")
    }
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    const png = bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
    if (!jpeg && !png) {
        throw new Error("Design image must be a JPEG or PNG")
    }
    images[sources[index].json.url] =
        `data:image/${jpeg ? "jpeg" : "png"};base64,${bytes.toString("base64")}`
}
return [{ json: { images } }]
