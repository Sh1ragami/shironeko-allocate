<?php
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
