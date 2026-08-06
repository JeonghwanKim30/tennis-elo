"use client";

import { useState, useTransition } from "react";
import { PencilIcon } from "@/components/icons";
import { updateBioAction } from "./actions";

const MAX_BIO_LENGTH = 30;

// 자기소개 카드 — 평소에는 텍스트 + 연필 아이콘만 보이고, 연필을 누르면 같은
// 카드 안에서 바로 textarea로 바뀌는 인라인 편집. 페이지 이동이나 모달 없이
// 빠르게 30자 이내 소개 문구를 남길 수 있게 한다.
export function BioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setDraft(bio);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateBioAction(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBio(draft.trim());
      setEditing(false);
    });
  }

  return (
    <div className="surface-card relative p-4 shadow-sm">
      {!editing && (
        <button
          type="button"
          onClick={startEdit}
          aria-label="자기소개 수정"
          className="btn-press touch-target absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      )}

      {editing ? (
        <div className="space-y-2 pr-8">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_BIO_LENGTH))}
            maxLength={MAX_BIO_LENGTH}
            rows={2}
            autoFocus
            placeholder="나를 소개하는 한마디를 남겨보세요"
            className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_BIO_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                className="btn-press touch-target rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground/70"
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="btn-press touch-target rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {pending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="pr-8 text-sm text-foreground/90">
          {bio || <span className="text-muted-foreground">자기소개를 입력해보세요.</span>}
        </p>
      )}
    </div>
  );
}
