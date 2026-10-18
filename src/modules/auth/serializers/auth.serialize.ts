import { resolveStorageUrl } from "../../../core/helpers/storage-url"
import { User } from "../../user/entities/user.entity"

export class AuthSerializer {
    static async single(user: User) {
        return {
            id: user.id,

            name: user.name,
            photo: await resolveStorageUrl(user.photo),
            email: user.email,
            isActive: Boolean(user.isActive),
            hasPassword: !!user.password,
        }
    }

    static async collection(users: User[]) {
        return Promise.all(users.map(u => this.single(u)))
    }
}
