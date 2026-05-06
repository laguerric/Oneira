import { logger } from '@elizaos/core';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEET_URL = 'https://api.twitter.com/2/tweets';

function getOAuth(): OAuth {
  return new OAuth({
    consumer: {
      key: process.env.TWITTER_API_KEY!,
      secret: process.env.TWITTER_API_SECRET_KEY!,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    },
  });
}

function getToken(): OAuth.Token {
  return {
    key: process.env.TWITTER_ACCESS_TOKEN!,
    secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  };
}

async function oauthFetch(
  url: string,
  method: string,
  body?: URLSearchParams | Buffer | FormData,
  contentType?: string,
): Promise<Response> {
  const oauth = getOAuth();
  const token = getToken();

  // Include form-encoded body params in the OAuth signature (required by Twitter)
  let data: Record<string, string> | undefined;
  if (body instanceof URLSearchParams) {
    data = Object.fromEntries(body.entries());
  }

  const authHeader = oauth.toHeader(oauth.authorize({ url, method, data }, token));

  const headers: Record<string, string> = {
    Authorization: authHeader.Authorization,
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return fetch(url, { method, headers, body: body as any });
}

async function downloadToTemp(videoUrl: string): Promise<string> {
  logger.info('[TwitterPost] Downloading video from fal.ai...');
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const tmpFile = path.join(os.tmpdir(), `dream-${crypto.randomUUID()}.mp4`);
  fs.writeFileSync(tmpFile, buffer);
  logger.info(`[TwitterPost] Downloaded ${buffer.length} bytes to ${tmpFile}`);
  return tmpFile;
}

async function chunkedUpload(filePath: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  // INIT
  logger.info(`[TwitterPost] INIT: file size ${fileSize}`);
  const initParams = new URLSearchParams({
    command: 'INIT',
    total_bytes: String(fileSize),
    media_type: 'video/mp4',
    media_category: 'tweet_video',
  });
  const initRes = await oauthFetch(UPLOAD_URL, 'POST', initParams, 'application/x-www-form-urlencoded');
  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`INIT failed (${initRes.status}): ${text}`);
  }
  const initData = (await initRes.json()) as { media_id_string: string };
  const mediaId = initData.media_id_string;
  logger.info(`[TwitterPost] INIT success, media_id: ${mediaId}`);

  // APPEND
  const fileBuffer = fs.readFileSync(filePath);
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = fileBuffer.subarray(start, end);

    logger.info(`[TwitterPost] APPEND chunk ${i}/${totalChunks - 1} (${chunk.length} bytes)`);

    // For APPEND we need multipart/form-data
    const form = new FormData();
    form.append('command', 'APPEND');
    form.append('media_id', mediaId);
    form.append('segment_index', String(i));
    form.append('media_data', Buffer.from(chunk).toString('base64'));

    // OAuth sign the URL only (no body params in signature for multipart)
    const oauth = getOAuth();
    const token = getToken();
    const authHeader = oauth.toHeader(oauth.authorize({ url: UPLOAD_URL, method: 'POST' }, token));

    const appendRes = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: authHeader.Authorization },
      body: form,
    });

    if (!appendRes.ok && appendRes.status !== 204) {
      const text = await appendRes.text();
      throw new Error(`APPEND chunk ${i} failed (${appendRes.status}): ${text}`);
    }
  }

  // FINALIZE
  logger.info('[TwitterPost] FINALIZE');
  const finalizeParams = new URLSearchParams({
    command: 'FINALIZE',
    media_id: mediaId,
  });
  const finalizeRes = await oauthFetch(UPLOAD_URL, 'POST', finalizeParams, 'application/x-www-form-urlencoded');
  if (!finalizeRes.ok) {
    const text = await finalizeRes.text();
    throw new Error(`FINALIZE failed (${finalizeRes.status}): ${text}`);
  }

  const finalizeData = (await finalizeRes.json()) as {
    media_id_string: string;
    processing_info?: { state: string; check_after_secs?: number; error?: { message: string } };
  };

  // STATUS polling for async video processing
  if (finalizeData.processing_info) {
    await pollStatus(mediaId, finalizeData.processing_info);
  }

  logger.info(`[TwitterPost] Upload complete, media_id: ${mediaId}`);
  return mediaId;
}

async function pollStatus(
  mediaId: string,
  initialInfo: { state: string; check_after_secs?: number; error?: { message: string } },
): Promise<void> {
  let info = initialInfo;

  while (info.state !== 'succeeded') {
    if (info.state === 'failed') {
      throw new Error(`Video processing failed: ${info.error?.message ?? 'unknown error'}`);
    }

    const waitSecs = info.check_after_secs ?? 5;
    logger.info(`[TwitterPost] STATUS: ${info.state}, checking again in ${waitSecs}s`);
    await new Promise((r) => setTimeout(r, waitSecs * 1000));

    const statusUrl = `${UPLOAD_URL}?command=STATUS&media_id=${mediaId}`;
    const statusRes = await oauthFetch(statusUrl, 'GET');
    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`STATUS check failed (${statusRes.status}): ${text}`);
    }

    const statusData = (await statusRes.json()) as {
      processing_info?: { state: string; check_after_secs?: number; error?: { message: string } };
    };
    if (!statusData.processing_info) {
      // No processing_info means it's done
      return;
    }
    info = statusData.processing_info;
  }
}

async function postTweet(mediaId: string): Promise<string> {
  logger.info('[TwitterPost] Posting tweet with video...');

  const oauth = getOAuth();
  const token = getToken();
  const authHeader = oauth.toHeader(oauth.authorize({ url: TWEET_URL, method: 'POST' }, token));

  const body = JSON.stringify({
    media: { media_ids: [mediaId] },
  });

  const res = await fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader.Authorization,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tweet failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const tweetId = data.data?.id ?? 'unknown';
  logger.info(`[TwitterPost] Tweet posted: https://twitter.com/i/status/${tweetId}`);
  return tweetId;
}

/**
 * Downloads a video from a URL and posts it to Twitter.
 * Respects TWITTER_DRY_RUN env var.
 */
export async function postDreamToTwitter(videoUrl: string): Promise<string | null> {
  // Check credentials
  const required = ['TWITTER_API_KEY', 'TWITTER_API_SECRET_KEY', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'];
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    logger.warn(`[TwitterPost] Missing env vars: ${missing.join(', ')}. Skipping Twitter post.`);
    return null;
  }

  // Dry run check
  if (process.env.TWITTER_DRY_RUN === 'true') {
    logger.info(`[TwitterPost] DRY RUN — would post video: ${videoUrl}`);
    return null;
  }

  let tmpFile: string | null = null;
  try {
    tmpFile = await downloadToTemp(videoUrl);
    const mediaId = await chunkedUpload(tmpFile);
    const tweetId = await postTweet(mediaId);
    return tweetId;
  } catch (error) {
    logger.error({ error }, '[TwitterPost] Failed to post dream to Twitter');
    throw error;
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
      logger.info('[TwitterPost] Cleaned up temp file');
    }
  }
}
