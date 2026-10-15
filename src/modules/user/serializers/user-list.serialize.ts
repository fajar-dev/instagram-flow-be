import type { UserListRow } from "../interfaces/user.repository.interface"
import { resolveStorageUrl } from "../../../core/helpers/storage-url"

export class UserListSerializer {
    static async single(row: UserListRow) {
        return {
            id: row.id,
            name: row.name,
            photo: await resolveStorageUrl(row.photo),
            email: row.email || null,
            isActive: Boolean(row.isActive),
            createdAt: row.createdAt,
        }
    }

    static async collection(rows: UserListRow[]) {
        return Promise.all(rows.map(row => this.single(row)))
    }
}
