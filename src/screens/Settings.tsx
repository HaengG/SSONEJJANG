import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import * as db from '../lib/db';
import { Header } from '../components/ui';

export function Settings() {
  const store = useStore();
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'' | 'progress' | 'recipes'>('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const exportBackup = async () => {
    const data = JSON.stringify(db.makeBackup(store), null, 1);
    const name = `레시피-백업-${db.today()}.json`;
    const file = new File([data], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        setMsg('백업 파일을 공유했어요. "파일에 저장"을 고르면 아이폰에 보관돼요.');
        return;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg('백업 파일을 내려받았어요.');
  };

  const importBackup = async (f: File) => {
    try {
      const b = JSON.parse(await f.text());
      await db.restoreBackup(b);
      await store.reload();
      setMsg('백업을 불러왔어요.');
    } catch (e: any) {
      setMsg(`불러오지 못했어요: ${e?.message ?? '파일을 확인해 주세요'}`);
    }
  };

  const doReset = async (kind: 'progress' | 'recipes') => {
    if (confirm !== kind) return setConfirm(kind);
    if (kind === 'progress') await db.resetProgress(store.recipes, store.meta);
    else await db.restoreDefaultRecipes(store.meta);
    await store.reload();
    setConfirm('');
    setMsg(kind === 'progress' ? '학습 기록을 지웠어요.' : '레시피를 레시피북 원본으로 되돌렸어요.');
  };

  return (
    <div className="screen settings">
      <Header title="설정" />

      <section className="panel">
        <h2>하루 새 메뉴</h2>
        <p className="hint">하루에 처음 배우는 메뉴 개수예요. 복습은 따로 나와요.</p>
        <div className="seg">
          {[3, 5, 8, 10].map((n) => (
            <button key={n} className={store.meta.settings.newPerDay === n ? 'on' : ''} onClick={() => store.updateSettings({ newPerDay: n })}>
              {n}개
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>기록 보관</h2>
        {!store.persistent && <p className="error">이 브라우저에서는 저장이 안 돼요. 사생활 보호 모드라면 꺼 주세요.</p>}
        <p className="hint">
          기록은 이 폰 안에만 저장돼요. 폰을 바꾸거나 사파리 데이터를 지우기 전에 백업해 두세요.
          {persisted === true && ' (영구 저장 켜짐)'}
        </p>
        <div className="btn-col">
          <button className="btn full" onClick={exportBackup}>
            백업 파일 만들기
          </button>
          <button className="btn ghost full" onClick={() => fileRef.current?.click()}>
            백업 불러오기
          </button>
          {persisted === false && (
            <button
              className="btn ghost full"
              onClick={async () => setPersisted((await navigator.storage?.persist?.()) ?? false)}
            >
              영구 저장 요청하기
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importBackup(f);
            e.target.value = '';
          }}
        />
      </section>

      <section className="panel">
        <h2>아이폰 홈 화면에 추가</h2>
        <ol className="steps">
          <li>사파리로 이 앱 주소를 열어요</li>
          <li>아래쪽 <b>공유 버튼(□↑)</b>을 눌러요</li>
          <li><b>홈 화면에 추가</b>를 눌러요</li>
          <li>홈 화면의 "내소네 레시피북" 아이콘으로 열면 끝!</li>
        </ol>
      </section>

      <section className="panel">
        <h2>초기화</h2>
        <div className="btn-col">
          <button className={`btn full ${confirm === 'recipes' ? 'danger-solid' : 'danger'}`} onClick={() => doReset('recipes')}>
            {confirm === 'recipes' ? '수정한 레시피가 사라져요. 한 번 더 누르기' : '레시피를 원본으로 되돌리기'}
          </button>
          <button className={`btn full ${confirm === 'progress' ? 'danger-solid' : 'danger'}`} onClick={() => doReset('progress')}>
            {confirm === 'progress' ? '모든 학습 기록이 지워져요. 한 번 더 누르기' : '학습 기록 지우기'}
          </button>
        </div>
      </section>

      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}
      <p className="muted center small">내소네 레시피북 v0.2</p>
    </div>
  );
}
