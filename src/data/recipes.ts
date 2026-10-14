// 레시피북 (확정본 v1) 데이터
// - 한 줄 = 외울 단위 하나. 숫자는 빈칸 문제로, 줄 전체는 보기 문제로 쓰여요.
// - "📍 샷잔" / "📍 바로 잔" 처럼 위치는 따로 한 줄로 둬서 헷갈림 포인트로 만들어요.

export type Temp = 'HOT' | 'ICE';

export interface Section {
  label: string;
  lines: string[];
}

export interface Recipe {
  id: string;
  name: string;
  temp?: Temp;
  cup?: string;
  category: string;
  family: string;
  kind: 'drink' | 'procedure';
  sections: Section[];
  notes?: string[];
}

export const SEED_VERSION = 1;

export const CATEGORIES = ['커피', '라떼', '믹서', '에이드', '차 베이스', '티', '디저트', '베이스·크림'] as const;

export interface Family {
  id: string;
  name: string;
  tip?: string;
}

export const FAMILIES: Family[] = [
  { id: 'coffee-basic', name: '기본 커피', tip: '에스프레소·콜드브루는 단순해요. 콜드브루는 커피 90 + 물 가득.' },
  { id: 'coffee-milk', name: '샷 + 우유 라떼', tip: '아이스는 얼음+우유 먼저 깔고 샷잔에서 섞어 붓기, 핫은 바로 잔에 담고 우유 스팀. 아이스가 시럽·소스를 더 많이 넣어요.' },
  { id: 'coffee-cream', name: '크림 커피 · 아포가토', tip: '아인슈페너와 소금커피는 같은 뼈대(얼음 + 물 130~180 + 샷 + 크림). 차이는 크림과 마무리.' },
  { id: 'powder-latte', name: '파우더 라떼', tip: '아이스 = 파우더 40을 뜨물로 녹여 우유 250과 얼음잔에. 핫 = 파우더 35 + 우유 250 스팀(거품 많이). 초코만 소스+파우더.' },
  { id: 'special-latte', name: '스페셜 라떼 · 아이스크림', tip: '밀크티는 샷잔에 티백, 딸기·퐁퐁라떼는 아이스크림 마무리.' },
  { id: 'frappe', name: '프라페', tip: '우유 150 고정, 블렌더 4번 버튼 1번.' },
  { id: 'yogurt', name: '요거트 스무디', tip: '우유 150 고정, 얼음 + 뜨물 조금. 플레인은 파우더 80·얼음 13, 과일은 파우더 40·얼음 11 + 과일 + 잼 30.' },
  { id: 'juice', name: '생과일 주스', tip: '망고만 2번 버튼 2번, 키위·토마토는 4번 버튼 1번.' },
  { id: 'ade', name: '에이드', tip: '설탕시럽 2p + 레몬즙 10 + 퓨레 → 탄산수 170 → 마지막에 얼음 full.' },
  { id: 'tea-base', name: '차 베이스 음료', tip: '오렌지 히비스커스는 오렌지시럽 먼저! 레몬마일은 얼음 → 캐모마일 → 얼음 순서.' },
  { id: 'fruit-tea', name: '과일청 차', tip: '핫은 피처에 뜨물 200 → 약한 스팀. 아이스는 설탕시럽 2p + 물 1/2 mix + 얼음 가득.' },
  { id: 'teabag', name: '티백 차', tip: '핫 = 티백 묶기 + 뜨물(긴잔). 아이스 = 샷잔에 우리고 얼음 가득 → 붓고 → 물 가득. takeout은 샷잔.' },
  { id: 'bread', name: '빵', tip: '케이크·빵은 상했는지 확인하고 드리기 (케이크 날짜 적기!)' },
  { id: 'dessert', name: '디저트', tip: '빙수는 전원 먼저 켜 놓기!' },
  { id: 'base', name: '베이스', tip: '아이스티·히비스커스는 뜨거운 물로 녹이고 얼음 조금 + 물 가득.' },
  { id: 'cream', name: '크림 · 휘핑', tip: '크림은 3잔 / 3+1잔 두 가지 분량. 믹서 [4] 2번.' }
];

