import { User } from "../entities/user.entity"
import { resolveStorageUrl } from "../../../core/helpers/storage-url"

export class UserSerializer {

    static async single(user: User) {
        return {
            id: user.id,
            name: user.name,
            photo: await resolveStorageUrl(user.photo),
            email: user.email,
            isActive: Boolean(user.isActive),
            createdAt: user.createdAt
        }
    }

    static async collection(users: User[]) {
        return Promise.all(users.map(user => this.single(user)))
    }
}
