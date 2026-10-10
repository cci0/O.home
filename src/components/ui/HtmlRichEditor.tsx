'use client';
// 리치 에디터 + HTML 코드 모드 (v2.0 사용자 요청)
// [에디터 | HTML] 전환 — HTML 모드에서는 코드를 직접 쓰고(표·div·style 등) 아래에서 바로 미리본다.
// 저장·표시할 때는 기존대로 sanitizeHtml을 거치므로 스크립트는 여전히 제거된다.
// 에디터는 기본 서식만 다뤄서, 표·div·style 같은 HTML을 에디터로 열면 정리된다 — 그 전에 한 번 물어본다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useState } from 'react';
import { RichEditor } from '@/components/ui/RichEditor';
import { KTextarea } from '@/components/ui/Kit';
import { ConfirmModal } from '@/components/ui/Modal';
import { sanitizeHtml } from '@/lib/sanitize';

/** 에디터가 다루지 못하는 태그·속성이 들어 있는가 — 에디터로 열면 정리된다 */
const hasRichHtml = (html: string) =>
  /<(table|thead|tbody|tr|td|th|div|span|section|article|video|audio|details|summary|font|center)\b/i.test(html)
  || /\s(style|class|id)\s*=/i.test(html);

export function HtmlRichEditor({ value, onChange, placeholder }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  // 이미 다루지 못하는 HTML이 들어 있으면 처음부터 HTML 모드로 열어 조용히 정리되는 일을 막는다
  const [mode, setMode] = useState<'editor' | 'html'>(() => (hasRichHtml(value) ? 'html' : 'editor'));
  const [ask, setAsk] = useState(false);

  const toEditor = () => {
    if (mode === 'editor') return;
    if (hasRichHtml(value)) { setAsk(true); return; }
    setMode('editor');
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="mini-seg">
        <button className={mode === 'editor' ? 'on' : ''} onClick={toEditor}>에디터</button>
        <button className={mode === 'html' ? 'on' : ''} onClick={() => setMode('html')}>HTML</button>
      </div>
      {mode === 'editor' ? (
        <RichEditor value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <>
          <KTextarea
            style={{ minHeight: 220, fontFamily: 'ui-monospace, Consolas, monospace' }}
            placeholder="<div>HTML 코드를 작성/붙여넣기...</div>"
            value={value} onChange={e => onChange(e.target.value)}
          />
          <div className="preview-box">
            <div className="pv-label">PREVIEW — 실시간 미리보기 (스크립트는 저장 시 자동 제거)</div>
            <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
          </div>
        </>
      )}
      <ConfirmModal open={ask} title="에디터로 열면 일부 태그가 정리됩니다"
        body="에디터는 굵게·목록·제목·이미지 같은 기본 서식만 다룹니다. 표·div·style·class 등은 에디터에서 편집하는 순간 정리되며 되돌릴 수 없습니다. HTML을 그대로 두려면 취소하세요."
        onClose={() => setAsk(false)}
        buttons={[
          { label: 'CANCEL', kind: 'ghost', onClick: () => setAsk(false) },
          { label: '계속', kind: 'accent', onClick: () => { setAsk(false); setMode('editor'); } },
        ]} />
    </div>
  );
}
