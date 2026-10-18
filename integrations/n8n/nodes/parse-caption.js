const raw = $json.choices?.[0]?.message?.content;
if (typeof raw !== 'string') throw new Error('Missing caption');
const content = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));
if (typeof content.title !== 'string' || !content.title.trim() || content.title.length > 100
    || typeof content.caption !== 'string' || !content.caption.trim() || content.caption.length > 2200
    || !Array.isArray(content.hashtags) || content.hashtags.length > 30
    || content.hashtags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 100)) {
    throw new Error('Invalid generated caption');
}
return [{ json: { title: content.title.trim(), caption: content.caption.trim(), hashtags: [...new Set(content.hashtags.map(tag => '#' + tag.trim().replace(/^#+/, '').replace(/\s+/g, '')))] } }];
