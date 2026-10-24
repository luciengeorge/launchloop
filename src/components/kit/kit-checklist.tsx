"use client";

import { Check, ChevronDown, ChevronRight, Clock, Lock, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { cn } from "cn";
import { StartLink } from "@/components/start-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IMAGE_VARIANTS, kitImageUrl } from "@/lib/image-variants";
import { charLength, xLength } from "@/lib/limits";
import { PIPELINE_STAGES, TASK_GROUPS, currentStageIndex, type KitTask, type TaskGroup } from "@/lib/tasks";
import { Confetti } from "./confetti";

/** A filled primary button whose orange is darkened toward the text colour, so its white label is 4.5:1 or better (WCAG AA), hovered too. The plain primary is 3.6:1. */
const PRIMARY_FILL = "bg-[color-mix(in_oklch,var(--primary),var(--foreground)_25%)] hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_35%)]";

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
  const [celebratePct, setCelebratePct] = useState(false);
  const prevPercent = useRef(0);
  const [activeStage, setActiveStage] = useState<TaskGroup>(() => TASK_GROUPS[currentStageIndex(tasks, new Set(initialDone))] ?? "Brief");
  const [manualStage, setManualStage] = useState(false);

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

  useEffect(() => {
    if (percent > prevPercent.current && prevPercent.current > 0) {
      setCelebratePct(true);
      const t = setTimeout(() => setCelebratePct(false), 900);
      prevPercent.current = percent;
      return () => clearTimeout(t);
    }
    prevPercent.current = percent;
  }, [percent]);

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
        // Advance when finishing the last task of this stage
        if (stageComplete(tasks, next, task.group)) {
          const idx = TASK_GROUPS.indexOf(task.group);
          const nextStage = TASK_GROUPS[idx + 1];
          if (nextStage) {
            setActiveStage(nextStage);
            setManualStage(false);
            toast.message(`${task.group} done. On to ${nextStage}`);
          }
        } else if (!manualStage) {
          setActiveStage(TASK_GROUPS[currentStageIndex(tasks, next)] ?? task.group);
        }
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
    [countable, done, kitId, locked, manualStage, persist, productName, tasks, total],
  );

  const openStage = (stage: TaskGroup) => {
    setActiveStage(stage);
    setManualStage(true);
  };

  return (
    <div className="space-y-6" data-testid="launch-pipeline">
      <Confetti fire={confetti} />
      <ProgressHero percent={percent} completed={completed} total={total} locked={locked} persist={persist} celebrate={celebratePct} />
      {percent === 100 && !locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800" role="status" data-testid="all-done">
          <PartyPopper className="size-4" aria-hidden="true" /> Every step done. Go launch {productName}!
        </p>
      ) : null}

      <StageTrack
        tasks={tasks}
        done={done}
        active={activeStage}
        onSelect={openStage}
      />

      {PIPELINE_STAGES.map((stage) => {
        const items = tasks.filter((t) => t.group === stage.id);
        if (!items.length) return null;
        const countableItems = items.filter((t) => !t.pending);
        const groupDone = countableItems.filter((t) => done.has(t.id)).length;
        const complete = countableItems.length > 0 && groupDone === countableItems.length;
        const isActive = activeStage === stage.id;
        const isUpcoming = TASK_GROUPS.indexOf(stage.id) > TASK_GROUPS.indexOf(activeStage) && !complete;

        if (!isActive) {
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => openStage(stage.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                complete ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-border bg-card hover:border-primary/40"
              } ${isUpcoming && locked ? "opacity-70" : ""}`}
              data-testid={`stage-summary-${stage.id}`}
              data-stage={stage.id}
              data-state={complete ? "done" : isUpcoming ? "upcoming" : "collapsed"}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {complete ? (
                  <Check className="size-4 text-emerald-600" aria-hidden="true" />
                ) : groupDone > 0 ? (
                  <Clock className="size-4 text-amber-600" aria-hidden="true" />
                ) : null}
                {stage.label}
                <span className="font-mono text-xs text-muted-foreground">
                  {locked && !complete ? "Preview" : `${groupDone}/${countableItems.length}`}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          );
        }

        return (
          <section key={stage.id} aria-label={stage.label} className="space-y-4" data-testid={`stage-${stage.id}`} data-stage={stage.id} data-state="current">
            <h3 className="flex items-baseline justify-between text-base font-semibold tracking-tight">
              {stage.label}
              {!locked ? (
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  {groupDone}/{countableItems.length} done
                </span>
              ) : null}
            </h3>
            <ul className="space-y-4">
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

function stageComplete(tasks: KitTask[], done: Set<string>, group: TaskGroup): boolean {
  const items = tasks.filter((t) => t.group === group && !t.pending);
  return items.length > 0 && items.every((t) => done.has(t.id));
}

function StageTrack({
  tasks,
  done,
  active,
  onSelect,
}: {
  tasks: KitTask[];
  done: Set<string>;
  active: TaskGroup;
  onSelect: (s: TaskGroup) => void;
}) {
  return (
    <nav aria-label="Launch stages" data-testid="stage-track">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 pb-1">
        {PIPELINE_STAGES.map((stage, i) => {
          const items = tasks.filter((t) => t.group === stage.id && !t.pending);
          if (!items.length && !tasks.some((t) => t.group === stage.id)) return null;
          const doneCount = items.filter((t) => done.has(t.id)).length;
          const complete = items.length > 0 && doneCount === items.length;
          const partial = doneCount > 0 && !complete;
          const current = active === stage.id;
          const state = complete ? "done" : current ? "current" : partial ? "partial" : "upcoming";
          return (
            <li key={stage.id} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="size-4 shrink-0 text-primary sm:mx-0.5" strokeWidth={2.5} aria-hidden="true" /> : null}
              <button
                type="button"
                onClick={() => onSelect(stage.id)}
                data-testid={`stage-tab-${stage.id}`}
                data-state={state}
                data-partial={partial || undefined}
                aria-current={current ? "step" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  state === "current"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : state === "done"
                      ? "bg-emerald-500/15 text-emerald-800"
                      : state === "partial"
                        ? "bg-amber-400/25 text-amber-800 hover:bg-amber-400/35"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {complete ? <Check className="mr-1 inline size-3" aria-hidden="true" /> : null}
                {partial ? <Clock className="mr-1 inline size-3" aria-hidden="true" /> : null}
                {stage.label}
                {complete ? <span className="sr-only"> (done)</span> : partial ? <span className="sr-only"> (in progress)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProgressHero({
  percent,
  completed,
  total,
  locked,
  persist,
  celebrate,
}: {
  percent: number;
  completed: number;
  total: number;
  locked: boolean;
  persist: "server" | "local";
  celebrate: boolean;
}) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8 ${
        celebrate ? "ring-2 ring-primary/40 motion-reduce:ring-0" : ""
      }`}
      data-testid="progress-hero"
    >
      <div
        className={`relative size-32 shrink-0 sm:size-36 ${celebrate ? "scale-105 motion-reduce:scale-100" : ""} transition-transform duration-500 motion-reduce:transition-none`}
        role="progressbar"
        aria-label="Launch checklist progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        data-testid="progress"
      >
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - percent / 100)}
            className="text-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{percent}%</span>
        </span>
      </div>
      <div className="text-center sm:text-left">
        <p className="text-lg font-semibold tracking-tight sm:text-xl">
          {locked ? "Your launch pipeline" : `${completed} of ${total} done`}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {locked
            ? `${total} steps across Brief → Launch day. Unlock to start ticking them off.`
            : persist === "server"
              ? "Work one stage at a time. Progress saves to your account."
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
  const src = task.image ? kitImageUrl(kitId, task.image, !kitLocked) : null;

  return (
    <li
      className={`rounded-2xl border bg-card transition-colors ${done ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border"}`}
      data-testid="task"
      data-task-id={task.id}
      data-locked={task.locked}
      data-done={done}
    >
      <div className="flex items-start gap-4 px-5 py-4">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={kitLocked ? `${task.title} (locked)` : `Mark “${task.title}” done`}
          disabled={kitLocked || task.locked}
          onClick={onToggle}
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all motion-reduce:transition-none ${
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-primary"
          } ${pop ? "scale-125 motion-reduce:scale-100" : "scale-100"} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {kitLocked || task.locked ? <Lock className="size-4 text-muted-foreground" aria-hidden="true" /> : done ? <Check className="size-5" aria-hidden="true" /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className={`text-base font-medium ${done ? "text-muted-foreground line-through decoration-emerald-500/60" : ""}`}>{task.title}</h4>
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
            <div className="flex flex-wrap items-center gap-2">
              {task.text !== undefined && !task.locked ? <CopyButton text={task.text} /> : null}
              {src && image && !task.locked ? (
                <a href={src} download={image.file} className="text-xs font-medium underline underline-offset-4">
                  Download
                </a>
              ) : null}
              {!kitLocked && !task.locked ? (
                <Button type="button" variant={done ? "outline" : "default"} size="sm" onClick={onToggle} data-testid="mark-done">
                  {done ? "Undo" : "Mark done"}
                </Button>
              ) : null}
            </div>
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
          {task.cta && !task.locked ? (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="task-cta">
              <p className="text-sm">{task.cta.text}</p>
              <StartLink className={cn(buttonVariants(), "h-11 shrink-0 px-4", PRIMARY_FILL)}>{task.cta.label}</StartLink>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
