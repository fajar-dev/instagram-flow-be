import type { Render } from "../entities/render.entity"

type PublicFields = Pick<
    Render,
    | "id"
    | "aiResultId"
    | "placement"
    | "format"
    | "width"
    | "height"
    | "assetId"
    | "renderState"
    | "createdAt"
    | "updatedAt"
>

export class RenderSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            aiResultId: value.aiResultId,
            placement: value.placement,
            format: value.format,
            width: value.width,
            height: value.height,
            assetId: value.assetId,
            renderState: value.renderState,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt
        }
    }

    static collection(values: PublicFields[]) {
        return values.map((value) => this.single(value))
    }
}
