SELECT 
    id,
    title,
    file_url,
    file_size,
    LENGTH(file_url) as url_length
FROM audio_tracks
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 3;
