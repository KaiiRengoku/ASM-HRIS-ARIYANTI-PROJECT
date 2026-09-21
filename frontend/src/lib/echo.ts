import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: any;
    }
}

window.Pusher = Pusher;

let echo: Echo<'reverb'> | null = null;
let currentToken: string | null = null;

export function ensureEcho(token: string | null) {
    if (echo && currentToken === token) return echo;
    if (echo) {
        echo.disconnect();
        echo = null;
    }
    currentToken = token;
    if (!token) return null;
    echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY || 'asm-hris-key',
        wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
        wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
        wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/api/broadcasting/auth',
        bearerToken: token,
    });
    return echo;
}

export function disconnectEcho() {
    echo?.disconnect();
    echo = null;
    currentToken = null;
}
