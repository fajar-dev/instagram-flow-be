import { config } from '../../config/config'
import { JsonInstagramCredentials } from './adapters/json-credentials.adapter'
import { GraphInstagramApi } from './adapters/graph-api.adapter'
import { InstagramService } from './instagram.service'
import { InstagramController } from './instagram.controller'
export const instagramService = new InstagramService(new JsonInstagramCredentials(config.instagram.credentialsFile))
export const instagramApi = new GraphInstagramApi(instagramService)
export const instagramController = new InstagramController(instagramService, instagramApi)
