import { useAuthStore } from '@/stores/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeaveCategoryTab from '@/features/leave/components/LeaveCategoryTab';
import LeaveBalanceSummaryTab from '@/features/leave/components/LeaveBalanceSummaryTab';

// Halaman "Cuti & Izin" ber-tab: Cuti dan Izin.
// Isi tiap tab HANYA pengajuan yang sudah tuntas (disetujui final HRD);
// data yang masih diproses hanya tampil di halaman Approval.
// Role DOSEN tidak punya fitur Cuti — tab "Cuti" disembunyikan.
export default function LeaveListPage() {
    const { hasRole } = useAuthStore();
    const isDosen = hasRole('DOSEN');
    // Ringkasan saldo hanya untuk HRD & pimpinan. KABAG/DOSEN/PEGAWAI TIDAK boleh melihat tab ini.
    const canSeeBalanceSummary = ['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'].some((r) => hasRole(r));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Cuti &amp; Izin</h1>
                <p className="text-muted-foreground">Riwayat pengajuan cuti dan izin yang sudah disetujui</p>
            </div>

            <Tabs defaultValue={isDosen ? 'izin' : 'cuti'}>
                <TabsList>
                    {!isDosen && <TabsTrigger value="cuti">Cuti</TabsTrigger>}
                    <TabsTrigger value="izin">Izin</TabsTrigger>
                    {canSeeBalanceSummary && (
                        <TabsTrigger value="saldo">Ringkasan Saldo Cuti Pegawai</TabsTrigger>
                    )}
                </TabsList>

                {!isDosen && (
                    <TabsContent value="cuti">
                        <LeaveCategoryTab category="cuti" />
                    </TabsContent>
                )}
                <TabsContent value="izin">
                    <LeaveCategoryTab category="izin" />
                </TabsContent>
                {canSeeBalanceSummary && (
                    <TabsContent value="saldo">
                        <LeaveBalanceSummaryTab />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
