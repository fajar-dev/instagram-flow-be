import { expect, test } from "bun:test"
import { JsonInstagramCredentials } from "../src/modules/instagram/adapters/json-credentials.adapter"

test("shipped Instagram Login example is readable with disabled accounts", async () => {
    const path = new URL("../secrets/instagram-accounts.example.json", import.meta.url).pathname
    const credentials = await new JsonInstagramCredentials(path).read()
    expect(credentials.accounts).toHaveLength(1)
    expect(credentials.accounts[0]?.enabled).toBe(false)
    expect(credentials.accounts[0]?.accessToken).toBe("")
})
