import {
  extractChapterMilestones,
  ExtractMilestonesRequestSchema,
} from '../../../../api/chapters/extract-milestones';

/**
 * Next.js App Router POST Route: /api/chapters/extract-milestones
 * Fast Milestone Outline Discovery (Phase A)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    const parsedRequest = ExtractMilestonesRequestSchema.safeParse(rawBody);
    if (!parsedRequest.success) {
      return Response.json(
        {
          error: 'INVALID_INPUT',
          message: 'Invalid request payload format',
          details: parsedRequest.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await extractChapterMilestones(parsedRequest.data);
    return Response.json(result);
  } catch (error: any) {
    console.error('Error in /api/chapters/extract-milestones:', error);
    const status = error.status || (error.code === 'INVALID_INPUT' ? 400 : 500);
    return Response.json(
      {
        error: error.code || 'EXTRACTION_ERROR',
        message: error.message || 'Failed to extract milestones from text.',
        characterCount: error.characterCount,
      },
      { status }
    );
  }
}
