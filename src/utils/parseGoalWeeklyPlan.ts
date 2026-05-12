import type { GoalWeeklyPlanDay } from '@/types';

const weekdayMeta: Record<number, { label: string; aliases: string[] }> = {
  1: { label: '周一', aliases: ['周一', '星期一', '礼拜一'] },
  2: { label: '周二', aliases: ['周二', '星期二', '礼拜二'] },
  3: { label: '周三', aliases: ['周三', '星期三', '礼拜三'] },
  4: { label: '周四', aliases: ['周四', '星期四', '礼拜四'] },
  5: { label: '周五', aliases: ['周五', '星期五', '礼拜五'] },
  6: { label: '周六', aliases: ['周六', '星期六', '礼拜六'] },
  7: { label: '周日', aliases: ['周日', '周天', '星期日', '星期天', '礼拜日', '礼拜天'] },
};

const headerPattern = /(?:^|\n)\s*(周一|周二|周三|周四|周五|周六|周日|周天|星期一|星期二|星期三|星期四|星期五|星期六|星期日|星期天|礼拜一|礼拜二|礼拜三|礼拜四|礼拜五|礼拜六|礼拜日|礼拜天)\s*[：:]?\s*([^\n]*)/g;

function getWeekday(alias: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  for (const [weekday, meta] of Object.entries(weekdayMeta)) {
    if (meta.aliases.includes(alias)) {
      return Number(weekday) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    }
  }
  return 1;
}

function cleanTitle(label: string, title: string): string {
  const normalized = title.trim().replace(/^[-—\s]+/, '').trim();
  return normalized.length > 0 ? normalized : `${label}行动`;
}

export function parseGoalWeeklyPlan(rawText: string): GoalWeeklyPlanDay[] {
  const text = rawText.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const matches = Array.from(text.matchAll(headerPattern));
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const alias = match[1];
    const weekday = getWeekday(alias);
    const label = weekdayMeta[weekday].label;
    const nextMatch = matches[index + 1];
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = nextMatch?.index ?? text.length;
    const rawContent = text.slice(contentStart, contentEnd).trim();
    const title = cleanTitle(label, match[2] ?? '');
    const content = rawContent.length > 0 ? rawContent : title;

    return {
      weekday,
      weekdayLabel: label,
      title,
      content,
      taskTitle: title,
      taskCompletionStandard: '',
    };
  });
}
