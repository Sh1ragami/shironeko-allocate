<?php

use App\Http\Controllers\Auth\GitHubController;
use Illuminate\Support\Facades\Route;

// These routes need session, so use web middleware.
Route::prefix('api')->group(function () {
    Route::get('/auth/github', [GitHubController::class, 'redirect']);
    Route::get('/auth/github/callback', [GitHubController::class, 'callback']);
});

