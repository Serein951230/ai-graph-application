import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import aiRouter from './ai-service.js';
import discoveryRouter from './discovery-service.js';

dotenv.config();

const require = createRequire(import.meta.url);
const tencentcloud = require('tencentcloud-sdk-nodejs');
const SesClient = tencentcloud.ses.v20201002.Client;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const app = express();
const port = Number(process.env.API_PORT || 5174);
const codeStore = new Map();
const emailSendStore = new Map();
const ipSendStore = new Map();
const codeTtlMs = 10 * 60 * 1000;
const emailCooldownMs = Number(process.env.CODE_EMAIL_COOLDOWN_SECONDS || 60) * 1000;
const emailDailyLimit = Number(process.env.CODE_EMAIL_DAILY_LIMIT || 8);
const ipHourlyLimit = Number(process.env.CODE_IP_HOURLY_LIMIT || 20);
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/ai', aiRouter);
app.use('/api/discovery', discoveryRouter);

function hasSmtpConfig() {
    const values = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS].map(value => String(value || '').trim());
    const placeholders = ['smtp.example.com', 'your-sender@example.com', 'your-service-smtp-password', 'your-smtp-password-or-app-password'];
    return values.every(Boolean) && values.every(value => !placeholders.includes(value));
}

function hasTencentSesConfig() {
    const values = [process.env.TENCENT_SECRET_ID, process.env.TENCENT_SECRET_KEY, process.env.TENCENT_SES_FROM].map(value => String(value || '').trim());
    return values.every(Boolean);
}

function hasMailConfig() {
    return hasTencentSesConfig() || hasSmtpConfig();
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

function createTencentSesClient() {
    return new SesClient({
        credential: {
            secretId: process.env.TENCENT_SECRET_ID,
            secretKey: process.env.TENCENT_SECRET_KEY,
        },
        region: process.env.TENCENT_SES_REGION || 'ap-hongkong',
        profile: {
            signMethod: 'TC3-HMAC-SHA256',
            httpProfile: {
                reqMethod: 'POST',
                reqTimeout: 30,
            },
        },
    });
}

function buildTencentSesRequest(to, code) {
    const request = {
        FromEmailAddress: process.env.TENCENT_SES_FROM,
        Destination: [to],
        Subject: 'AI图谱应用验证码',
        TriggerType: 1,
    };
    const templateId = Number(process.env.TENCENT_SES_TEMPLATE_ID || 0);
    if (templateId) {
        request.Template = {
            TemplateID: templateId,
            TemplateData: JSON.stringify({ code }),
        };
        return request;
    }

    request.Simple = {
        Text: Buffer.from(`你的验证码是：${code}。验证码 10 分钟内有效。`).toString('base64'),
        Html: Buffer.from(`<p>你的验证码是：</p><h2>${code}</h2><p>验证码 10 分钟内有效。</p>`).toString('base64'),
    };
    return request;
}

async function sendVerificationEmail(to, code) {
    if (hasTencentSesConfig()) {
        const client = createTencentSesClient();
        await client.SendEmail(buildTencentSesRequest(to, code));
        return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'AI图谱应用验证码',
        text: `你的验证码是：${code}。验证码 10 分钟内有效。`,
        html: `<p>你的验证码是：</p><h2>${code}</h2><p>验证码 10 分钟内有效。</p>`,
    });
}

function normalizeContact(contact) {
    return String(contact || '').trim().toLowerCase();
}

function codeKey(method, contact) {
    return `${method}:${normalizeContact(contact)}`;
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function getWindowRecord(store, key, windowMs) {
    const now = Date.now();
    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
        const nextRecord = { count: 0, resetAt: now + windowMs, lastSentAt: 0 };
        store.set(key, nextRecord);
        return nextRecord;
    }
    return existing;
}

