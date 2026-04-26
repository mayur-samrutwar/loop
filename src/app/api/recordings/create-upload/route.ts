import { auth } from '@/auth';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';

const MAX_UPLOAD_MB = Number(process.env.R2_MAX_UPLOAD_MB ?? 2048);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function sanitizePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extensionFor(contentType: string) {
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('quicktime')) return 'mov';
  return 'webm';
}

export async function POST(request: Request) {
  const session = await auth();
  const canPreviewLocally = process.env.NODE_ENV === 'development';

  if (!session?.user && !canPreviewLocally) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      fileName?: string;
      contentType?: string;
      size?: number;
      task?: string;
    };

    const contentType = body.contentType;
    const size = body.size;
    const task = body.task;

    if (!contentType?.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only video uploads are allowed' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(size) || !size || size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Video must be under ${MAX_UPLOAD_MB}MB` },
        { status: 400 },
      );
    }

    const accountId = env('R2_ACCOUNT_ID');
    const bucket = env('R2_BUCKET_NAME');
    const prefix = process.env.R2_UPLOAD_PREFIX ?? 'recordings';
    const safeTask = sanitizePart(task ?? 'capture') || 'capture';
    const userId = sanitizePart(session?.user?.id ?? 'local-preview') || 'local-preview';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomUUID();
    const extension = extensionFor(contentType);
    const key = `${prefix}/${safeTask}/${userId}/${timestamp}-${random}.${extension}`;

    const client = new S3Client({
      region: 'auto',
      endpoint:
        process.env.R2_ENDPOINT ??
        `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');

    return NextResponse.json({
      key,
      uploadUrl,
      publicUrl: publicBaseUrl ? `${publicBaseUrl}/${key}` : null,
    });
  } catch (error) {
    console.error('Failed to create R2 upload URL', error);
    return NextResponse.json(
      { error: 'Could not create upload URL' },
      { status: 500 },
    );
  }
}
