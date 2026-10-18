import { expect, test } from 'bun:test'
import { isHttpsUrl } from '../src/core/helpers/url'

test('integration URLs require valid HTTPS without embedded credentials', () => {
    expect(isHttpsUrl('https://workflow.test/hook')).toBe(true)
    for (const url of ['https://', 'http://workflow.test', 'https://user:secret@workflow.test', 'not-a-url']) {
        expect(isHttpsUrl(url)).toBe(false)
    }
})
