'use client';
// 세계관 등록 (관리자 전용)
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useWorldList, worldPath } from '@/lib/worldStore';
import { WorldForm } from '@/components/worlds/WorldForm';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

export default function WorldNewPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { list, loaded, save } = useWorldList();
  if (!loaded) return <section className="page" />;
  if (!isAdmin) return <section className="page"><div className="page-head"><PageTitle>ADD WORLD</PageTitle><p>관리자 전용</p></div></section>;
  return (
    <section className="page">
      <div className="page-head"><PageTitle>ADD WORLD</PageTitle><p>세계관 등록 — 캐릭터는 각 캐릭터 편집에서 「소속 세계관」으로 연결해요</p></div>
      <WorldForm initial={null} onCancel={() => router.push('/worlds')}
        onSave={async w => { await save([...list, w]); toast('세계관이 등록되었습니다'); router.push(worldPath(w)); }} />
    </section>
  );
}
