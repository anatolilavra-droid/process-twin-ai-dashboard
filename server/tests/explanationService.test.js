const mockParse = jest.fn();
jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({ messages: { parse: mockParse } }))
);

const { generateExplanation } = require('../services/explanationService');

const baseOrder = {
  id: 'order-1',
  order_type: 'urgent',
  estimated_hours: 2,
  deadline_at: new Date(Date.now() + 3600000).toISOString(),
};
const baseAssignment = {
  id: 'assignment-1',
  planned_start: new Date().toISOString(),
  planned_end: new Date(Date.now() + 7200000).toISOString(),
};
const baseSpecialist = { id: 'specialist-1', name: 'Martin', specialist_type: 'electrician' };
const specialistAssignments = [
  { assignment_id: 'assignment-1', specialist_id: 'specialist-1', planned_start: baseAssignment.planned_start },
];

function callGenerate() {
  return generateExplanation({
    order: baseOrder,
    assignment: baseAssignment,
    specialist: baseSpecialist,
    specialistAssignments,
  });
}

describe('generateExplanation', () => {
  afterEach(() => {
    mockParse.mockReset();
  });

  it('returns the LLM-parsed explanation when the call succeeds', async () => {
    const parsedOutput = {
      topFactors: [{ factor: 'deadline', description: 'Close deadline', impact: 'high' }],
      summaryText: 'Explained clearly.',
      confidence: 'high',
    };
    mockParse.mockResolvedValueOnce({ parsed_output: parsedOutput });

    const result = await callGenerate();

    expect(result.source).toBe('llm');
    expect(result.explanation).toEqual(parsedOutput);
    expect(mockParse).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-opus-5' }));
  });

  it('falls back to a template explanation when the LLM call throws', async () => {
    mockParse.mockRejectedValueOnce(new Error('network down'));

    const result = await callGenerate();

    expect(result.source).toBe('fallback');
    expect(result.explanation.confidence).toBe('low');
    expect(result.explanation.topFactors.length).toBeGreaterThan(0);
    expect(result.explanation.topFactors.length).toBeLessThanOrEqual(3);
  });

  it('falls back when parsed_output is missing (schema validation failed)', async () => {
    mockParse.mockResolvedValueOnce({ parsed_output: null });

    const result = await callGenerate();

    expect(result.source).toBe('fallback');
  });

  it('grounds rawFactors only in data the scheduler actually used — no invented fields', async () => {
    mockParse.mockRejectedValueOnce(new Error('down'));

    const result = await callGenerate();

    expect(result.rawFactors).not.toHaveProperty('priority');
    expect(result.rawFactors).not.toHaveProperty('vip');
    expect(result.rawFactors.orderType).toBe('urgent');
    expect(result.rawFactors.specialistName).toBe('Martin');
    expect(result.rawFactors.typePriorityBonusHours).toBeGreaterThan(0);
  });
});
