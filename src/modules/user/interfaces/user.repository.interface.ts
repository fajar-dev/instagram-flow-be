import { User } from "../entities/user.entity"
import { IBaseRepository, SortOrder } from "../../../core/interfaces/base.repository.interface"

export type UserListRow = Pick<User, "id" | "name" | "photo" | "email" | "createdAt"> & { isActive: boolean | number }

export interface UserListFilters {
    isActive?: string
}

export interface IUserRepository extends IBaseRepository<User> {
    findAll(page: number, limit: number, q: string, filters?: UserListFilters, sortBy?: string, order?: SortOrder): Promise<{ data: UserListRow[]; total: number }>
    findByEmail(email: string): Promise<User | null>
    findByEmailWithPassword(email: string): Promise<User | null>
    findByIdWithPassword(id: number): Promise<User | null>
    saveInTransaction(data: Partial<User>): Promise<User>
}
