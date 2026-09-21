<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\EmployeeDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    private function isHrd(Request $request): bool
    {
        return $request->user()->roles()->where('code', 'HRD')->exists();
    }

    private function canAccess(Request $request, int $employeeId): bool
    {
        return $this->isHrd($request) || $employeeId === (int) $request->user()->employee_id;
    }

    public function index(Request $request)
    {
        $query = EmployeeDocument::with('employee');

        if (!$this->isHrd($request)) {
            $query->where('employee_id', $request->user()->employee_id);
        } elseif ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->search) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('nama_lengkap', 'LIKE', "%{$request->search}%")
                  ->orWhere('nik', 'LIKE', "%{$request->search}%");
            });
        }

        $documents = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $documents->items(),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'document_type' => ['required', Rule::in(['KTP', 'Ijazah', 'Sertifikat', 'Surat Tugas', 'KK', 'NPWP', 'SK Pengangkatan'])],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
        ]);

        if (!$this->canAccess($request, (int) $request->employee_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $file = $request->file('file');
        $path = $file->store('documents/' . $request->employee_id, 'public');

        $doc = EmployeeDocument::create([
            'employee_id' => $request->employee_id,
            'document_type' => $request->document_type,
            'file_name' => $file->getClientOriginalName(),
            'storage_disk' => 'public',
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPLOAD_DOCUMENT',
            'auditable_type' => EmployeeDocument::class,
            'auditable_id' => $doc->id,
            'new_values' => ['employee_id' => $doc->employee_id, 'document_type' => $doc->document_type, 'file_name' => $doc->file_name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'data' => $doc]);
    }

    public function show(Request $request, EmployeeDocument $document)
    {
        if (!$this->canAccess($request, $document->employee_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        return response()->json(['success' => true, 'data' => $document->load('employee')]);
    }

    public function download(Request $request, EmployeeDocument $document)
    {
        if (!$this->canAccess($request, $document->employee_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        if (!Storage::disk($document->storage_disk)->exists($document->storage_path)) {
            return response()->json(['success' => false, 'message' => 'File tidak ditemukan.'], 404);
        }

        return Storage::disk($document->storage_disk)->download($document->storage_path, $document->file_name);
    }

    public function destroy(Request $request, EmployeeDocument $document)
    {
        if (!$this->canAccess($request, $document->employee_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        if (Storage::disk($document->storage_disk)->exists($document->storage_path)) {
            Storage::disk($document->storage_disk)->delete($document->storage_path);
        }

        $deleted = $document->only(['employee_id', 'document_type', 'file_name']);
        $docId = $document->id;
        $document->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DELETE_DOCUMENT',
            'auditable_type' => EmployeeDocument::class,
            'auditable_id' => $docId,
            'old_values' => $deleted,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Dokumen dihapus.']);
    }
}