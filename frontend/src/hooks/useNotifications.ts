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
            toast({
                title: e.title || 'Notifikasi',
                description: e.message || '',
            });
        });

        return () => {
            channel.stopListening('NotificationSent');
        };
    }, [isAuthenticated, user, token]);

    useEffect(() => {
        if (!isAuthenticated || !token) disconnectEcho();
    }, [isAuthenticated, token]);
}