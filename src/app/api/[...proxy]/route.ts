import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL;
const FACE_RECOG_URL = process.env.FACE_RECOG_URL;
const DEFAULT_PROXY_TIMEOUT_MS = Number(process.env.API_PROXY_TIMEOUT_MS || 30000);
const AUTH_PROXY_TIMEOUT_MS = Number(process.env.AUTH_PROXY_TIMEOUT_MS || 10000);

async function proxyHandler(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname.replace('/api', '');

  const faceRecogRoutes = ['/analyze_image', '/add_face', '/recognize_faces', '/analyze_image_stream'];

  let targetApiBaseUrl;

  if (faceRecogRoutes.some(route => path.startsWith(route))) {
    targetApiBaseUrl = FACE_RECOG_URL;
  } else {
    targetApiBaseUrl = FLASK_API_URL;
  }

  if (!targetApiBaseUrl) {
    return NextResponse.json({ error: 'Target API URL is not configured on the server.' }, { status: 500 });
  }

  const finalPath = path.startsWith('/cache/') ? path : `/api${path}`;

  const targetUrl = `${targetApiBaseUrl}${finalPath}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);

  headers.set('X-App-Source', 'smart-edms');

  const timeoutMs = path.startsWith('/auth/') ? AUTH_PROXY_TIMEOUT_MS : DEFAULT_PROXY_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      cache: 'no-store',
      signal: controller.signal,
      // @ts-ignore
      duplex: 'half',
    });

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    let responseBody = response.body;

    if (isJson && !response.ok) {
      const json = await response.json();

      if (json.detail && !json.error) {
        const errorMsg = typeof json.detail === 'string'
          ? json.detail
          : Array.isArray(json.detail)
            ? json.detail.map((e: any) => e.msg).join(", ")
            : JSON.stringify(json.detail);
        json.error = errorMsg;
      }
      responseBody = JSON.stringify(json) as any;
    }

    const newHeaders = new Headers(response.headers);
    newHeaders.delete('content-length');
    newHeaders.delete('content-encoding');

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: `Backend request timed out after ${timeoutMs}ms.` },
        { status: 504 },
      );
    }
    return NextResponse.json({ error: 'Error forwarding request to the backend.' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  return proxyHandler(req);
}

export async function POST(req: NextRequest) {
  return proxyHandler(req);
}

export async function PUT(req: NextRequest) {
  return proxyHandler(req);
}

export async function DELETE(req: NextRequest) {
  return proxyHandler(req);
}
