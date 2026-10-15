import { minio } from "../../core/helpers/minio"
import { StorageService } from "./storage.service"
import { StorageController } from "./storage.controller"

export const storageController = new StorageController(new StorageService(minio))