const S = (label: string, ...lines: string[]): Section => ({ label, lines });

export const RECIPES: Recipe[] = [
  // ───────── 커피 ─────────
  { id: 'espresso', name: '에스프레소', category: '커피', family: 'coffee-basic', kind: 'drink',
    sections: [S('샷', '샷'), S('마무리', '설탕', '작은스푼')] },
  { id: 'coldbrew', name: '콜드브루', category: '커피', family: 'coffee-basic', kind: 'drink',
    sections: [S('준비', '얼음 full'), S('샷', '커피 90'), S('물', '물 가득')] },
  { id: 'latte-ice', name: '카페라떼', temp: 'ICE', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 full', '우유'), S('샷', '샷')] },
  { id: 'latte-hot', name: '카페라떼', temp: 'HOT', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('샷', '📍 바로 잔', '안티구아 샷'), S('우유', '우유 230 스팀')] },
  { id: 'decaf-latte', name: '디카페인 라떼', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('레시피', '카페라떼와 동일', '원두만 디카페인'), S('잔', 'hot은 둥근큰잔 or 라떼잔')] },
  { id: 'vanilla-ice', name: '바닐라라떼', temp: 'ICE', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 full', '우유'), S('샷', '📍 샷잔', '바닐라시럽 3p', '샷')] },
  { id: 'vanilla-hot', name: '바닐라라떼', temp: 'HOT', cup: '라떼잔', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('샷', '📍 바로 잔', '바닐라시럽 2p', '샷 (안 저어도 됨)'), S('우유', '우유 230 스팀')] },
  { id: 'saigon-ice', name: '사이공라떼', temp: 'ICE', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 full', '우유'), S('샷', '📍 샷잔', '연유 40', '샷')] },
  { id: 'saigon-hot', name: '사이공라떼', temp: 'HOT', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('샷', '📍 바로 잔', '연유 30', '샷'), S('우유', '우유 230 스팀')] },
  { id: 'flatwhite-ice', name: '플랫화이트', temp: 'ICE', cup: '고블렛잔', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 5개', '우유 150'), S('샷', '안티구아 20초 추출')] },
  { id: 'flatwhite-hot', name: '플랫화이트', temp: 'HOT', cup: '납작잔', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('샷', '📍 바로 잔', '안티구아 20초 추출'), S('우유', '우유 200 스팀')] },
  { id: 'cappuccino-ice', name: '카푸치노', temp: 'ICE', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 8개', '거품우유 200'), S('샷', '샷'), S('마무리', '시나몬가루')] },
  { id: 'cappuccino-hot', name: '카푸치노', temp: 'HOT', cup: '라떼잔', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [
      S('샷', '📍 바로 잔', '시나몬가루 조금', '샷 → mix'),
      S('우유', '우유 230 스팀 (거품 많이)', '엔젤링: 거품만 뜨기 → 중간에 우유 붓기'),
      S('마무리', '시나몬가루')
    ] },
  { id: 'caramel-ice', name: '카라멜마끼야또', temp: 'ICE', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 8개', '거품우유 200'), S('샷', '📍 샷잔', '카라멜소스 1p', '카라멜시럽 3p', '샷 → mix'), S('마무리', '카라멜드리즐 (#)')] },
  { id: 'caramel-hot', name: '카라멜마끼야또', temp: 'HOT', cup: '아메잔', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('샷', '📍 바로 잔', '카라멜소스 1p', '카라멜시럽 2p', '샷 → mix'), S('우유', '우유 230 스팀 (거품 많이)'), S('마무리', '카라멜드리즐 (#)')] },
  { id: 'mocha-ice', name: '카페모카', temp: 'ICE', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('준비', '얼음 full', '우유'), S('샷', '📍 샷잔', '초코소스 50', '샷 → mix'), S('마무리', '휘핑 (o/x)', '초코가루')] },
  { id: 'mocha-hot', name: '카페모카', temp: 'HOT', cup: '아메잔', category: '커피', family: 'coffee-milk', kind: 'drink',
    sections: [S('샷', '📍 바로 잔', '초코소스 30', '샷 → mix'), S('우유', '우유 230 스팀'), S('마무리', '휘핑 (o/x)', '초코가루')] },
  { id: 'einspanner', name: '아인슈페너', category: '커피', family: 'coffee-cream', kind: 'drink',
    sections: [S('준비', '얼음 9개', '물 130~180'), S('샷', '📍 샷잔', '설탕 15', '안티구아 샷'), S('크림', '아인슈페너 크림'), S('마무리', '그릇', '작은스푼')] },
  { id: 'salt-ice', name: '소금커피', temp: 'ICE', category: '커피', family: 'coffee-cream', kind: 'drink',
    sections: [S('준비', '얼음 8개', '물 130~180'), S('샷', '샷'), S('크림', '소금 크림'), S('마무리', '크런키', '그릇', '스푼 주지 않기')] },
  { id: 'salt-hot', name: '소금커피', temp: 'HOT', category: '커피', family: 'coffee-cream', kind: 'drink',
    sections: [S('준비', '뜨물 200'), S('샷', '샷'), S('크림', '소금 크림'), S('마무리', '크런키')] },
  { id: 'affogato', name: '아포가토', category: '커피', family: 'coffee-cream', kind: 'drink',
    sections: [S('준비', '아이스크림 3스쿱', '초코드리즐', '아몬드가루'), S('샷', '📍 샷잔', '샷 (따로)'), S('마무리', '작은스푼')] },

  // ───────── 라떼 ─────────
  { id: 'choco-ice', name: '초코라떼', temp: 'ICE', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('준비', '얼음 full'), S('피처', '초코소스 30', '초코파우더 20', '→ 뜨물 mix'), S('우유', '우유 250', '→ 얼음잔에 붓기')] },
  { id: 'choco-hot', name: '초코라떼', temp: 'HOT', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('피처', '초코소스 20', '초코파우더 20'), S('우유', '우유 250 → 스팀 (거품 많이)'), S('마무리', '초코파우더')] },
  { id: 'greentea-ice', name: '녹차라떼', temp: 'ICE', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('준비', '얼음 full'), S('피처', '녹차파우더 40', '→ 뜨물 mix'), S('우유', '우유 250', '→ 얼음잔에 붓기')] },
  { id: 'greentea-hot', name: '녹차라떼', temp: 'HOT', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('피처', '녹차파우더 35'), S('우유', '우유 250 → 스팀 (거품 많이)'), S('마무리', '녹차파우더')] },
  { id: 'sesame-ice', name: '흑임자라떼', temp: 'ICE', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('준비', '얼음 full'), S('피처', '흑임자파우더 40', '→ 뜨물 mix'), S('우유', '우유 250', '→ 얼음잔에 붓기')] },
  { id: 'sesame-hot', name: '흑임자라떼', temp: 'HOT', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('피처', '흑임자파우더 35'), S('우유', '우유 250 → 스팀 (거품 많이)'), S('마무리', '아몬드가루')] },
  { id: 'sweetpotato-ice', name: '고구마라떼', temp: 'ICE', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('준비', '얼음 full'), S('피처', '고구마페이스트 80'), S('우유', '우유 230 (바닥까지)', '→ 얼음잔에 붓기')] },
  { id: 'sweetpotato-hot', name: '고구마라떼', temp: 'HOT', category: '라떼', family: 'powder-latte', kind: 'drink',
    sections: [S('피처', '고구마페이스트 70'), S('우유', '우유 250 → 스팀 (거품 많이)'), S('마무리', '아몬드가루')] },
  { id: 'milktea-ice', name: '밀크티', temp: 'ICE', category: '라떼', family: 'special-latte', kind: 'drink',
    sections: [
      S('준비', '📍 샷잔', '얼그레이 티백 우려놓기'),
      S('잔', '📍 바로 잔', '우유 150', '밀크티 원액 80'),
      S('붓기', '→ 샷잔 얼그레이티 붓기', '마지막에 + 얼음 full')
    ] },
  { id: 'milktea-hot', name: '밀크티', temp: 'HOT', cup: '라떼잔', category: '라떼', family: 'special-latte', kind: 'drink',
    sections: [
      S('준비', '📍 바로 잔', '얼그레이 티백 우려놓기'),
      S('피처', '우유 150', '밀크티 원액 80', '→ 스팀 (거품 x)'),
      S('붓기', '→ 스팀한 거 잔에 붓기')
    ] },
  { id: 'strawberry-latte', name: '딸기라떼', category: '라떼', family: 'special-latte', kind: 'drink',
    sections: [S('준비', '딸기라떼 베이스 120', '우유'), S('마무리', '아이스크림', '딸기크런키')] },
  { id: 'pongpong-latte', name: '퐁퐁라떼', category: '라떼', family: 'special-latte', kind: 'drink',
    sections: [
      S('준비', '잔에 초코드리즐 한 바퀴', '바닐라시럽 2p', '우유 (잔 2/3)'),
      S('토핑', '죠리퐁 1/2 (꾹 눌러서)'),
      S('마무리', '아이스크림', '초코드리즐', '아몬드가루', '쿠키 1/2', '숟가락')
    ] },
  { id: 'vanilla-icecream', name: '바닐라 아이스크림', category: '라떼', family: 'special-latte', kind: 'drink',
    sections: [S('준비', '아이스크림 4스쿱'), S('마무리', '초코드리즐', '쿠키 1/2', '아몬드가루', '작은스푼')] },

  // ───────── 믹서 ─────────
  { id: 'frappe-cnc', name: '쿠앤크 프라페', category: '믹서', family: 'frappe', kind: 'drink',
    sections: [
      S('얼음', '얼음 9개'), S('우유', '우유 150'), S('파우더', '파우더 x'),
      S('추가', '오레오 5개', '초코소스 30', '아이스크림 80g'),
      S('블렌더', '4번 버튼 1번'), S('마무리', '휘핑', '크런키', '쿠키 1/2')
    ] },
  { id: 'frappe-greentea', name: '녹차 프라페', category: '믹서', family: 'frappe', kind: 'drink',
    sections: [
      S('얼음', '얼음 14개'), S('우유', '우유 150'), S('파우더', '녹차파우더 60'),
      S('추가', '연유 10'), S('블렌더', '4번 버튼 1번'), S('마무리', '휘핑', '녹차파우더')
    ] },
  { id: 'yogurt-plain', name: '플레인 요거트 스무디', category: '믹서', family: 'yogurt', kind: 'drink',
    sections: [
      S('얼음', '얼음 13개', '뜨물 조금'), S('우유', '우유 150'), S('파우더', '요거트파우더 80'),
      S('블렌더', '4번 버튼 1번'), S('마무리', '아이스크림')
    ] },
  { id: 'yogurt-blueberry', name: '블루베리 요거트 스무디', category: '믹서', family: 'yogurt', kind: 'drink',
    sections: [
      S('얼음', '얼음 11개', '뜨물 조금'), S('우유', '우유 150'), S('파우더', '요거트파우더 40'),
      S('추가', '블루베리 40', '블루베리잼 30'), S('블렌더', '2번 버튼 2번')
    ] },
  { id: 'yogurt-strawberry', name: '딸기 요거트 스무디', category: '믹서', family: 'yogurt', kind: 'drink',
    sections: [
      S('얼음', '얼음 11개', '뜨물 조금'), S('우유', '우유 150'), S('파우더', '요거트파우더 40'),
      S('추가', '딸기 50', '딸기잼 30'), S('블렌더', '2번 버튼 2번')
    ] },
  { id: 'juice-mango', name: '망고 주스', category: '믹서', family: 'juice', kind: 'drink',
    sections: [
      S('얼음', '얼음 5개'), S('재료', '망고시럽 50', '냉동망고 200'),
      S('물', '피처에 물 150 (뜨반찬반)'), S('블렌더', '2번 버튼 2번')
    ] },
  { id: 'juice-kiwi', name: '키위 주스', category: '믹서', family: 'juice', kind: 'drink',
    sections: [
      S('얼음', '얼음 x'), S('재료', '키위액 1펌프', '냉동키위 2알'),
      S('물', '뜨거운 물 120', '정수 110'), S('블렌더', '4번 버튼 1번')
    ] },
  { id: 'juice-tomato', name: '토마토 주스', category: '믹서', family: 'juice', kind: 'drink',
    sections: [S('얼음', '얼음 5개'), S('재료', '토마토 350 (2~3개)', '꿀 35'), S('블렌더', '4번 버튼 1번')] },

  // ───────── 에이드 ─────────
  { id: 'ade-grapefruit', name: '자몽 에이드', category: '에이드', family: 'ade', kind: 'drink',
    sections: [
      S('베이스', '설탕시럽 2p', '레몬즙 10', '자몽퓨레 70'), S('탄산수', '탄산수 170'),
      S('얼음', '마지막에 얼음 full'), S('마무리', '자몽슬라이스')
    ] },
  { id: 'ade-greengrape', name: '청포도 에이드', category: '에이드', family: 'ade', kind: 'drink',
    sections: [
      S('베이스', '설탕시럽 2p', '레몬즙 10', '청포도퓨레 80'), S('탄산수', '탄산수 170'),
      S('얼음', '마지막에 얼음 full'), S('마무리', '마무리 없음')
    ] },

  // ───────── 차 베이스 ─────────
  { id: 'orange-hibiscus', name: '오렌지 히비스커스', category: '차 베이스', family: 'tea-base', kind: 'drink',
    sections: [
      S('준비', '얼음 full (먼저)'),
      S('재료', '오렌지시럽 65 (튜브) ← 레몬즙보다 먼저!', '레몬즙 15', '히비스커스 200 (병)', '층 나누기')
    ] },
  { id: 'lemon-chamomile', name: '레몬마일', category: '차 베이스', family: 'tea-base', kind: 'drink',
    notes: ['레몬마일 = 레몬청 캐모마일'],
    sections: [
      S('준비', '📍 샷잔', '캐모마일 티백 우려놓기'),
      S('재료', '레몬즙 10', '레몬청 40', '레몬슬라이스 3~4개'),
      S('붓기', '① 얼음 조금 + 정수', '② 샷잔 캐모마일티 붓기', '③ 마지막에 얼음 가득 + 물'),
      S('마무리', '마지막에 레몬슬라이스 (청)')
    ] },
  { id: 'vin-chaud', name: '뱅쇼', cup: '투명잔', category: '차 베이스', family: 'tea-base', kind: 'drink',
    sections: [
      S('피처', '레몬즙 10', '원액 70', '뜨물 150'),
      S('스팀', '약한 스팀', '끓기 직전(하얘지기 전)에 끄기'),
      S('마무리', '자몽슬라이스', '레몬슬라이스', '계피스틱 (빨대 뒤)')
    ] },

  // ───────── 티 ─────────
  { id: 'lemon-tea-hot', name: '레몬차', temp: 'HOT', cup: '라떼잔', category: '티', family: 'fruit-tea', kind: 'drink',
    sections: [S('피처', '레몬즙 10', '레몬청 40', '레몬슬라이스 5~6개'), S('물', '피처에 뜨물 200', '→ 약한 스팀'), S('마무리', '작은스푼')] },
  { id: 'lemon-tea-ice', name: '레몬차', temp: 'ICE', category: '티', family: 'fruit-tea', kind: 'drink',
    sections: [S('재료', '설탕시럽 2p', '레몬즙 15', '레몬청 40', '레몬슬라이스 5~6개'), S('물', '물 1/2 → mix', '마지막에 얼음 가득')] },
  { id: 'grapefruit-tea-hot', name: '자몽차', temp: 'HOT', cup: '라떼잔', category: '티', family: 'fruit-tea', kind: 'drink',
    sections: [S('피처', '자몽퓨레 30', '자몽청 50'), S('물', '뜨물 200', '→ 약한 스팀'), S('마무리', '자몽슬라이스', '작은스푼')] },
  { id: 'yuja-tea', name: '유자차', temp: 'HOT', cup: '긴잔', category: '티', family: 'fruit-tea', kind: 'drink',
    sections: [
      S('재료', '📍 긴잔에 바로', '유자 120'),
      S('물', '피처에 뜨물 300', '→ 약한 스팀', '→ 잔에 붓기 (안 저어도 됨)', '뜨물 = 손잡이 밑까지'),
      S('마무리', '티슈', '숟가락 X')
    ] },
  { id: 'ginger-tea', name: '생강차', category: '티', family: 'fruit-tea', kind: 'drink',
    sections: [S('피처', '생강액 20', '생강청 40'), S('물', '뜨물 200 → mix', '→ 스팀')] },
  { id: 'ginger-latte', name: '생강라떼', category: '티', family: 'fruit-tea', kind: 'drink',
    sections: [S('피처', '생강액 20', '생강청 40'), S('우유', '우유 200 → 스팀 (거품 많이)'), S('마무리', '시나몬가루')] },
  { id: 'blacktea-hot', name: '홍차', temp: 'HOT', cup: '긴잔', category: '티', family: 'teabag', kind: 'drink',
    sections: [S('방법', '티백 묶기', '뜨물'), S('마무리', '티백 버리는 그릇')] },
  { id: 'blacktea-ice', name: '홍차 (얼그레이)', temp: 'ICE', category: '티', family: 'teabag', kind: 'drink',
    sections: [S('방법', '📍 샷잔', '티백 우리기', '얼음 가득 → 붓고 → 물 가득'), S('마무리', '티백 버리는 그릇')] },
  { id: 'herbtea-hot', name: '허브차', temp: 'HOT', cup: '긴잔', category: '티', family: 'teabag', kind: 'drink',
    sections: [S('방법', '티백 묶기', '뜨물')] },
  { id: 'herbtea-ice', name: '허브차', temp: 'ICE', category: '티', family: 'teabag', kind: 'drink',
    sections: [S('방법', '📍 샷잔', '티백 우리기', '얼음 가득 → 붓고 → 물 가득')] },

  // ───────── 디저트 ─────────
  { id: 'timber-bread', name: '팀버브레드', category: '디저트', family: 'bread', kind: 'drink',
    notes: ['케이크·빵은 상했는지 확인하고 드리기'],
    sections: [S('오븐', '오븐 선택 시작', '🔔', '시작 (3분 타이머)'), S('준비', '큰 그릇', '잼, 버터'), S('셋팅', '1개/N개', '칼, 포크')] },
  { id: 'blueberry-bread', name: '블루베리식빵', category: '디저트', family: 'bread', kind: 'drink',
    sections: [S('오븐', '오븐 선택 시작', '🔔'), S('준비', '그릇'), S('셋팅', '칼, 포크')] },
  { id: 'sweetpotato-bread', name: '고구마식빵', category: '디저트', family: 'bread', kind: 'drink',
    sections: [S('오븐', '레인지 30초 시작', '🔔'), S('준비', '그릇'), S('셋팅', '칼, 포크')] },
  { id: 'oven-steps', name: '오븐 조작 순서', category: '디저트', family: 'bread', kind: 'procedure',
    sections: [
      S('순서', '전원', '수동 (2번)', '오븐', '선택', '시작', '종소리', '시작', '타이머 (3분)', '스타트', '취소', '빵 꺼내기'),
      S('주의', '예열 종료 후 빵은 가로로 놓기')
    ] },
  { id: 'honey-bread', name: '허니브레드', category: '디저트', family: 'bread', kind: 'procedure',
    sections: [
      S('준비물', '팀버브레드 반 개 (냉동실 확인)', '버터', '카라멜 드리즐', '휘핑', '시나몬가루'),
      S('순서', '자르기: 가로 3번, 세로 1번, 깊이 2/3', '버터 사이에 넣기', '오븐 예열 + 4분', '카라멜 드리즐', '휘핑', '카라멜 드리즐', '시나몬가루')
    ] },
  { id: 'bingsu', name: '빙수 (여름 메뉴)', category: '디저트', family: 'dessert', kind: 'procedure',
    sections: [
      S('준비', '먼저 전원 켜 놓기!'),
      S('셋팅', '숟가락', '종이컵 n개'),
      S('순서', '얼음 120', '연유 20', '얼음 120', '인절미가루 1스푼', '팥 230~250g', '연유 20', '우유 샷잔', '떡 반 개 잘라서 올리기')
    ] },
  { id: 'wellness-yogurt', name: '웰니스 수제요거트', category: '디저트', family: 'dessert', kind: 'procedure',
    sections: [
      S('순서', '요거트 큰스푼 ×4', '꿀 15~20g', '냉동블루베리', '베리믹스', '아몬드슬라이스', '호두 2알'),
      S('마무리', '큰스푼이랑 같이 나가기')
    ] },

  // ───────── 베이스 · 크림 ─────────
  { id: 'base-icetea', name: '아이스티 베이스', category: '베이스·크림', family: 'base', kind: 'procedure',
    sections: [S('순서', '파우더 400~430', '뜨물 조금 → mix', '얼음 조금', '물 가득')] },
  { id: 'base-hibiscus', name: '히비스커스 베이스', category: '베이스·크림', family: 'base', kind: 'procedure',
    sections: [S('순서', '티 3개', '뜨거운 물 조금 (10분 우리기)', '얼음 조금', '물 가득')] },
  { id: 'base-orange', name: '오렌지 시럽', category: '베이스·크림', family: 'base', kind: 'procedure',
    sections: [S('재료', '오렌지주스 300', '설탕 200 (서랍 밑)')] },
  { id: 'base-strawberry', name: '딸기라떼 베이스', category: '베이스·크림', family: 'base', kind: 'procedure',
    sections: [S('재료', '냉동딸기 (해동)', '딸기잼 150', '딸기 5개'), S('믹서', '믹서 4초 (알갱이)')] },
  { id: 'cream-salt', name: '소금 크림', category: '베이스·크림', family: 'cream', kind: 'procedure',
    sections: [
      S('3잔', '휘핑 140', '우유 60', '설탕 20', '소금 티스푼 1/2 × 2번'),
      S('3+1잔', '휘핑 210', '우유 90', '설탕 30', '소금 티스푼 1/2 × 3번'),
      S('믹서', '믹서 [4] 2번')
    ] },
  { id: 'cream-einspanner', name: '아인슈페너 크림', category: '베이스·크림', family: 'cream', kind: 'procedure',
    sections: [
      S('3잔', '휘핑 120', '우유 80', '바닐라시럽 4p'),
      S('3+1잔', '휘핑 180', '우유 120', '바닐라시럽 6p'),
      S('믹서', '믹서 [4] 2번')
    ] },
  { id: 'whipping', name: '휘핑 (가스 주입)', category: '베이스·크림', family: 'cream', kind: 'procedure',
    sections: [
      S('재료', '크림 470~480'),
      S('가스 주입 (2번 반복)', '입구 돌려서 잠그기', '밸브 열기 (가로)', '90도 돌리기 (반시계 방향, 소리 듣기)', '잠그기', '밸브 잠그기 (세로)', '빼고 세게 흔들기')
    ] }
];
