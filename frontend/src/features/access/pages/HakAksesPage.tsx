import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { getUser } from '@/features/auth/services/authService';
import {
    getAccess,
    saveAccess,
    permissionGroups,
    type PermissionRow,
    type RoleAccessRow,
} from '../services/accessService';

const ROLE_MANAGE_CODE = 'auth.role.manage';

export default function HakAksesPage() {
    const queryClient = useQueryClient();
    const { hasRole, token, setAuth } = useAuthStore();

    const { data, isLoading, error } = useQuery({
        queryKey: ['role-permissions'],
        queryFn: getAccess,
    });

    const [checked, setChecked] = useState<Record<number, number[]> | null>(null);

    const draft = checked ?? {};
    const currentIds = (role: RoleAccessRow) => draft[role.id] ?? role.permission_ids;

    const toggle = (role: RoleAccessRow, permissionId: number, value: boolean) => {
        const set = new Set(currentIds(role));
        if (value) set.add(permissionId);
        else set.delete(permissionId);
        setChecked({ ...draft, [role.id]: Array.from(set) });
    };

    const saveMutation = useMutation({
        mutationFn: (role: RoleAccessRow) =>
            saveAccess([{ id: role.id, permissions: currentIds(role) }]),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
            toast({ title: 'Berhasil', description: 'Hak akses tersimpan. Anggota role yang berubah otomatis logout.' });
            try {
                const res = await getUser();
                if (res.success && token) setAuth(res.data.user, token);
            } catch { /* token sendiri mungkin tetap valid */ }
            setChecked(null);
        },
        onError: (e: any) => toast({
            title: 'Gagal',
            description: e.response?.data?.message || 'Terjadi kesalahan.',
            variant: 'destructive',
        }),
    });

    if (isLoading) return <div className="p-6">Memuat hak akses...</div>;
    if (error || !data) return <div className="p-6 text-destructive">Gagal memuat hak akses.</div>;

    const permissions = data.permissions;
    const grouped = permissionGroups.map((group) => ({
        label: group.label,
        items: permissions.filter((p) => p.code.startsWith(group.prefix)),
    })).filter((g) => g.items.length > 0);

    const isSelfRole = (role: RoleAccessRow) => hasRole(role.code);

    const renderPermission = (role: RoleAccessRow, permission: PermissionRow) => {
        const checkedNow = currentIds(role).includes(permission.id);
        const locked = isSelfRole(role) && permission.code === ROLE_MANAGE_CODE;
        return (
            <label key={permission.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                    checked={checkedNow}
                    disabled={locked || saveMutation.isPending}
                    onCheckedChange={(value) => toggle(role, permission.id, value === true)}
                />
                <span className="leading-tight">
                    {permission.description || permission.name}
                </span>
            </label>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Hak Akses</h1>
                <p className="text-muted-foreground">
                    Kelola permission setiap role. Perubahan berlaku setelah disimpan.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {data.roles.map((role) => (
                    <Card key={role.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-lg">{role.name}</CardTitle>
                            <Button
                                size="sm"
                                onClick={() => saveMutation.mutate(role)}
                                disabled={saveMutation.isPending || !checked?.[role.id]}
                            >
                                Simpan
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {grouped.map((group) => (
                                <div key={group.label}>
                                    <Label className="text-xs uppercase text-muted-foreground">
                                        {group.label}
                                    </Label>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        {group.items.map((permission) => renderPermission(role, permission))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}