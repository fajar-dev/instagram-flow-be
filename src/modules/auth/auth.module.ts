import { mail } from "../../core/helpers/mail"
import { userService } from "../user/user.module"
import { AuthService } from "./auth.service"
import { AuthController } from "./auth.controller"
import { TypeOrmPasswordResetTokenRepository } from "./repositories/password-reset-token.repository"

const passwordResetTokens = new TypeOrmPasswordResetTokenRepository()

export const authService = new AuthService(userService, passwordResetTokens, mail)

export const authController = new AuthController(authService)
