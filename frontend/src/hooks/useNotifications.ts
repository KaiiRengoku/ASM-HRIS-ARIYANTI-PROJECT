import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ensureEcho, disconnectEcho } from '@/lib/echo';
import { toast } from '@/components/ui/use-toast';

export function useNotifications() {
    const { user, token, isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated || !user || !token) return;

        const echo = ensureEcho(token);
        if (!echo) return;

        const channel = echo.private(`notifications.${user.id}`);

        channel.listen('NotificationSent', (payload: unknown) => {
            const data = (payload ?? {}) as { title?: string; message?: string };
            const title = data.title || 'Notifikasi';
            const body = data.message || '';
            toast({ title, description: body });
            queryClient.invalidateQueries({ queryKey: ['notifications-latest'] });
        });

        return () => {
            channel.stopListening('NotificationSent');
        };
    }, [isAuthenticated, user, token, queryClient]);

    useEffect(() => {
        if (!isAuthenticated || !token) disconnectEcho();
    }, [isAuthenticated, token]);
}