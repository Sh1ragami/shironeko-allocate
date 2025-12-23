<?php
// Health endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'time' => now()->toIso8601String(),
    ]);
});
// Me endpoint (requires token)
Route::middleware('token.auth')->get('/me', function () {
    /** @var \App\Models\User $user */
    $user = request()->user();
    return response()->json([
        'id' => $user->user_id ?? $user->id,
        'github_id' => $user->github_id ?? null,
        'name' => $user->display_name ?? $user->name ?? null,
        'email' => $user->email ?? null,
    ]);
});

// GitHub proxy endpoints (use server to call GitHub)
Route::middleware('token.auth')->group(function () {
    Route::get('/github/profile', [\App\Http\Controllers\Api\GitHubProxyController::class, 'profile']);
    Route::get('/github/repos', [\App\Http\Controllers\Api\GitHubProxyController::class, 'repos']);
    Route::get('/github/repo', [\App\Http\Controllers\Api\GitHubProxyController::class, 'repo']);
    Route::get('/github/contributors', [\App\Http\Controllers\Api\GitHubProxyController::class, 'contributors']);
    Route::get('/github/collaborators', [\App\Http\Controllers\Api\GitHubProxyController::class, 'collaborators']);
    Route::get('/github/readme', [\App\Http\Controllers\Api\GitHubProxyController::class, 'readme']);
    Route::get('/github/search/users', [\App\Http\Controllers\Api\GitHubProxyController::class, 'searchUsers']);
    Route::get('/github/commits', [\App\Http\Controllers\Api\GitHubProxyController::class, 'commits']);

    // Link unfurl (OpenGraph/Twitter Card)
    Route::get('/unfurl', [\App\Http\Controllers\Api\UnfurlController::class, 'unfurl']);

    // Projects
    Route::post('/projects', [\App\Http\Controllers\Api\ProjectController::class, 'store']);
    Route::get('/projects', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
    Route::get('/projects/{id}', [\App\Http\Controllers\Api\ProjectController::class, 'show']);
    Route::patch('/projects/{id}', [\App\Http\Controllers\Api\ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy']);
    Route::get('/projects/{id}/collaborators', [\App\Http\Controllers\Api\ProjectController::class, 'collaborators']);
    Route::post('/projects/{id}/collaborators', [\App\Http\Controllers\Api\ProjectController::class, 'inviteCollaborator']);
    Route::delete('/projects/{id}/collaborators/{login}', [\App\Http\Controllers\Api\ProjectController::class, 'deleteCollaborator']);

    // GitHub Issues linkage
    Route::post('/projects/{id}/issues', [\App\Http\Controllers\Api\ProjectController::class, 'createIssue']);
    Route::get('/projects/{id}/issues', [\App\Http\Controllers\Api\ProjectController::class, 'listIssues']);
    Route::patch('/projects/{id}/issues/{number}', [\App\Http\Controllers\Api\ProjectController::class, 'updateIssue']);
    Route::post('/projects/{id}/issues/{number}/comments', [\App\Http\Controllers\Api\ProjectController::class, 'commentIssue']);
    Route::post('/projects/{id}/issues/assign-next', [\App\Http\Controllers\Api\ProjectController::class, 'assignNext']);

    // Auth
    Route::post('/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
});
