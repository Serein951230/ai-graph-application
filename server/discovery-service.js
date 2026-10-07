import { Router } from 'express';

const router = Router();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const sources = [
    { name: '开源中国', url: 'https://www.oschina.net/news/rss', topic: '开发资讯', host: 'oschina.net', language: 'zh' },
    { name: 'InfoQ 中文', url: 'https://www.infoq.cn/feed', topic: '技术实践', host: 'infoq.cn', language: 'zh' },
    { name: '阮一峰科技周刊', url: 'https://www.ruanyifeng.com/blog/atom.xml', topic: '技术周刊', host: 'ruanyifeng.com', language: 'zh', upgradeHttp: true },
    { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/blog/rss.xml', topic: 'Web 开发', host: 'developer.mozilla.org', language: 'en' },
    { name: 'Python Insider', url: 'https://blog.python.org/rss.xml', topic: 'Python', host: 'blog.python.org', language: 'en' },
    { name: 'GitHub Changelog', url: 'https://github.blog/changelog/feed/', topic: '开发工具', host: 'github.blog', language: 'en' },
];
const newsCache = { items: [], updatedAt: 0, pending: null };
const jobsCache = new Map();
const domesticCache = { posts: [], updatedAt: 0, pending: null };
const excluded = /政治|选举|总统|议会|战争|金融|股票|通胀|利率|加密货币|政党|股价|财报|融资|并购|商业模式|增长战略|市场分析|election|president|parliament|warfare|stock market|inflation|cryptocurrency|documentation is now available in|election candidates|governance|sponsorship|pricing update/i;
const useful = /学习|教程|文档|开发|编程|软件|算法|模型|网页|浏览器|框架|版本|测试|安全|性能|数据|python|javascript|typescript|css|html|web|api|github|git|developer|programming|release|documentation|tutorial|browser|framework|security|performance|testing|database|react|node|\bai\b|code/i;
const educationalTitle = /教程|指南|实战|实践|如何|详解|解析|入门|升级|发布|新特性|开源|设计|构建|架构|优化|模型|算法|框架|API|开发|编程|测试|安全|性能|系统|版本|周刊|学习|React|Python|Java|代码|Node|CSS|Web|AI/i;

const xmlCodePoint = value => Number.isInteger(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
const decodeXml = value => String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => xmlCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => xmlCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();

function tag(block, name) {
    return block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '';
}

function safeUrl(value, expectedHost, upgradeHttp = false) {
    try {
        const url = new URL(decodeXml(value));
        if (upgradeHttp && url.protocol === 'http:') url.protocol = 'https:';
        return url.protocol === 'https:' && (url.hostname === expectedHost || url.hostname.endsWith(`.${expectedHost}`)) ? url.href : '';
    } catch { return ''; }
}

async function fetchText(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'AIGraphApplication/1.0', Accept: 'application/rss+xml, application/xml, application/json' } });
    if (!response.ok) throw new Error(`来源返回 ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 1_500_000) throw new Error('来源内容过大');
    const body = await response.text();
    if (body.length > 1_500_000) throw new Error('来源内容过大');
    return body;
}

export function parseFeed(xml, source) {
    const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0, 25);
    return blocks.map(([, , block]) => {
        const atomLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
        const title = decodeXml(tag(block, 'title')).slice(0, 180);
        const summary = decodeXml(tag(block, 'description') || tag(block, 'summary'))
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^(点击查看原文|阅读全文|阅读原文)$/i, '')
            .slice(0, 220);
        const url = safeUrl(atomLink || tag(block, 'link'), source.host, source.upgradeHttp);
        const rawDate = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated');
        const date = new Date(decodeXml(rawDate));
        return { title, summary, url, source: source.name, topic: source.topic, language: source.language, publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString() };
    }).filter(item => item.title && item.url && item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() < 180 * DAY && !excluded.test(`${item.title} ${item.summary}`) && useful.test(`${item.title} ${item.summary}`) && (item.language !== 'zh' || educationalTitle.test(item.title)));
}

async function refreshNews() {
    if (newsCache.pending) return newsCache.pending;
    newsCache.pending = (async () => {
        const results = await Promise.allSettled(sources.map(async source => parseFeed(await fetchText(source.url), source)));
        const items = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
        if (!items.length) throw new Error('资讯来源暂时无法连接');
        const seen = new Set();
        newsCache.items = items.filter(item => {
            if (seen.has(item.url)) return false;
            seen.add(item.url);
            return true;
        }).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')).slice(0, 120);
        newsCache.updatedAt = Date.now();
    })().finally(() => { newsCache.pending = null; });
    return newsCache.pending;
}

function termsForRole(role) {
    const mappings = [
        [/前端|网页|web/i, 'frontend'], [/后端|服务端/i, 'backend'], [/全栈/i, 'full stack'],
        [/人工智能|机器学习|大模型|算法/i, 'machine learning'], [/数据分析/i, 'data analyst'],
        [/数据工程/i, 'data engineer'], [/测试|质量保证/i, 'qa engineer'], [/产品经理/i, 'product manager'],
        [/设计|交互/i, 'designer'], [/运维|云计算/i, 'devops'], [/网络安全|安全工程/i, 'security engineer'],
        [/python/i, 'python'], [/java/i, 'java'], [/react/i, 'react'],
    ];
    return mappings.find(([pattern]) => pattern.test(role))?.[1] || role;
}

function matchesJobTitle(title, keyword) {
    const patterns = {
        frontend: /front[ -]?end|react|web (?:application )?(?:developer|engineer)/i,
        backend: /back[ -]?end|server[ -]?side|api (?:developer|engineer)/i,
        'full stack': /full[ -]?stack/i,
        'machine learning': /machine learning|\bai\b|\bml\b|artificial intelligence/i,
        'data analyst': /data analyst|analytics analyst|business intelligence/i,
        'data engineer': /data engineer|data platform/i,
        'qa engineer': /\bqa\b|quality assurance|test (?:engineer|automation)/i,
        'product manager': /product manager|product owner/i,
        designer: /designer|design engineer/i,
        devops: /devops|site reliability|cloud engineer/i,
        'security engineer': /security engineer|cybersecurity/i,
    };
    const pattern = patterns[keyword.toLowerCase()];
    if (pattern) return pattern.test(title);
    const words = keyword.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    return words.length > 0 && words.some(word => title.toLowerCase().includes(word));
}

async function fetchGithubJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'AIGraphApplication/1.0', Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`招聘社区返回 ${response.status}`);
    const body = await response.text();
    if (body.length > 2_500_000) throw new Error('招聘社区内容过大');
    return JSON.parse(body);
}

function rolePattern(role) {
    const patterns = [
        [/前端|frontend|front.end/i, /前端|front[ -]?end/i], [/后端|backend|服务端/i, /后端|服务端|back[ -]?end/i],
        [/全栈|full.stack/i, /全栈|full[ -]?stack/i], [/人工智能|机器学习|大模型|算法|\bai\b/i, /人工智能|机器学习|大模型|算法|AI工程师|AI Agent/i],
        [/数据分析/i, /数据分析|数据科学|data analyst/i], [/数据工程/i, /数据工程|data engineer/i],
        [/测试|质量保证/i, /测试工程师|测试开发|质量工程|QA/i], [/产品经理/i, /产品经理|product manager/i],
        [/设计|交互/i, /设计师|交互设计|UI\/UX/i], [/运维|云计算/i, /运维|云计算|DevOps|SRE/i],
        [/网络安全|安全工程/i, /安全工程|网络安全|安全专家/i], [/python/i, /python/i], [/java/i, /\bjava\b/i],
    ];
    return patterns.find(([match]) => match.test(role))?.[1] || null;
}

const chinaCity = /北京|上海|广州|深圳|杭州|成都|武汉|西安|南京|苏州|重庆|厦门|天津|郑州|合肥|长沙|宁波|珠海|无锡|青岛|济南|福州|东莞|佛山|湖州|昆明|贵阳|大连|沈阳|中国大陆|国内/g;
const overseasPlace = /迪拜|阿联酋|新加坡|日本|横滨|大阪|美国|加拿大|欧洲|香港|马来西亚|Dubai|Singapore|Japan|USA|Europe/i;
const cleanLine = line => decodeXml(String(line || '').replace(/^[\s#>*-]+/, '').replace(/[*`_]/g, '')).trim();

