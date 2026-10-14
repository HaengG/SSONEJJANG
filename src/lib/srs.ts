import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs';

// 카페 레시피는 "현장에서 바로 꺼내야" 해서 목표 기억률을 높게(90%) 잡고,
// 최대 간격은 45일로 제한해 오래 안 본 메뉴가 없게 해요.
const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, maximum_interval: 45, enable_fuzz: true })
);

export { Rating, State };
export type { Card, Grade };

export const newCard = (now = new Date()): Card => createEmptyCard(now);

export function review(card: Card, rating: Grade, now = new Date()): Card {
  return scheduler.next(card, now, rating).card;
}

export function previewDue(card: Card, now = new Date()): Record<Grade, Date> {
  const log = scheduler.repeat(card, now);
  return {
    [Rating.Again]: log[Rating.Again].card.due,
    [Rating.Hard]: log[Rating.Hard].card.due,
    [Rating.Good]: log[Rating.Good].card.due,
    [Rating.Easy]: log[Rating.Easy].card.due
  } as Record<Grade, Date>;
}

export function intervalLabel(due: Date, now = new Date()): string {
  const min = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000));
  if (min < 60) return `${min}분`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}일`;
  return `${Math.round(d / 30)}달`;
}

/** 숙련도 0~5 단계 */
export function level(card: Card | undefined): number {
  if (!card || card.state === State.New) return 0;
  if (card.state === State.Learning || card.state === State.Relearning) return 1;
  const s = card.stability;
  // 첫날 '알맞음'만 눌러도 안정도가 3일 정도라서, 문턱을 넉넉히 잡아요.
  if (s < 5) return 2;
  if (s < 15) return 3;
  if (s < 40) return 4;
  return 5;
}

export const LEVEL_NAMES = ['새 메뉴', '익히는 중', '조금 앎', '거의 앎', '잘 앎', '마스터'];

/** JSON 백업에서 불러온 카드의 날짜 문자열을 Date로 되돌려요. */
export function reviveCard(c: any): Card {
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined
  };
}
