-- Move the cover-image limits from the client into the bucket.
--
-- src/services/posts.ts checks type and size before uploading, but that check
-- is advisory: it lives in the browser and is bypassable by calling the
-- storage API directly. These columns are enforced by Storage itself, so an
-- oversized or non-image upload is rejected regardless of what the client did.
--
-- 5242880 bytes = 5MB, matching MAX_COVER_BYTES in src/services/posts.ts.
-- Keep the two in sync: the client value exists only to give a better error
-- message than a raw 413.
--
-- image/svg+xml is deliberately excluded. An SVG is a document that can carry
-- <script>, so an uploaded one is stored XSS against anyone who opens it
-- directly. Cover images only ever need raster formats, so allowing SVG would
-- add risk for no feature.

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
where id = 'post-covers';
