<?php

namespace App\Http\Controllers;

use App\Models\LeaveType;
use Illuminate\Http\Request;

class LeaveTypeController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => LeaveType::all()]);
    }
}