require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { TYPE_PRIORITY_BONUS_HOURS } = require('./schedulingService');

const client = new Anthropic();

const ExplanationSchema = z.object({
  topFactors: z
    .array(
      z.object({
        factor: z.string(),
        description: z.string(),
        impact: z.enum(['high', 'medium', 'low']),
      })
    )
    .min(1)
    .max(3),
  summaryText: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
});

const SYSTEM_PROMPT = `You are the explanation agent for Process Twin AI Dashboard, a research prototype scheduling dashboard for a small service company. Your job is to explain, in plain language, why the scheduler assigned one specific order the way it did — for an operator deciding whether to accept or override that assignment.

Rules:
1. Identify at most 3 factors that most influenced THIS specific assignment, ranked by actual impact.
2. Write a short summary (2-4 sentences) in plain operator language. Do not use technical terms like "model", "weight", or "algorithm" — talk about deadlines, order type, and specialist availability instead.
3. Base your explanation only on the data given below. Do not invent orders, specialists, or reasons that are not present in the data.
4. The scheduler itself is a deterministic rule, not a learned model: orders are ordered by deadline, with urgent and premium orders getting a priority bonus that effectively moves their deadline earlier; each order goes to whichever matching-type specialist becomes free soonest.`;

// Grounds the LLM call (and the fallback below) in only what the scheduler
// itself actually used — no invented "priority" or "VIP" fields that don't
// exist in our schema.
function buildRawFactors({ order, assignment, specialist, specialistAssignments }) {
  const now = new Date();
  const deadline = new Date(order.deadline_at);
  const hoursUntilDeadline = Math.round(((deadline.getTime() - now.getTime()) / 3600000) * 10) / 10;

  const sortedBySpecialist = [...specialistAssignments].sort(
    (a, b) => new Date(a.planned_start) - new Date(b.planned_start)
  );
  const queuePosition = sortedBySpecialist.findIndex(a => a.assignment_id === assignment.id) + 1;

  return {
    orderId: order.id,
    orderType: order.order_type,
    typePriorityBonusHours: TYPE_PRIORITY_BONUS_HOURS[order.order_type] || 0,
    estimatedHours: order.estimated_hours,
    hoursUntilDeadline,
    specialistName: specialist.name,
    specialistType: specialist.specialist_type,
    plannedStart: assignment.planned_start,
    plannedEnd: assignment.planned_end,
    queuePosition,
    specialistTotalAssignments: sortedBySpecialist.length,
  };
}

// Used when the LLM call fails — a template built directly from the same
// raw factors, not a fabricated explanation, so it stays honest about being
// degraded (confidence: 'low') rather than pretending to be a real answer.
function buildFallbackExplanation(rawFactors) {
  const factors = [
    {
      factor: 'deadline',
      description: `Deadline in about ${rawFactors.hoursUntilDeadline}h.`,
      impact: rawFactors.hoursUntilDeadline < 24 ? 'high' : 'medium',
    },
  ];
  if (rawFactors.typePriorityBonusHours > 0) {
    factors.push({
      factor: 'order type',
      description: `"${rawFactors.orderType}" orders get a ${rawFactors.typePriorityBonusHours}h priority bonus in the scheduler.`,
      impact: 'medium',
    });
  }
  factors.push({
    factor: 'specialist availability',
    description: `${rawFactors.specialistName} (${rawFactors.specialistType}) was the soonest-available match — position ${rawFactors.queuePosition} of ${rawFactors.specialistTotalAssignments} in their queue.`,
    impact: 'medium',
  });

  return {
    // Just the substance — callers (e.g. ExplanationPanel) are expected to
    // show their own "this is a fallback" notice using `source`, so this
    // text shouldn't repeat that framing.
    topFactors: factors.slice(0, 3),
    summaryText: `Assigned to ${rawFactors.specialistName} primarily based on deadline proximity and order type — the same inputs the scheduler itself used.`,
    confidence: 'low',
  };
}

async function generateExplanation({ order, assignment, specialist, specialistAssignments }) {
  const rawFactors = buildRawFactors({ order, assignment, specialist, specialistAssignments });

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { format: zodOutputFormat(ExplanationSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Explain why this order was assigned the way it was. Data:\n${JSON.stringify(rawFactors, null, 2)}`,
        },
      ],
    });

    if (!response.parsed_output) {
      throw new Error('LLM response did not parse against the explanation schema');
    }

    return { explanation: response.parsed_output, rawFactors, source: 'llm' };
  } catch (err) {
    console.error('explanationService: LLM call failed, using fallback:', err.message);
    return { explanation: buildFallbackExplanation(rawFactors), rawFactors, source: 'fallback' };
  }
}

module.exports = { generateExplanation, ExplanationSchema };
