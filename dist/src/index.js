import { renderHelpText } from './interfaces/telegram_commands';
async function handleRoot() {
    return new Response(JSON.stringify({ status: 'ok', system: 'alipay-otc-os-v3' }), {
        headers: { 'content-type': 'application/json' }
    });
}
async function handleHealth(env) {
    const result = await env.DB.prepare('SELECT 1 as ok').first();
    return new Response(JSON.stringify({ db: result?.ok === 1 ? 'ok' : 'unknown', worker: 'ok' }), {
        headers: { 'content-type': 'application/json' }
    });
}
async function handleTelegramWebhook(request, env) {
    const secret = request.headers.get('x-telegram-webhook-secret-token');
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
    }
    return new Response(renderHelpText());
}
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/')
            return handleRoot();
        if (url.pathname === '/health')
            return handleHealth(env);
        if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
            return handleTelegramWebhook(request, env);
        }
        return new Response('not found', { status: 404 });
    }
};
