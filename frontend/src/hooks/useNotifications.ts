import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ensureEcho, disconnectEcho } from '@/lib/echo';
import { toast } from '@/components/ui/use-toast';

export function useNotifications() {
    const { user, token, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated || !user || !token) return;

        const echo = ensureEcho(token);
        if (!echo) return;

        const channel = echo.private(`notifications.${user.id}`);

        channel.listen('NotificationSent', (e: any) => {
            const title = e.title || 'Notifikasi';
            const body = e.message || '';
            toast({ title, description: body });
            // Browser notification (kebutuhan §2.1) bila izin sudah diberikan.
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
            }
        });

        return () => {
            channel.stopListening('NotificationSent');
        };
    }, [isAuthenticated, user, token]);

    useEffect(() => {
        if (!isAuthenticated || !token) disconnectEcho();
    }, [isAuthenticated, token]);
}