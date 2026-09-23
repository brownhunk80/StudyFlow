import {
  generateMilestoneContent,
  GenerateMilestoneContentRequestSchema,
} from '../../../../api/chapters/generate-milestone-content';

/**
 * Next.js App Router POST Route: /api/chapters/generate-milestone-content
 * On-Demand Detail Generator (Phase B)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    const parsedRequest = GenerateMilestoneContentRequestSchema.safeParse(rawBody);
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

    const result = await generateMilestoneContent(parsedRequest.data);
    return Response.json(result);
  } catch (error: any) {
    console.error('Error in /api/chapters/generate-milestone-content:', error);
    const status = error.status || 500;
    return Response.json(
      {
        error: error.code || 'GENERATION_ERROR',
        message: error.message || 'Failed to generate milestone content.',
      },
      { status }
    );
  }
}
