import {
  parseDriveSyncDocument,
  type DriveSyncDocument,
} from '../shared/google-drive-sync';

export const DRIVE_SYNC_FILE_NAME = 'diaochang-library-v1.json';

const DRIVE_API_ROOT = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_ROOT = 'https://www.googleapis.com/upload/drive/v3';

export interface StoredDriveSyncFile {
  fileId: string;
  document: DriveSyncDocument;
}

export async function readDriveSyncFile(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<StoredDriveSyncFile | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_SYNC_FILE_NAME}' and trashed=false`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: '1',
  });
  const lookup = await fetcher(`${DRIVE_API_ROOT}/files?${params}`, {
    headers: authorizationHeaders(token),
  });
  await assertDriveResponse(lookup);
  const listing = await lookup.json() as { files?: Array<{ id?: string }> };
  const fileId = listing.files?.[0]?.id;
  if (!fileId) return null;

  const download = await fetcher(
    `${DRIVE_API_ROOT}/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: authorizationHeaders(token) },
  );
  await assertDriveResponse(download);
  const document = parseDriveSyncDocument(await download.text());
  if (!document) {
    throw new Error('Google Drive 中的 Karaoke Kaiju 同步資料已損毀或版本不相容');
  }
  return { fileId, document };
}

export async function writeDriveSyncFile(
  token: string,
  fileId: string | null,
  document: DriveSyncDocument,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  let resolvedFileId = fileId;
  if (!resolvedFileId) {
    const create = await fetcher(`${DRIVE_API_ROOT}/files?fields=id`, {
      method: 'POST',
      headers: {
        ...authorizationHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DRIVE_SYNC_FILE_NAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      }),
    });
    await assertDriveResponse(create);
    const metadata = await create.json() as { id?: string };
    if (!metadata.id) throw new Error('Google Drive 沒有回傳同步檔案 ID');
    resolvedFileId = metadata.id;
  }

  const upload = await fetcher(
    `${DRIVE_UPLOAD_ROOT}/files/${encodeURIComponent(resolvedFileId)}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        ...authorizationHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    },
  );
  await assertDriveResponse(upload);
  return resolvedFileId;
}

export async function deleteDriveSyncFile(
  token: string,
  fileId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(
    `${DRIVE_API_ROOT}/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: authorizationHeaders(token),
    },
  );
  await assertDriveResponse(response);
}

function authorizationHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function assertDriveResponse(response: Response): Promise<void> {
  if (response.ok) return;
  let message = `Google Drive API 發生錯誤（HTTP ${response.status}）`;
  try {
    const payload = await response.json() as { error?: { message?: string } };
    if (payload.error?.message) message = payload.error.message;
  } catch {
    // Preserve the status-based error when Google does not return JSON.
  }
  throw new Error(message);
}
