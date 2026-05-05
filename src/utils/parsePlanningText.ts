import type { TaskDraft } from '@/types';

const DEFAULT_COMPLETION_STANDARD = '达到自己设定的完成标准';
const MIN_SEGMENT_LENGTH = 2;

const prefixPattern = /^(今天我要|今天|我要|上午|中午|下午|晚上|然后|另外|还有|先|再)\s*/;

function createDraftId(index: number): string {
  return `draft_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\s*(然后|另外|还有)\s*/g, '\n')
    .trim();
}

function splitIntoSegments(input: string): string[] {
  return normalizeText(input)
    .split(/[；;。.\n]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= MIN_SEGMENT_LENGTH);
}

function removePrefixes(text: string): string {
  let nextText = text.trim();

  while (prefixPattern.test(nextText)) {
    nextText = nextText.replace(prefixPattern, '').trim();
  }

  return nextText;
}

function cleanEdgePunctuation(text: string): string {
  return text
    .replace(/^[，,、\s]+/, '')
    .replace(/[，,、\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCompletionStandard(text: string): string {
  const patterns = [
    /至少\s*\d+(?:\.\d+)?\s*字/,
    /\d+(?:\.\d+)?\s*分钟/,
    /\d+(?:\.\d+)?\s*小时/,
    /\d+(?:\.\d+)?\s*公里/,
    /背\s*\d+\s*个/,
    /做\s*\d+\s*道/,
    /看\s*\d+\s*页/,
    /把[^，,；;。.\n]*(?:清空|整理好|完成|写完|做完)/,
    /[^，,；;。.\n]*(?:整理好|完成|写完|做完)[^，,；;。.\n]*/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return cleanEdgePunctuation(match[0]);
    }
  }

  return DEFAULT_COMPLETION_STANDARD;
}

function estimateMinutes(text: string): number {
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*分钟/);

  if (minuteMatch?.[1]) {
    return Math.max(1, Math.round(Number(minuteMatch[1])));
  }

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*小时/);

  if (hourMatch?.[1]) {
    return Math.max(1, Math.round(Number(hourMatch[1]) * 60));
  }

  return 30;
}

function removeCompletionStandardFromTitle(text: string, completionStandard: string): string {
  if (completionStandard === DEFAULT_COMPLETION_STANDARD) {
    return text;
  }

  let title = text;

  if (/^背\s*\d+\s*个$/.test(completionStandard)) {
    title = title.replace(/背\s*(\d+\s*个)\s*/, '背');
  } else if (/^做\s*\d+\s*道$/.test(completionStandard)) {
    title = title.replace(/做\s*(\d+\s*道)\s*/, '做');
  } else if (/^看\s*\d+\s*页$/.test(completionStandard)) {
    title = title.replace(/看\s*(\d+\s*页)\s*/, '看');
  } else {
    title = title.replace(completionStandard, '');
  }

  return cleanEdgePunctuation(title);
}

function buildTitle(segment: string, completionStandard: string): string {
  const withoutPrefix = removePrefixes(segment);
  const title = removeCompletionStandardFromTitle(withoutPrefix, completionStandard);

  if (title.length >= MIN_SEGMENT_LENGTH) {
    return title;
  }

  return cleanEdgePunctuation(withoutPrefix) || '未命名任务';
}

export function parsePlanningText(input: string): TaskDraft[] {
  return splitIntoSegments(input).map((segment, index) => {
    const normalizedSegment = cleanEdgePunctuation(removePrefixes(segment));
    const completionStandard = findCompletionStandard(normalizedSegment);

    return {
      id: createDraftId(index),
      title: buildTitle(normalizedSegment, completionStandard),
      completionStandard,
      importance: 'medium',
      estimatedMinutes: estimateMinutes(normalizedSegment),
      note: '',
    };
  });
}
