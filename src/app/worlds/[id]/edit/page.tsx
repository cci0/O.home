'use client';
// 세계관 수정 (관리자 전용)
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useWorldList, worldPath } from '@/lib/worldStore';
import { WorldForm } from '@/components/worlds/WorldForm';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

export default function WorldEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { list, loaded, save } = useWorldList();
  if (!loaded) return <section className="page" />;
  const w = list.find(x => x.id === id);
  if (!isAdmin || !w) return <section className="page"><div className="page-head"><PageTitle>EDIT WORLD</PageTitle><p>{w ? '관리자 전용' : '세계관을 찾을 수 없습니다'}</p></div></section>;
  return (
    <section className="page">
      <div className="page-head"><PageTitle>EDIT WORLD</PageTitle></div>
      <WorldForm initial={w} onCancel={() => router.push(worldPath(w))}
        onSave={async nw => { await save(list.map(x => (x.id === w.id ? nw : x))); toast('저장되었습니다'); router.push(worldPath(nw)); }} />
    </section>
  );
}
