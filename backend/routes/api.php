<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LeaveTypeController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CalendarViewController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\LeaveBalanceController;
use App\Http\Controllers\WorkScheduleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfileEducationController;
use App\Http\Controllers\ProfileFunctionalController;
use App\Http\Controllers\ProfileTeachingAssignmentController;
use App\Http\Controllers\RolePermissionController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard/hrd/stats', [DashboardController::class, 'hrdStats'])->middleware('role:HRD');
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);

    Route::get('employees', [EmployeeController::class, 'index']);
    Route::get('employees/{employee}', [EmployeeController::class, 'show']);

    Route::middleware('role:HRD')->group(function () {
        Route::post('employees', [EmployeeController::class, 'store']);
        Route::put('employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('employees/{employee}', [EmployeeController::class, 'destroy']);
        Route::put('employees/{employee}/account', [EmployeeController::class, 'updateAccount']);
        Route::delete('employees/{employee}/account', [EmployeeController::class, 'destroyAccount']);
        Route::get('roles', function () {
            return response()->json(['success' => true, 'data' => \App\Models\Role::all()]);
        });
        Route::get('role-permissions', [RolePermissionController::class, 'index']);
        Route::put('role-permissions', [RolePermissionController::class, 'updateAll']);
        Route::post('holidays', [CalendarController::class, 'store']);
        Route::put('holidays/{holiday}', [CalendarController::class, 'update']);
        Route::delete('holidays/{holiday}', [CalendarController::class, 'destroy']);
        Route::patch('holidays/{holiday}/toggle', [CalendarController::class, 'toggle']);
        Route::post('work-schedules', [WorkScheduleController::class, 'store']);
        Route::post('work-schedules/bulk', [WorkScheduleController::class, 'storeBulk']);
        Route::put('work-schedules/{workSchedule}', [WorkScheduleController::class, 'update']);
        Route::patch('work-schedules/{workSchedule}/toggle', [WorkScheduleController::class, 'toggle']);
        Route::delete('work-schedules/{workSchedule}', [WorkScheduleController::class, 'destroy']);
        Route::post('leave-balances/adjust', [LeaveBalanceController::class, 'adjust']);
        Route::post('leave-balances/accrue', [LeaveBalanceController::class, 'accrue']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::post('leave-attachments/{attachment}/verify', [LeaveController::class, 'verifyAttachment']);
        Route::put('leaves/{leave}', [LeaveController::class, 'update']);
    });

    Route::middleware('role:HRD,DIREKTUR,PD_I,PD_II,PD_III')->group(function () {
        Route::get('reports/employees/export', [ReportController::class, 'exportEmployees']);
        Route::get('reports/leaves/export', [ReportController::class, 'exportLeaves']);
        Route::get('reports/employees/excel', [ReportController::class, 'exportEmployeesExcel']);
        Route::get('reports/leaves/excel', [ReportController::class, 'exportLeavesExcel']);
        Route::get('reports/employees/pdf', [ReportController::class, 'exportEmployeesPdf']);
        Route::get('reports/leaves/pdf', [ReportController::class, 'exportLeavesPdf']);
    });

    Route::get('documents', [DocumentController::class, 'index']);
    Route::post('documents', [DocumentController::class, 'store']);
    Route::get('documents/{document}', [DocumentController::class, 'show']);
    Route::get('documents/{document}/download', [DocumentController::class, 'download']);
    Route::delete('documents/{document}', [DocumentController::class, 'destroy']);

    Route::get('leaves', [LeaveController::class, 'index']);
    Route::post('leaves', [LeaveController::class, 'store']);
    Route::get('leaves/{leave}', [LeaveController::class, 'show']);
    Route::post('leaves/{leave}/cancel', [LeaveController::class, 'cancel']);
    Route::middleware('role:KABAG,HRD')->group(function () {
        Route::post('leaves/{leave}/approve', [LeaveController::class, 'approve']);
        Route::post('leaves/{leave}/reject', [LeaveController::class, 'reject']);
    });
    Route::get('leave-types', [LeaveTypeController::class, 'index']);
    Route::get('holidays', [CalendarController::class, 'index']);
    Route::get('calendar-view', [CalendarViewController::class, 'index']);
    Route::get('work-schedules', [WorkScheduleController::class, 'index']);
    Route::get('leave-balances/employee/{employeeId}', [LeaveBalanceController::class, 'byEmployee']);
    Route::get('positions', function () {
        return response()->json(['success' => true, 'data' => \App\Models\Position::where('is_active', true)->get()]);
    });
    Route::get('organizational-units', function () {
        return response()->json(['success' => true, 'data' => \App\Models\OrganizationalUnit::where('is_active', true)->get()]);
    });
    Route::get('leave-attachments/{attachment}/download', [LeaveController::class, 'downloadAttachment']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::get('reports/biodata-pdf/{id}', [ReportController::class, 'exportBiodataPdf']);
    Route::get('reports/biodata-word/{id}', [ReportController::class, 'exportBiodataWord']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::get('/profile/education', [ProfileEducationController::class, 'show']);
    Route::put('/profile/education', [ProfileEducationController::class, 'update']);
    Route::get('/profile/functional', [ProfileFunctionalController::class, 'show']);
    Route::put('/profile/functional', [ProfileFunctionalController::class, 'update']);
    Route::get('/profile/teaching-assignments', [ProfileTeachingAssignmentController::class, 'index']);
    Route::post('/profile/teaching-assignments', [ProfileTeachingAssignmentController::class, 'store']);
    Route::put('/profile/teaching-assignments/{teachingAssignment}', [ProfileTeachingAssignmentController::class, 'update']);
    Route::delete('/profile/teaching-assignments/{teachingAssignment}', [ProfileTeachingAssignmentController::class, 'destroy']);
});