function assertSendAllowed(req, method, contact) {
    const now = Date.now();
    const key = codeKey(method, contact);
    const emailRecord = getWindowRecord(emailSendStore, key, dayMs);
    const ipRecord = getWindowRecord(ipSendStore, getClientIp(req), hourMs);

    if (emailRecord.lastSentAt && now - emailRecord.lastSentAt < emailCooldownMs) {
        const retryAfter = Math.ceil((emailCooldownMs - (now - emailRecord.lastSentAt)) / 1000);
        return { allowed: false, status: 429, message: `发送太频繁，请 ${retryAfter} 秒后再试。` };
    }
    if (emailRecord.count >= emailDailyLimit) {
        return { allowed: false, status: 429, message: '该邮箱今天获取验证码次数已达上限，请明天再试。' };
    }
    if (ipRecord.count >= ipHourlyLimit) {
        return { allowed: false, status: 429, message: '当前网络请求过多，请稍后再试。' };
    }

    return { allowed: true };
}

function recordSend(req, method, contact) {
    const now = Date.now();
    const emailRecord = getWindowRecord(emailSendStore, codeKey(method, contact), dayMs);
    const ipRecord = getWindowRecord(ipSendStore, getClientIp(req), hourMs);

    emailRecord.count += 1;
    emailRecord.lastSentAt = now;
    ipRecord.count += 1;
    ipRecord.lastSentAt = now;
}

function cleanupStores() {
    const now = Date.now();
    for (const [key, value] of codeStore.entries()) {
        if (value.expiresAt <= now) codeStore.delete(key);
    }
    for (const [key, value] of emailSendStore.entries()) {
        if (value.resetAt <= now) emailSendStore.delete(key);
    }
    for (const [key, value] of ipSendStore.entries()) {
        if (value.resetAt <= now) ipSendStore.delete(key);
    }
}

app.get('/api/auth/mail-status', (req, res) => {
    return res.json({
        configured: hasMailConfig(),
        provider: hasTencentSesConfig() ? 'tencent-ses-api' : 'smtp',
        host: hasTencentSesConfig() ? 'ses.tencentcloudapi.com' : (process.env.SMTP_HOST || ''),
        user: hasTencentSesConfig() ? '已填写' : (process.env.SMTP_USER ? '已填写' : ''),
        from: process.env.TENCENT_SES_FROM || process.env.SMTP_FROM || '',
    });
});

app.post('/api/auth/send-code', async (req, res) => {
    const { method, contact } = req.body || {};
    const normalizedContact = normalizeContact(contact);

    if (method !== 'email') {
        return res.status(400).json({ message: '目前真实验证码只支持邮箱，手机号和微信需要接入对应服务商。' });
    }
    if (!normalizedContact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact)) {
        return res.status(400).json({ message: '请输入有效邮箱。' });
    }
    if (!hasMailConfig()) {
        return res.status(503).json({ message: '邮件服务还没有配置，请先填写 .env 里的腾讯云 SES API 或 SMTP 信息。' });
    }

    const limit = assertSendAllowed(req, method, normalizedContact);
    if (!limit.allowed) {
        return res.status(limit.status).json({ message: limit.message });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    codeStore.set(codeKey(method, normalizedContact), {
        code,
        expiresAt: Date.now() + codeTtlMs,
    });

    try {
        await sendVerificationEmail(normalizedContact, code);
        recordSend(req, method, normalizedContact);
        return res.json({ message: '验证码已发送到邮箱。' });
    } catch (error) {
        codeStore.delete(codeKey(method, normalizedContact));
        return res.status(502).json({ message: '验证码发送失败，请检查腾讯云 SES API 或 SMTP 配置。', detail: error.message });
    }
});

app.post('/api/auth/verify-code', (req, res) => {
    const { method, contact, code } = req.body || {};
    const normalizedContact = normalizeContact(contact);
    const stored = codeStore.get(codeKey(method, normalizedContact));

    if (!stored) {
        return res.status(400).json({ message: '请先获取验证码。' });
    }
    if (Date.now() > stored.expiresAt) {
        codeStore.delete(codeKey(method, normalizedContact));
        return res.status(400).json({ message: '验证码已过期，请重新获取。' });
    }
    if (String(code || '').trim() !== stored.code) {
        return res.status(400).json({ message: '验证码不正确。' });
    }

    codeStore.delete(codeKey(method, normalizedContact));
    return res.json({ message: '验证码校验通过。' });
});

app.use(express.static(distDir));

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
    console.log(`Auth API running at http://127.0.0.1:${port}`);
});

setInterval(cleanupStores, 5 * 60 * 1000).unref();
