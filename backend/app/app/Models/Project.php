<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'visibility',
        'start_date',
        'end_date',
        'skills',
        'link_repo',
        'github_meta',
    ];

    protected $casts = [
        'skills' => 'array',
        'github_meta' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
    ];
}