function domesticLocation(text) {
    const leading = text.slice(0, 650);
    const heading = leading.split('\n')[0];
    if (/全球远程|海外远程|global remote/i.test(heading)) return '';
    if (overseasPlace.test(heading) && !(heading.match(chinaCity) || []).length) return '';
    const cities = [...new Set(leading.match(chinaCity) || [])].slice(0, 3);
    if (cities.length) return cities.join(' / ');
    return /国内远程|中国境内远程|中国大陆远程|全国远程/.test(leading) ? '国内远程' : '';
}

function communityJob(post, role) {
    const body = String(post.body || '');
    const title = String(post.title || '');
    const pattern = rolePattern(role);
    const roleTerm = role.replace(/工程师|开发|设计师|岗位|高级|初级|实习|\s/g, '').toLowerCase();
    const matches = line => pattern ? pattern.test(line) : roleTerm.length >= 2 && line.toLowerCase().includes(roleTerm);
    const rawLines = body.split(/\r?\n/).filter(Boolean);
    const lines = rawLines.map(cleanLine).filter(Boolean);
    const jobLine = line => {
        const text = cleanLine(line);
        return text.length < 120 && !/[。；]/.test(text) && matches(text) && /工程师|开发(?!、)|设计师|产品经理|分析师|实习生|岗位/i.test(text);
    };
    const matchedLine = post.kind === 'issue' ? (matches(title) ? title : '')
        : (rawLines.find(line => /^\s*#{1,5}\s/.test(line) && jobLine(line)) || rawLines.find(jobLine) || '');
    if (!matchedLine || !/[\u3400-\u9fff]/.test(`${title} ${body}`)) return null;
    const location = domesticLocation(`${title}\n${body}`);
    if (!location) return null;
    const created = new Date(post.created_at);
    if (Number.isNaN(created.getTime()) || Date.now() - created.getTime() > 75 * DAY) return null;
    const url = safeUrl(post.html_url, 'github.com');
    if (!url) return null;
    const heading = cleanLine(lines[0] || title).slice(0, 65);
    return {
        id: String(post.id), title: cleanLine(matchedLine).slice(0, 130),
        company: post.kind === 'issue' ? 'Rebase 社区' : heading || '社区招聘帖',
        location, type: '社区发布', url, publishedAt: created.toISOString(),
        source: post.kind === 'issue' ? 'Rebase 招聘' : '阮一峰周刊 · 谁在招人', scope: 'domestic',
    };
}

async function loadDomesticPosts() {
    if (domesticCache.updatedAt && Date.now() - domesticCache.updatedAt < 3 * HOUR) return domesticCache.posts;
    if (domesticCache.pending) return domesticCache.pending;
    domesticCache.pending = (async () => {
        const [weeklyResult, rebaseResult] = await Promise.allSettled([
            (async () => {
                const search = new URL('https://api.github.com/search/issues');
                search.searchParams.set('q', `repo:ruanyf/weekly in:title 谁在招人 ${new Date().getFullYear()}年`);
                search.searchParams.set('sort', 'created'); search.searchParams.set('order', 'desc'); search.searchParams.set('per_page', '1');
                const result = await fetchGithubJson(search.href);
                const number = result.items?.[0]?.number;
                if (!number) return [];
                const comments = await fetchGithubJson(`https://api.github.com/repos/ruanyf/weekly/issues/${number}/comments?per_page=100`);
                return Array.isArray(comments) ? comments.map(post => ({ ...post, kind: 'comment' })) : [];
            })(),
            (async () => {
                const issues = await fetchGithubJson('https://api.github.com/repos/rebase-network/who-is-hiring/issues?state=open&sort=created&direction=desc&per_page=100');
                return Array.isArray(issues) ? issues.filter(post => !post.pull_request).map(post => ({ ...post, kind: 'issue' })) : [];
            })(),
        ]);
        const posts = [weeklyResult, rebaseResult].flatMap(result => result.status === 'fulfilled' ? result.value : []);
        if (!posts.length) throw new Error('国内招聘来源暂时无法连接');
        domesticCache.posts = posts;
        domesticCache.updatedAt = Date.now();
        return posts;
    })().finally(() => { domesticCache.pending = null; });
    return domesticCache.pending;
}

async function loadRemoteJobs(role) {
    const keyword = termsForRole(role).slice(0, 60);
    const cached = jobsCache.get(keyword);
    if (cached && Date.now() - cached.updatedAt < 12 * HOUR) return cached;
    const url = new URL('https://remotive.com/api/remote-jobs');
    url.searchParams.set('search', keyword);
    url.searchParams.set('limit', '12');
    const result = JSON.parse(await fetchText(url.href));
    const jobs = (Array.isArray(result.jobs) ? result.jobs : []).slice(0, 100).map(job => ({
        id: String(job.id || ''), title: String(job.title || '').slice(0, 180), company: String(job.company_name || '').slice(0, 100),
        location: String(job.candidate_required_location || '远程').slice(0, 100), type: String(job.job_type || '').slice(0, 60),
        url: safeUrl(job.url, 'remotive.com'), publishedAt: Number.isNaN(new Date(job.publication_date).getTime()) ? null : new Date(job.publication_date).toISOString(),
        source: 'Remotive',
    })).filter(job => job.title && job.url && matchesJobTitle(job.title, keyword)).slice(0, 8);
    const value = { jobs: jobs.map(job => ({ ...job, scope: 'overseas' })), scope: 'overseas', updatedAt: Date.now() };
    jobsCache.set(keyword, value);
    if (jobsCache.size > 30) jobsCache.delete(jobsCache.keys().next().value);
    return value;
}

async function loadJobs(role) {
    let domesticError;
    try {
        const posts = await loadDomesticPosts();
        const jobs = posts.map(post => communityJob(post, role)).filter(Boolean)
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 8);
        if (jobs.length) return { jobs, scope: 'domestic', updatedAt: domesticCache.updatedAt };
    } catch (error) { domesticError = error; }
    try { return await loadRemoteJobs(role); }
    catch (error) { if (domesticError) throw domesticError; throw error; }
}

router.get('/learning', async (req, res) => {
    try {
        if (Date.now() - newsCache.updatedAt >= HOUR || !newsCache.items.length) await refreshNews();
        const needs = String(req.query.needs || '').slice(0, 100).toLowerCase();
        const keywords = needs.split(/[\s,，、;；]+/).filter(word => word.length > 1).slice(0, 5);
        const ranked = newsCache.items.map(item => ({ item, score: keywords.reduce((sum, word) => sum + (item.title.toLowerCase().includes(word) ? 3 : 0) + (`${item.summary} ${item.topic}`.toLowerCase().includes(word) ? 1 : 0), 0) }));
        ranked.sort((a, b) => Number(b.item.language === 'zh') - Number(a.item.language === 'zh') || b.score - a.score || (b.item.publishedAt || '').localeCompare(a.item.publishedAt || ''));
        const selected = [];
        const sourceCount = new Map();
        for (const language of ['zh', 'en']) {
            const candidates = ranked.filter(entry => entry.item.language === language);
            for (const entry of candidates) {
                const count = sourceCount.get(entry.item.source) || 0;
                if (count >= 2 || selected.length === 6) continue;
                selected.push(entry.item);
                sourceCount.set(entry.item.source, count + 1);
            }
            if (selected.length < 6) {
                for (const entry of candidates) {
                    if (!selected.includes(entry.item)) selected.push(entry.item);
                    if (selected.length === 6) break;
                }
            }
            if (selected.length === 6) break;
        }
        res.json({ items: selected, updatedAt: new Date(newsCache.updatedAt).toISOString(), personalized: ranked.some(entry => entry.score > 0) });
    } catch (error) {
        if (newsCache.items.length) return res.json({ items: [...newsCache.items].sort((a, b) => Number(b.language === 'zh') - Number(a.language === 'zh')).slice(0, 6), updatedAt: new Date(newsCache.updatedAt).toISOString(), stale: true });
        res.status(503).json({ message: error.message, items: [] });
    }
});

router.get('/jobs', async (req, res) => {
    const role = String(req.query.role || '').trim().slice(0, 60);
    if (role.length < 2) return res.status(400).json({ message: '请先填写至少两个字的目标岗位' });
    try { res.json(await loadJobs(role)); }
    catch { res.status(503).json({ message: '岗位来源暂时无法连接，请稍后重试', jobs: [] }); }
});

export default router;

