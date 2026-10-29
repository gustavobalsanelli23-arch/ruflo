/**
 * Import limits. The database enforces its own copies (file size in
 * create_import and in the Storage bucket, 2.000 rows per staged batch).
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_ROWS = 200_000;
export const MAX_COLUMNS = 100;
/** Rows per Server Action call; the database accepts up to 2.000. */
export const UPLOAD_BATCH_ROWS = 1000;
export const MAX_BATCHES = Math.ceil(MAX_ROWS / UPLOAD_BATCH_ROWS);
