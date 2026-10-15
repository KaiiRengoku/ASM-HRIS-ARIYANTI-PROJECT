<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Memperketat foreign key cuti/saldo/dokumen.
 *
 * Sebelumnya semua FK memakai onDelete('cascade'), sehingga menghapus satu
 * pegawai / jenis cuti menghapus permanen seluruh pengajuan, approval, dan
 * mutasi saldo miliknya — catatan yang wajib disimpan HRIS.
 *
 * Aturan baru:
 * - restrictOnDelete untuk baris yang tak boleh hilang (pengajuan, saldo, mutasi,
 *   dokumen, lampiran). Penghapusan pegawai/jenis cuti ditolak selama masih
 *   dipakai, bukan menghapus riwayat.
 * - approver_id (users) menjadi nullOnDelete: riwayat approval tetap ada walau
 *   akun penyetuju dihapus, karena nama penyetuju sudah tercatat di arsip.
 *
 * Migrasi ini additive: migrasi lama tidak disentuh.
 */
return new class extends Migration
{
    private const RESTRICT = [
        ['leave_requests', 'employee_id', 'employees'],
        ['leave_requests', 'leave_type_id', 'leave_types'],
        ['leave_balances', 'employee_id', 'employees'],
        ['leave_balances', 'leave_type_id', 'leave_types'],
        ['leave_balance_transactions', 'leave_balance_id', 'leave_balances'],
        ['leave_balance_transactions', 'employee_id', 'employees'],
        ['employee_documents', 'employee_id', 'employees'],
    ];

    public function up(): void
    {
        foreach (self::RESTRICT as [$table, $column, $references]) {
            Schema::table($table, function (Blueprint $blueprint) use ($column, $references) {
                $blueprint->dropForeign([$column]);
                $blueprint->foreign($column)->references('id')->on($references)->restrictOnDelete();
            });
        }

        Schema::table('leave_approvals', function (Blueprint $table) {
            $table->dropForeign(['approver_id']);
            // SET NULL butuh kolom nullable; kolom asal NOT NULL. Longgarkan dulu.
            $table->unsignedBigInteger('approver_id')->nullable()->change();
            $table->foreign('approver_id')->references('id')->on('users')->nullOnDelete();
        });

        // Jaring pengaman DB: satu pengajuan hanya boleh punya satu approval per tingkat.
        Schema::table('leave_approvals', function (Blueprint $table) {
            $table->unique(['leave_request_id', 'approval_level']);
        });
    }

    public function down(): void
    {
        Schema::table('leave_approvals', function (Blueprint $table) {
            $table->dropUnique(['leave_request_id', 'approval_level']);
            $table->dropForeign(['approver_id']);
            $table->foreign('approver_id')->references('id')->on('users')->onDelete('cascade');
        });

        foreach (self::RESTRICT as [$table, $column, $references]) {
            Schema::table($table, function (Blueprint $blueprint) use ($column, $references) {
                $blueprint->dropForeign([$column]);
                $blueprint->foreign($column)->references('id')->on($references)->onDelete('cascade');
            });
        }
    }
};
