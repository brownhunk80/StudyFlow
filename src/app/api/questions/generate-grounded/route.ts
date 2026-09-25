import {
  generateGroundedQuestions,
  GenerateGroundedQuestionsRequestSchema,
} from '../../../../api/questions/generate-grounded';

/**
 * Next.js App Router POST Route: /api/questions/generate-grounded
 *
 * Grounded Academic Question Generation pipeline enforcing:
 * 1. Pre-Execution Payload Validation (<150 chars rejected with 400)
 * 2. Anchor-and-Verify Two-Step Prompt Pattern
 * 3. Temperature = 0.1 and strict negative constraints
 */
export async function POST(req: Request): Promise<Response> {
  try {
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return Response.json(
        {
          error: 'INVALID_JSON',
          message: 'The request body must be valid JSON.',
        },
        { status: 400 }
      );
    }

    const payload = {
      chapterTitle: rawBody.chapterTitle || rawBody.chapterName || 'Chapter Assessment',
      milestoneTitle: rawBody.milestoneTitle || rawBody.title || 'Milestone Assessment',
      topicTags: Array.isArray(rawBody.topicTags)
        ? rawBody.topicTags
        : Array.isArray(rawBody.topics)
          ? rawBody.topics
          : [],
      sectionTextExcerpt: rawBody.sectionTextExcerpt ?? rawBody.textExcerpt ?? '',
      questionCount:
        typeof rawBody.questionCount === 'number' ? rawBody.questionCount : 4,
    };

    // Pre-Execution Payload Validation (<150 characters guardrail)
    if (
      !payload.sectionTextExcerpt ||
      payload.sectionTextExcerpt.trim().length < 150
    ) {
      return Response.json(
        {
          error: 'REJECTED',
          message:
            'REJECTED: Source text excerpt is empty or too short (<150 chars). Cannot generate questions without source material.',
        },
        { status: 400 }
      );
    }

    const parsedRequest = GenerateGroundedQuestionsRequestSchema.safeParse(payload);
    if (!parsedRequest.success) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request parameters.',
          details: parsedRequest.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await generateGroundedQuestions(parsedRequest.data);
    return Response.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error in POST /api/questions/generate-grounded:', error);
    const isPayloadReject = error.message?.includes('REJECTED');
    const status = isPayloadReject ? 400 : 500;
    return Response.json(
      {
        error: isPayloadReject ? 'REJECTED' : 'GENERATION_ERROR',
        message: error.message || 'Failed to generate grounded questions.',
      },
      { status }
    );
  }
}
