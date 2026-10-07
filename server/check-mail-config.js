import dotenv from 'dotenv';
import { createRequire } from 'node:module';
import nodemailer from 'nodemailer';

dotenv.config();

const require = createRequire(import.meta.url);
const tencentcloud = require('tencentcloud-sdk-nodejs');
const SesClient = tencentcloud.ses.v20201002.Client;

function hasTencentSesConfig() {
    return ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_SES_FROM'].every(key => String(process.env[key] || '').trim());
}

function hasSmtpConfig() {
    return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].every(key => String(process.env[key] || '').trim());
}

if (hasTencentSesConfig()) {
    const client = new SesClient({
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

    try {
        await client.ListEmailAddress();
        console.log('Tencent SES API config verified.');
    } catch (error) {
        console.error('Tencent SES API config verification failed.');
        console.error(error.message);
        process.exit(1);
    }
} else if (hasSmtpConfig()) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log('SMTP mail config verified.');
    } catch (error) {
        console.error('SMTP mail config verification failed.');
        console.error(error.message);
        process.exit(1);
    }
} else {
    console.error('Missing mail config: fill Tencent SES API fields or SMTP fields in .env.');
    process.exit(1);
}
