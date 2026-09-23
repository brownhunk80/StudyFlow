import { inspectUploadedDocument } from '../../../../api/debug/inspect-document';

/**
 * Next.js App Router POST Route: /api/debug/inspect-document
 * 
 * Diagnostic endpoint for inspecting uploaded document payloads before full milestone extraction.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await inspectUploadedDocument(body);
    return Response.json(result);
  } catch (error: any) {
    console.error('[Debug /api/debug/inspect-document] Diagnostic failed:', error);
    return Response.json(
      {
        error: 'DIAGNOSTIC_FAILURE',
        message: error?.message || 'Failed to inspect document payload.',
      },
      { status: 500 }
    );
  }
}
