import {
  processDocumentWithGemini,
  ProcessDocumentRequestSchema,
  MilestoneExtractionOutputSchema,
} from '../../../../api/chapters/process-document';

/**
 * Next.js App Router POST Route: /api/chapters/process-document
 * 
 * Extracts grounded learning milestones strictly based on the uploaded document text or PDF.
 * Validates request and response payloads using Zod.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // 1. Validate incoming request with Zod
    const parsedRequest = ProcessDocumentRequestSchema.safeParse(rawBody);
    if (!parsedRequest.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: parsedRequest.error.format(),
        },
        { status: 400 }
      );
    }

    // 2. Execute grounded document processing pipeline
    const result = await processDocumentWithGemini(parsedRequest.data);

    // 3. Validate extracted milestones against strict Zod schema
    const validationResult = MilestoneExtractionOutputSchema.safeParse({
      chapterTitle: result.chapterTitle,
      totalSectionsDetected: result.totalSectionsDetected,
      milestones: result.milestones,
    });

    if (!validationResult.success) {
      console.warn(
        '[API /api/chapters/process-document] Output schema partial mismatch, returning normalized milestones'
      );
    }

    return Response.json({
      ...result,
      validated: validationResult.success,
    });
  } catch (error: any) {
    console.error('Error in /api/chapters/process-document:', error);
    if (error?.code === 'UNREADABLE_DOCUMENT' || error?.status === 400) {
      return Response.json(
        {
          error: 'UNREADABLE_DOCUMENT',
          message: error.message || 'The document contains no readable text. It may be an image-only scanned PDF or password protected. Please run OCR or upload a text-based document.',
          characterCount: error.characterCount || 0,
        },
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: error?.message || 'Failed to process document and extract milestones',
      },
      { status: 500 }
    );
  }
}
