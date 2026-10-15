"use client";

import { Check, Lock, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { IMAGE_VARIANTS } from "@/lib/image-variants";
import { charLength, xLength } from "@/lib/limits";
import { TASK_GROUPS, type KitTask } from "@/lib/tasks";
import { Confetti } from "./confetti";

interface Props {
  kitId: string;
  productName: string;
  tasks: KitTask[];
  locked: boolean;
  /** "server" saves to the account; "local" keeps progress in this browser only. */
  persist: "server" | "local";
  initialDone: string[];
}

const localKey = (kitId: string) => `launchloop:progress:${kitId}`;
const CHEERS = ["Nice one.", "Ticked off.", "Momentum.", "One step closer to launch.", "Keep going."];

export function KitChecklist({ kitId, productName, tasks, locked, persist, initialDone }: Props) {
  const countable = useMemo(() => tasks.filter((t) => !t.pending), [tasks]);
  const [done, setDone] = useState<Set<string>>(() => new Set(initialDone));
  const [confetti, setConfetti] = useState(0);
  const [justTicked, setJustTicked] = useState<string | null>(null);

  useEffect(() => {
    if (persist !== "local" || locked) return;
    try {
      const saved = JSON.parse(localStorage.getItem(localKey(kitId)) ?? "[]") as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      if (saved.length) setDone(new Set(saved));
    } catch {
      // Ignore unreadable storage.
    }
  }, [kitId, persist, locked]);

  const total = countable.length;
  const completed = countable.filter((t) => done.has(t.id)).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const toggle = useCallback(
    async (task: KitTask) => {
      if (locked || task.pending) return;
      const nextDone = !done.has(task.id);
      const next = new Set(done);
      if (nextDone) next.add(task.id);
      else next.delete(task.id);
      setDone(next);
      if (nextDone) {
        setJustTicked(task.id);
        setTimeout(() => setJustTicked((id) => (id === task.id ? null : id)), 700);
        const nextCompleted = countable.filter((t) => next.has(t.id)).length;
        if (nextCompleted === total) {
          setConfetti((n) => n + 1);
          toast.success(`${productName} is ready to launch. Every step done!`);
        } else if (nextCompleted % 5 === 0) toast(CHEERS[(nextCompleted / 5) % CHEERS.length]);
      }
      if (persist === "local") {
        try {
          localStorage.setItem(localKey(kitId), JSON.stringify([...next]));
        } catch {
          // Storage full or blocked; progress still shows for this visit.
        }
        return;
      }
      try {
        const res = await fetch(`/api/kits/${kitId}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, done: nextDone }) });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Couldn't save that tick. Check your connection.");
        setDone(done);
      }
    },
    [countable, done, kitId, locked, persist, productName, total],
  );

  return (
    <div className="space-y-6">
      <Confetti fire={confetti} />
      <ProgressHeader percent={percent} completed={completed} total={total} locked={locked} persist={persist} />
      {percent === 100 && !locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800" role="status" data-testid="all-done">
          <PartyPopper className="size-4" aria-hidden="true" /> Every step done. Go launch {productName}!
        </p>
      ) : null}
      {TASK_GROUPS.map((group) => {
        const items = tasks.filter((t) => t.group === group);
        if (!items.length) return null;
        const groupDone = items.filter((t) => done.has(t.id)).length;
        return (
          <section key={group} aria-label={group} className="space-y-3" data-testid={`group-${group}`}>
            <h3 className="flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
              {!locked ? (
                <span className="font-mono text-xs normal-case">
                  {groupDone}/{items.filter((t) => !t.pending).length}
                </span>
              ) : null}
            </h3>
            <ul className="space-y-3">
              {items.map((task) => (
                <TaskRow key={task.id} kitId={kitId} task={task} done={done.has(task.id)} pop={justTicked === task.id} onToggle={() => void toggle(task)} kitLocked={locked} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ProgressHeader({ percent, completed, total, locked, persist }: { percent: number; completed: number; total: number; locked: boolean; persist: "server" | "local" }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="relative size-14 shrink-0" role="progressbar" aria-label="Launch checklist progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} data-testid="progress">
        <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - percent / 100)}
            className="text-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold">{percent}%</span>
      </div>
      <div className="text-sm">
        <p className="font-medium">{locked ? "Your launch checklist" : `${completed} of ${total} launch steps done`}</p>
        <p className="text-muted-foreground">
          {locked
            ? `${total} steps, from landing copy to launch day. Unlock to start ticking them off.`
            : persist === "server"
              ? "Copy each asset, use it, tick it off. Progress saves to your account."
              : "Progress is saved in this browser. Log in to keep it on your account."}
        </p>
      </div>
    </div>
  );
}

function TaskRow({ kitId, task, done, pop, onToggle, kitLocked }: { kitId: string; task: KitTask; done: boolean; pop: boolean; onToggle: () => void; kitLocked: boolean }) {
  if (task.pending) {
    return (
      <li className="rounded-xl border border-dashed border-border bg-card p-4" data-testid="task-pending" aria-busy="true">
        <p className="text-sm font-medium">{task.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Writing this section…</p>
        <Skeleton className="mt-3 h-12 w-full" />
      </li>
    );
  }
  const length = task.text === undefined ? 0 : task.measure === "x" ? xLength(task.text) : charLength(task.text);
  const within = task.limit === undefined || length <= task.limit;
  const image = task.image ? IMAGE_VARIANTS[task.image] : null;
  const src = task.image ? `/api/og/${kitId}/${task.image}` : null;

  return (
    <li
      className={`rounded-xl border bg-card transition-colors ${done ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border"}`}
      data-testid="task"
      data-task-id={task.id}
      data-locked={task.locked}
      data-done={done}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={kitLocked ? `${task.title} (locked)` : `Mark “${task.title}” done`}
          disabled={kitLocked}
          onClick={onToggle}
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all motion-reduce:transition-none ${
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-primary"
          } ${pop ? "scale-125 motion-reduce:scale-100" : "scale-100"} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {kitLocked ? <Lock className="size-3 text-muted-foreground" aria-hidden="true" /> : done ? <Check className="size-3.5" aria-hidden="true" /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-medium ${done ? "text-muted-foreground line-through decoration-emerald-500/60" : ""}`}>{task.title}</h4>
              {task.limit !== undefined && !task.locked ? (
                <span
                  data-testid="char-count"
                  data-within={within}
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${within ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}
                  title={task.measure === "x" ? "Counted the way X counts (links = 23)" : "Characters"}
                >
                  {length}/{task.limit}
                </span>
              ) : null}
            </div>
            {task.text !== undefined && !task.locked ? <CopyButton text={task.text} /> : null}
            {src && image && !task.locked ? (
              <a href={src} download={image.file} className="text-xs font-medium underline underline-offset-4">
                Download
              </a>
            ) : null}
          </div>
          {task.text !== undefined ? (
            task.locked ? (
              <div className="relative mt-2 overflow-hidden rounded-md" data-testid="locked-text">
                <p aria-hidden="true" className="select-none whitespace-pre-wrap text-sm leading-relaxed blur-[5px]">
                  {task.text}
                </p>
                <span className="sr-only">Locked. Unlock the kit to read this.</span>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" data-testid="task-text">
                {task.text}
              </p>
            )
          ) : null}
          {src && image ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic PNG from our own route
            <img src={src} alt={`${image.label}${task.locked ? " (watermarked preview)" : ""}`} width={image.width} height={image.height} loading="lazy" className="mt-3 h-auto w-full max-w-md rounded-lg border border-border" />
          ) : null}
          {task.hint && !task.locked ? <p className="mt-2 text-xs text-muted-foreground">{task.hint}</p> : null}
        </div>
      </div>
    </li>
  );
}
