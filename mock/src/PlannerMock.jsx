import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  CircleCheck,
  Clock3,
  Flag,
  GitBranch,
  GitPullRequest,
  GripVertical,
  Inbox,
  Layers,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Undo2,
  Video,
  X,
} from 'lucide-react';
import {
  TODAY,
  TOMORROW,
  MEETINGS,
  STATUS,
  duration,
  shortDuration,
  shortDate,
  capacity,
  moveTask,
  goalProgress,
  conflicts,
  timeOf,
  minutesOf,
  shiftDate,
  shiftMonth,
  weekDays,
  monthPeriod,
  missedPlans,
  goalHealth,
  goalsForMonth,
  initialPlannerState,
  restorePlannerState,
  reviewTasks,
  SPRINTS,
} from './planner-model.js';
import './planner.css';
const VIEWS = [
  ['today', '오늘', Sun],
  ['week', '이번 주', CalendarDays],
  ['month', '이번 달', Target],
  ['sprint', '스프린트', Layers],
];
const STORE = 'worklane-planner-v4';
const isOpen = (t) => t?.status !== 'done';
const Icon = ({ icon: I, size = 16, ...rest }) => (
  <I size={size} strokeWidth={1.7} aria-hidden="true" {...rest} />
);
const Source = ({ task }) => (
  <span
    className={`source ${task.source === 'Jira' ? 'jira' : task.source === 'GitLab' ? 'gitlab' : 'personal'}`}
  >
    <Icon
      icon={
        task.source === 'GitLab'
          ? GitPullRequest
          : task.source === 'Jira'
            ? Layers
            : ListTodo
      }
      size={12}
    />
    {task.id}
  </span>
);
function readState() {
  try {
    return restorePlannerState(JSON.parse(localStorage.getItem(STORE)));
  } catch {
    return initialPlannerState();
  }
}
export default function PlannerMock({
  onOpenWiki,
  initialFilter = 'all',
  initialBacklog = false,
}) {
  const [data, setData] = useState(readState);
  const tasks = data.tasks.filter((t) => !t.archived);
  const archived = data.tasks.filter((t) => t.archived);
  const goals = data.goals;
  const mainRef = useRef(null);
  const [view, setView] = useState(() =>
    VIEWS.some((v) => v[0] === new URLSearchParams(location.search).get('view'))
      ? new URLSearchParams(location.search).get('view')
      : 'today',
  );
  const [day, setDay] = useState(data.focusDate || TODAY),
    [collapsed, setCollapsed] = useState(false),
    [selected, setSelected] = useState(null),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [backlog, setBacklog] = useState(initialBacklog),
    [doneVisible, setDoneVisible] = useState(false),
    [goal, setGoal] = useState(null),
    [sprint, setSprint] = useState('24'),
    [filter, setFilter] = useState(initialFilter || 'all'),
    [search, setSearch] = useState(''),
    [searchIndex, setSearchIndex] = useState(0),
    [draft, setDraft] = useState(''),
    [newDate, setNewDate] = useState(TODAY),
    [newMinutes, setNewMinutes] = useState(30),
    [newGoal, setNewGoal] = useState(''),
    [newSprint, setNewSprint] = useState(''),
    [goalDraft, setGoalDraft] = useState(null),
    [saved, setSaved] = useState(true);
  const detail = tasks.find((t) => t.id === selected);
  const daily = tasks.filter((t) => t.date === day);
  const dailyGoal = goals.find((g) => daily.some((t) => t.goal === g.id));
  const open = daily.filter(isOpen);
  const done = daily.filter((t) => !isOpen(t));
  const unplanned = tasks.filter((t) => !t.date && isOpen(t));
  const cap = capacity(tasks, day);
  const week = weekDays(day);
  const weekKey = week[0].date;
  const month = monthPeriod(day);
  const missed = missedPlans(tasks);
  const upcomingWeek = week.filter((d) => d.date >= TODAY);
  const weekRemaining = upcomingWeek.reduce(
    (n, d) => n + Math.max(0, capacity(tasks, d.date).remaining),
    0,
  );
  const weekOver = week.filter(
    (d) => capacity(tasks, d.date).remaining < 0,
  ).length;
  const reviewed = reviewTasks(tasks, view, day, sprint);
  const reviewKey =
    view === 'sprint'
      ? `sprint-${sprint}`
      : view === 'month'
        ? day.slice(0, 7)
        : view === 'week'
          ? `week-${weekKey}`
          : day;
  const reviewLabel =
    view === 'today'
      ? `${shortDate(day)} 하루`
      : view === 'week'
        ? `${shortDate(weekKey)} 주간`
        : view === 'month'
          ? `${month.month}월`
          : `Sprint ${sprint}`;
  const addDate =
    view === 'sprint' &&
    (day < SPRINTS[sprint].start || day > SPRINTS[sprint].end)
      ? SPRINTS[sprint].start
      : view === 'week' && day > week[4].date
        ? week[4].date
        : day;
  const results = tasks.filter((t) =>
    (t.title + ' ' + t.id).toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [data]);
  useEffect(() => {
    setData((p) => (p.focusDate === day ? p : { ...p, focusDate: day }));
  }, [day]);
  function notify(text, undo) {
    setToast({ text, undo });
  }
  function update(fn, text) {
    const beforeTasks = data.tasks;
    setData((p) => ({ ...p, tasks: fn(p.tasks) }));
    notify(text || '내 계획을 변경했어요', () =>
      setData((p) => ({ ...p, tasks: beforeTasks })),
    );
  }
  function patch(id, changes, text = `${id} · 변경 내용을 저장했어요`) {
    update(
      (ts) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t)),
      text,
    );
  }
  function move(id, date) {
    update(
      (ts) => moveTask(ts, id, date),
      `${id} · ${date ? shortDate(date) + '에 계획했어요' : '계획함으로 옮겼어요'}`,
    );
  }
  function toggle(t) {
    patch(
      t.id,
      {
        status: t.status === 'done' ? t.previousStatus || 'todo' : 'done',
        previousStatus: t.status === 'done' ? null : t.status,
      },
      `${t.id} · ${t.status === 'done' ? '완료를 취소했어요' : '내 작업을 완료했어요'}`,
    );
  }
  function changeView(v) {
    setView(v);
    requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0 }));
    setSelected(null);
    setFilter('all');
    setGoal(null);
    const url = new URL(location.href);
    url.searchParams.set('view', v);
    history.replaceState(null, '', url);
  }
  function quick(date = addDate, goalId = '') {
    setNewDate(date || '');
    setDraft('');
    setNewMinutes(30);
    setNewGoal(goalId);
    setNewSprint(view === 'sprint' ? sprint : '');
    setModal('create');
  }
  function create(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const item = {
      id: `TODO-${Date.now().toString().slice(-6)}`,
      title: draft.trim(),
      date: newDate || null,
      minutes: Number(newMinutes),
      status: 'todo',
      goal: newGoal || null,
      sourceStatus: null,
      source: '개인',
      sprint: newSprint || null,
      priority: false,
      notes: [],
    };
    update((ts) => [...ts, item], '할 일을 추가했어요');
    setModal(null);
  }
  function editGoal(existing = null) {
    setGoalDraft(
      existing
        ? { ...existing }
        : {
            id: `goal-${Date.now()}`,
            title: '',
            description: '',
            project: 'Personal',
            color: ['green', 'blue', 'purple'][goals.length % 3],
            startDate: month.start,
            due: month.end,
            milestone: '',
          },
    );
    setModal('goal');
  }
  function saveGoal(e) {
    e.preventDefault();
    if (!goalDraft?.title.trim() || goalDraft.due < goalDraft.startDate) return;
    const beforeGoals = data.goals;
    const edited = {
      ...goalDraft,
      title: goalDraft.title.trim(),
      milestone: goalDraft.milestone.trim() || goalDraft.title.trim(),
    };
    setData((p) => ({
      ...p,
      goals: p.goals.some((g) => g.id === edited.id)
        ? p.goals.map((g) => (g.id === edited.id ? edited : g))
        : [...p.goals, edited],
    }));
    setDay(edited.due);
    setGoal(edited.id);
    setModal(null);
    notify('목표를 저장했어요', () =>
      setData((p) => ({ ...p, goals: beforeGoals })),
    );
  }
  useEffect(() => {
    const fn = (e) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        ['k', 'n', 'j'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        if (e.key.toLowerCase() === 'n') quick();
        else setModal(e.key.toLowerCase() === 'k' ? 'search' : 'assistant');
      }
      if (e.key === 'Escape') {
        setModal(null);
        setSelected(null);
        setToast(null);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [day, view, sprint]);
  const common = { toggle, open: setSelected, move, patch };
  const dayLabel =
    day === TODAY
      ? '오늘'
      : day === TOMORROW
        ? '내일'
        : `${shortDate(day)} 계획`;
  const heading = {
    today: '오늘의 업무',
    week: weekKey === weekDays(TODAY)[0].date ? '이번 주 계획' : '주간 계획',
    month:
      day.slice(0, 7) === TODAY.slice(0, 7)
        ? '이번 달의 목표와 계획'
        : '월간 목표와 계획',
    sprint: '스프린트 계획',
  };
  const subheading = {
    today: '중요한 일부터 시작하고, 나머지는 가능한 만큼만.',
    week: '회의를 먼저 확인하고, 할 일을 여유 있는 날에 놓아보세요.',
    month: '목표와 마일스톤을 먼저 정하고, 실행할 일은 주간 계획으로.',
    sprint: '팀의 목표와 내 실행 계획을 한곳에서 이어보세요.',
  };
  return (
    <div className={`planner-app ${collapsed ? 'nav-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">w</span>
          <b>worklane</b>
          <span className="brand-version">BETA</span>
        </div>
        <button className="workspace" onClick={() => setModal('workspace')}>
          <span className="workspace-icon">P</span>
          <span>
            <b>Platform</b>
            <small>나의 워크스페이스</small>
          </span>
          <ChevronsUpDown size={13} />
        </button>
        <button
          className="nav-search"
          onClick={() => {
            setSearch('');
            setModal('search');
          }}
        >
          <Search size={15} />
          <span>빠르게 찾기</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="nav-caption">MY WORKSPACE</span>
        <nav>
          <button
            className={
              !backlog && !['jira', 'review'].includes(filter) ? 'active' : ''
            }
            onClick={() => {
              setBacklog(false);
              changeView('today');
            }}
            title="내 플래너"
          >
            <LayoutDashboard size={17} />
            <span>내 플래너</span>
            <span className="nav-dot" />
          </button>
          <button
            className={backlog ? 'active' : ''}
            onClick={() => {
              setBacklog(!backlog);
              setSelected(null);
            }}
            title="계획함"
          >
            <Inbox size={17} />
            <span>계획함</span>
            <b>{unplanned.length}</b>
          </button>
          <button
            className={view === 'sprint' && filter === 'jira' ? 'active' : ''}
            onClick={() => {
              setBacklog(false);
              changeView('sprint');
              setFilter('jira');
            }}
            title="Jira 업무"
          >
            <Layers size={17} />
            <span>Jira 업무</span>
          </button>
          <button
            className={view === 'sprint' && filter === 'review' ? 'active' : ''}
            onClick={() => {
              setBacklog(false);
              changeView('sprint');
              setFilter('review');
            }}
            title="코드 리뷰"
          >
            <GitPullRequest size={17} />
            <span>코드 리뷰</span>
            <b>
              {tasks.filter((t) => t.source === 'GitLab' && isOpen(t)).length}
            </b>
          </button>
          <button
            onClick={() => (onOpenWiki ? onOpenWiki() : setModal('docs'))}
            title="위키"
          >
            <BookOpen size={17} />
            <span>위키</span>
          </button>
        </nav>
        <div className="sidebar-goals">
          <span className="nav-caption">연결된 목표</span>
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                changeView('month');
                setDay(g.due);
                setGoal(g.id);
              }}
            >
              <i className={`dot ${g.color}`} />
              <span>{g.project}</span>
              <ChevronRight size={12} />
            </button>
          ))}
        </div>
        <div className="sidebar-note">
          <span>계획은 바뀌어도 괜찮아요.</span>
          <small>중요한 일의 방향만 잃지 않도록.</small>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setModal('settings')} title="플래너 설정">
            <Settings2 size={16} />
            <span>플래너 설정</span>
          </button>
          <div className="profile">
            <span className="avatar">YK</span>
            <span>
              <b>김윤</b>
              <small>Platform engineer</small>
            </span>
            <ChevronDown size={13} />
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div>
            <button
              className="icon-button"
              aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
              onClick={() => setCollapsed(!collapsed)}
            >
              <PanelLeft size={17} />
            </button>
            <i />
            <span>내 워크스페이스</span>
            <ChevronRight size={12} />
            <b>플래너</b>
          </div>
          <div>
            <span className="demo-badge">샘플 워크스페이스</span>
            <button
              className="assistant-trigger"
              onClick={() => setModal('assistant')}
            >
              <Sparkles size={15} />
              Assistant<kbd>⌘ J</kbd>
            </button>
            <span className="avatar small">YK</span>
          </div>
        </header>
        <main ref={mainRef} className="planner-main" data-view={view}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="green-dot" />
                2026년 10월 22일 목요일 · WEEK 43
              </div>
              <h1>
                {view === 'today' && day !== TODAY
                  ? day === TOMORROW
                    ? '내일의 업무'
                    : `${shortDate(day)} 업무 계획`
                  : heading[view]}
              </h1>
              <p>{subheading[view]}</p>
            </div>
            <div className="heading-actions">
              <button className="button" onClick={() => setModal('wrap')}>
                <CheckCheck size={15} />
                {view === 'today'
                  ? '하루 마무리'
                  : view === 'week'
                    ? '주간 마무리'
                    : view === 'month'
                      ? '월간 마무리'
                      : '스프린트 회고'}
              </button>
              <button className="button primary" onClick={() => quick()}>
                <Plus size={16} />할 일 추가<kbd>⌘ N</kbd>
              </button>
            </div>
          </div>
          <div className="viewbar">
            <nav aria-label="계획 기간">
              {VIEWS.map(([id, label, I]) => (
                <button
                  key={id}
                  className={view === id ? 'selected' : ''}
                  aria-pressed={view === id}
                  onClick={() => changeView(id)}
                >
                  <I size={16} />
                  {id === 'today' && day !== TODAY
                    ? '일간'
                    : id === 'week' && weekKey !== weekDays(TODAY)[0].date
                      ? '주간'
                      : id === 'month' && day.slice(0, 7) !== TODAY.slice(0, 7)
                        ? '월간'
                        : label}
                  {id === 'today' && (
                    <span>
                      {tasks.filter((t) => t.date === day && isOpen(t)).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="viewbar-end">
              <span className="avatar tiny">YK</span>
              <span>내 업무</span>
              <i />
              <button
                onClick={() => {
                  setBacklog(!backlog);
                  setSelected(null);
                }}
                aria-pressed={backlog}
              >
                <Inbox size={15} />
                계획함<span>{unplanned.length}</span>
              </button>
            </div>
          </div>
          <div
            className={`planning-layout ${detail || backlog ? 'with-side' : ''}`}
          >
            <div className="planning-canvas">
              {view === 'today' && (
                <>
                  <div className="day-overview">
                    <div>
                      <h2>
                        {dayLabel}{' '}
                        <span>
                          {shortDate(day)} ·{' '}
                          {
                            ['일', '월', '화', '수', '목', '금', '토'][
                              new Date(day + 'T12:00:00').getDay()
                            ]
                          }
                          요일
                        </span>
                      </h2>
                      <div className="date-step">
                        <button
                          aria-label="전날 보기"
                          onClick={() => setDay(shiftDate(day, -1))}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button onClick={() => setDay(TODAY)}>오늘</button>
                        <button
                          aria-label="다음 날 보기"
                          onClick={() => setDay(shiftDate(day, 1))}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                    <Capacity cap={cap} large />
                    <p className="capacity-note">
                      {cap.available === 0
                        ? '휴일 · 업무 시간 미배정'
                        : `회의 ${duration(cap.meetings)} · 여유 시간 1시간 확보`}{' '}
                      <span>
                        {done.length}/{daily.length}개 완료
                      </span>
                    </p>
                  </div>
                  {missed.length > 0 && day >= TODAY && (
                    <details className="week-carryover daily-carryover">
                      <summary>
                        지난 계획에서 남은 일 {missed.length}개 ·{' '}
                        {duration(missed.reduce((n, t) => n + t.minutes, 0))}{' '}
                        <span>날짜 다시 잡기</span>
                      </summary>
                      <Carryover
                        tasks={tasks}
                        missed={missed}
                        target={day}
                        open={setSelected}
                        move={move}
                      />
                    </details>
                  )}
                  <div className="daily-layout">
                    <section className="daily-tasks">
                      <div className="section-title">
                        <h3>
                          먼저 끝내고 싶은 일{' '}
                          <span>{open.filter((t) => t.priority).length}</span>
                        </h3>
                        <span className="muted">오늘의 우선순위</span>
                      </div>
                      {open
                        .filter((t) => t.priority)
                        .map((t) => (
                          <TaskRow key={t.id} task={t} {...common} />
                        ))}
                      <div className="section-title secondary-title">
                        <h3>
                          이어서 할 일{' '}
                          <span>{open.filter((t) => !t.priority).length}</span>
                        </h3>
                        <button
                          className="text-button"
                          onClick={() => setBacklog(!backlog)}
                        >
                          계획함에서 가져오기
                          <Plus size={12} />
                        </button>
                      </div>
                      {open
                        .filter((t) => !t.priority)
                        .map((t) => (
                          <TaskRow key={t.id} task={t} {...common} />
                        ))}
                      {!open.length && (
                        <div className="empty-state">
                          <CircleCheck size={26} />
                          <b>
                            {daily.length
                              ? '계획한 일을 모두 마쳤어요.'
                              : '아직 계획한 일이 없어요.'}
                          </b>
                          <button
                            className="text-button"
                            onClick={() => setModal('wrap')}
                          >
                            하루 돌아보기
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                      <button className="inline-add" onClick={() => quick()}>
                        <Plus size={16} />할 일을 입력하거나, 생각을 가볍게
                        남기세요.<kbd>⌘ N</kbd>
                      </button>
                      <button
                        className="completed-control"
                        aria-expanded={doneVisible}
                        onClick={() => setDoneVisible(!doneVisible)}
                      >
                        <ChevronRight
                          size={13}
                          className={doneVisible ? 'rotate' : ''}
                        />
                        <CheckCheck size={14} />
                        완료한 일 {done.length}개
                      </button>
                      {doneVisible &&
                        done.map((t) => (
                          <TaskRow key={t.id} task={t} {...common} />
                        ))}
                      {day === TODAY && (
                        <div className="brief">
                          <div className="brief-icon">
                            <Sparkles size={17} />
                          </div>
                          <div>
                            <h3>미리 챙겨두면 좋은 일</h3>
                            <p>
                              {tasks.find((t) => t.id === 'PAY-291')?.date ===
                              day
                                ? '환불 웹훅 검증을 오늘 계획에 담았어요.'
                                : '환불 웹훅 검증이 내일 마감이에요.'}{' '}
                              {isOpen(tasks.find((t) => t.id === 'OPS-91'))
                                ? '막힌 일은 접근 권한부터 확인해보세요.'
                                : ''}
                            </p>
                            <button onClick={() => setSelected('PAY-291')}>
                              PAY-291 확인
                              <ArrowUpRight size={12} />
                            </button>
                            <button onClick={() => setSelected('OPS-91')}>
                              막힌 일 살펴보기
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                      {dailyGoal && (
                        <div className="connected-goal">
                          <Target size={17} />
                          <div>
                            <span>이 날의 일이 이어지는 목표</span>
                            <button
                              onClick={() => {
                                changeView('month');
                                setGoal(dailyGoal.id);
                              }}
                            >
                              {dailyGoal.title}
                              <ArrowUpRight size={12} />
                            </button>
                          </div>
                          <Progress tasks={tasks} goal={dailyGoal.id} />
                        </div>
                      )}
                    </section>
                    <aside className="day-agenda">
                      <div className="section-title">
                        <h3>
                          <CalendarDays size={16} />
                          하루의 흐름
                        </h3>
                        <span className="muted">일정 + 할 일</span>
                      </div>
                      <Agenda
                        day={day}
                        tasks={tasks}
                        open={setSelected}
                        quick={quick}
                      />
                      <div className="agenda-foot">
                        <span>
                          <i className="legend meeting" />
                          회의
                        </span>
                        <span>
                          <i className="legend work" />
                          집중할 일
                        </span>
                        <span>
                          <i className="legend space" />
                          여유
                        </span>
                      </div>
                      <p className="agenda-hint">
                        시간이 정해진 일만 표시해요.
                        <br />할 일을 눌러 시간을 배정할 수 있어요.
                      </p>
                    </aside>
                  </div>
                </>
              )}
              {view === 'week' && (
                <>
                  <div className="section-top">
                    <div>
                      <div className="period-controls">
                        <h2>
                          {shortDate(week[0].date)} – {shortDate(week[4].date)}{' '}
                          <span>{weekKey.slice(0, 4)}년</span>
                        </h2>
                        <PeriodNav
                          label="주"
                          previous={() => setDay(shiftDate(day, -7))}
                          next={() => setDay(shiftDate(day, 7))}
                          reset={() => setDay(TODAY)}
                        />
                      </div>
                      <label className="week-focus">
                        이번 주의 방향
                        <input
                          aria-label="이번 주의 방향"
                          placeholder="이번 주에 꼭 이루고 싶은 한 가지"
                          value={data.weekFocus[weekKey] || ''}
                          onChange={(e) =>
                            setData((p) => ({
                              ...p,
                              weekFocus: {
                                ...p.weekFocus,
                                [weekKey]: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                      <p className="week-capacity">
                        {upcomingWeek.length
                          ? `오늘부터 남은 ${upcomingWeek.length}일 · 추가 배치 가능 ${duration(weekRemaining)}`
                          : '지난 주의 계획과 완료 기록'}
                        {weekOver > 0 && (
                          <span className="amber-text">
                            {' '}
                            · {weekOver}일 계획 초과
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setBacklog(!backlog)}
                    >
                      <Inbox size={15} />
                      미계획 {unplanned.length}개 배치
                    </button>
                  </div>
                  {missed.length > 0 && week[4].date >= TODAY && (
                    <details className="week-carryover">
                      <summary>
                        지난 계획에 미완료 {missed.length}개 · 다시 배치하기
                      </summary>
                      <Carryover
                        tasks={tasks}
                        missed={missed}
                        target={day < TODAY ? TODAY : day}
                        open={setSelected}
                        move={move}
                      />
                    </details>
                  )}
                  <div
                    className="week-grid"
                    style={{
                      gridTemplateColumns: week
                        .map(
                          (d) => `minmax(0, ${d.date < TODAY ? 0.8 : 1.3}fr)`,
                        )
                        .join(' '),
                    }}
                  >
                    {week.map((d) => {
                      const ts = tasks.filter((t) => t.date === d.date);
                      const c = capacity(tasks, d.date);
                      return (
                        <section
                          className={`week-day ${d.date === TODAY ? 'is-today' : ''}`}
                          key={d.date}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData('text/plain');
                            if (tasks.some((t) => t.id === id))
                              move(id, d.date);
                          }}
                        >
                          <header>
                            <div>
                              <h3>
                                <button
                                  className="day-open"
                                  aria-label={`${shortDate(d.date)} 일간 계획 열기`}
                                  onClick={() => {
                                    setDay(d.date);
                                    changeView('today');
                                  }}
                                >
                                  {d.label} <b>{d.day}</b>
                                </button>
                                <small>{ts.filter(isOpen).length}개</small>
                                {d.date === TODAY && <span>오늘</span>}
                              </h3>
                              <button
                                className="icon-button"
                                aria-label={`${d.label}요일 할 일 추가`}
                                onClick={() => quick(d.date)}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <Capacity cap={c} />
                          </header>
                          <div className="week-meetings">
                            {MEETINGS.filter((m) => m.date === d.date).map(
                              (m) => (
                                <div key={m.time}>
                                  <Video size={12} />
                                  <span>
                                    <b>{m.time}</b>
                                    {m.title}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                          <WeekTaskList>
                            {ts.filter(isOpen).map((t) => (
                              <TaskCard key={t.id} task={t} {...common} />
                            ))}
                            {ts.some((t) => !isOpen(t)) && (
                              <details className="week-completed">
                                <summary>
                                  완료한 일{' '}
                                  {ts.filter((t) => !isOpen(t)).length}개
                                </summary>
                                {ts
                                  .filter((t) => !isOpen(t))
                                  .map((t) => (
                                    <button
                                      key={t.id}
                                      onClick={() => setSelected(t.id)}
                                    >
                                      <CheckCheck size={12} />
                                      <span>{t.title}</span>
                                    </button>
                                  ))}
                              </details>
                            )}
                            <button
                              className="week-add"
                              onClick={() => quick(d.date)}
                            >
                              <Plus size={14} />할 일 추가
                            </button>
                          </WeekTaskList>
                          <footer>
                            {c.remaining >= 0
                              ? `${duration(c.remaining)} 여유`
                              : `${duration(-c.remaining)} 초과`}
                            <span>
                              {ts.filter((t) => !isOpen(t)).length}/{ts.length}{' '}
                              완료
                            </span>
                          </footer>
                        </section>
                      );
                    })}
                  </div>
                  <div className="week-footer">
                    <GripVertical size={15} />할 일을 다른 요일로 끌어 놓으세요.
                    <span>카드를 열어 날짜를 직접 선택할 수도 있어요.</span>
                    <button
                      className="text-button"
                      onClick={() => setModal('wrap')}
                    >
                      이 주 돌아보기
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="week-goals">
                    <h3>이 주의 일이 향하는 곳</h3>
                    {goals.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          changeView('month');
                          setGoal(g.id);
                        }}
                      >
                        <i className={`dot ${g.color}`} />
                        <span>{g.title}</span>
                        <Progress tasks={tasks} goal={g.id} />
                        <ArrowUpRight size={13} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {view === 'month' && (
                <Month
                  tasks={tasks}
                  goal={goal}
                  setGoal={setGoal}
                  open={setSelected}
                  changeView={changeView}
                  goals={goals}
                  day={day}
                  setDay={setDay}
                  editGoal={editGoal}
                  quick={quick}
                  move={move}
                />
              )}
              {view === 'sprint' && (
                <>
                  <div className="section-top">
                    <div>
                      <div className="sprint-title">
                        <h2>Sprint {sprint}</h2>
                        <span
                          className={`pill ${sprint === '24' ? 'green' : 'blue'}`}
                        >
                          {sprint === '24' ? '진행 중' : '다음 스프린트'}
                        </span>
                        <select
                          aria-label="스프린트 선택"
                          value={sprint}
                          onChange={(e) => setSprint(e.target.value)}
                        >
                          <option value="24">10.19 – 10.30</option>
                          <option value="25">11.02 – 11.13</option>
                        </select>
                      </div>
                      <p>
                        {sprint === '24'
                          ? '결제 재시도 안정화와 주문 API v2의 호환성 검증'
                          : '정기 결제 갱신과 운영 자동화 준비'}
                      </p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setBacklog(!backlog)}
                    >
                      <Plus size={15} />
                      백로그에서 계획
                    </button>
                  </div>
                  <div className="sprint-summary">
                    <Target size={18} />
                    <span>내 진행 상태 · 원본과 별도</span>
                    <b>
                      {
                        tasks.filter(
                          (t) => t.sprint === sprint && t.status === 'done',
                        ).length
                      }{' '}
                      / {tasks.filter((t) => t.sprint === sprint).length} 완료
                    </b>
                    <div className="sprint-progress">
                      <span
                        style={{
                          width: `${(tasks.filter((t) => t.sprint === sprint && t.status === 'done').length / Math.max(1, tasks.filter((t) => t.sprint === sprint).length)) * 100}%`,
                        }}
                      />
                    </div>
                    <button
                      onClick={() =>
                        setFilter(filter === 'blocked' ? 'all' : 'blocked')
                      }
                      aria-pressed={filter === 'blocked'}
                    >
                      <Flag size={14} />
                      막힌 일{' '}
                      {
                        tasks.filter(
                          (t) => t.sprint === sprint && t.status === 'blocked',
                        ).length
                      }
                    </button>
                    <select
                      aria-label="스프린트 업무 필터"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">모든 업무</option>
                      <option value="jira">Jira 업무</option>
                      <option value="review">코드 리뷰</option>
                      <option value="blocked">막힌 일</option>
                    </select>
                  </div>
                  <div className="sprint-board">
                    {['todo', 'progress', 'review', 'done'].map((status) => {
                      const list = tasks.filter(
                        (t) =>
                          t.sprint === sprint &&
                          (status === 'progress'
                            ? ['progress', 'blocked'].includes(t.status)
                            : t.status === status) &&
                          (filter === 'all' ||
                            (filter === 'jira' && t.source === 'Jira') ||
                            (filter === 'review' && t.source === 'GitLab') ||
                            (filter === 'blocked' && t.status === 'blocked')),
                      );
                      return (
                        <section
                          key={status}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData('text/plain');
                            if (tasks.some((t) => t.id === id))
                              patch(
                                id,
                                { status, sprint },
                                `${id} · Sprint ${sprint} · 내 ${STATUS[status]}으로 변경했어요`,
                              );
                          }}
                        >
                          <h3>
                            <span className={`status-dot ${status}`} />
                            {STATUS[status]}
                            <span>{list.length}</span>
                          </h3>
                          {list.map((t) => (
                            <TaskCard
                              task={t}
                              key={t.id}
                              {...common}
                              sprintView
                            />
                          ))}
                          {!list.length && (
                            <p className="board-empty">
                              이 상태의 업무가 없어요.
                            </p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                  <div className="sprint-note">
                    <CircleCheck size={15} />
                    개인 계획 날짜와 팀 스프린트는 따로 관리해요.
                    {sprint === '24' && (
                      <button
                        className="text-button"
                        onClick={() => setModal('rollover')}
                      >
                        남은 일 다음 스프린트로
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            {detail ? (
              <Inspector
                onOpenWiki={onOpenWiki}
                task={detail}
                tasks={tasks}
                goals={goals}
                patch={patch}
                move={move}
                close={() => setSelected(null)}
                toggle={toggle}
                archive={() => {
                  patch(
                    detail.id,
                    { archived: true },
                    `${detail.id} · 보관했어요`,
                  );
                  setSelected(null);
                }}
              />
            ) : backlog ? (
              <aside className="backlog-panel">
                <div className="section-title">
                  <h3>
                    계획함 <span>{unplanned.length}</span>
                  </h3>
                  <button
                    className="icon-button"
                    aria-label="계획함 닫기"
                    onClick={() => setBacklog(false)}
                  >
                    <X size={17} />
                  </button>
                </div>
                <p>
                  아직 날짜를 정하지 않은 일.
                  <br />
                  가용 시간을 보고 배치하세요.
                </p>
                {unplanned.map((t) => (
                  <div className="backlog-item" key={t.id}>
                    <TaskCard task={t} {...common} />
                    <button
                      className="text-button"
                      onClick={() =>
                        view === 'sprint'
                          ? patch(
                              t.id,
                              {
                                sprint,
                                date: addDate,
                                time: t.date === addDate ? t.time : undefined,
                              },
                              `${t.id} · Sprint ${sprint}에 계획했어요`,
                            )
                          : move(t.id, addDate)
                      }
                    >
                      {view === 'sprint'
                        ? `Sprint ${sprint} · ${shortDate(addDate)}에 배치`
                        : `${shortDate(addDate)}에 배치`}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
                {!unplanned.length && (
                  <div className="empty-state">
                    <CircleCheck size={24} />
                    모든 할 일에 자리를 찾았어요.
                  </div>
                )}
                <button className="inline-add" onClick={() => quick(null)}>
                  <Plus size={15} />
                  생각 담아두기
                </button>
              </aside>
            ) : null}
          </div>
        </main>
        <footer className="app-footer">
          <span>
            <i className="green-dot" />
            {saved ? '이 브라우저에 저장됨' : '임시 메모리 · 저장소 사용 불가'}
          </span>
          <button onClick={() => setModal('archive')}>
            보관함{archived.length ? ` ${archived.length}` : ''}
          </button>
          <span>인터랙티브 목업 · 2026.10.22 기준 샘플 데이터</span>
          <button
            onClick={() => {
              const before = data;
              setData(initialPlannerState());
              setDay(TODAY);
              setGoal(null);
              notify('샘플을 처음 상태로 되돌렸어요', () => setData(before));
            }}
          >
            샘플 초기화
          </button>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={16} />
          {toast.text}
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              <Undo2 size={14} />
              되돌리기
            </button>
          )}
          <button aria-label="알림 닫기" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            {
              archive: '보관한 개인 할 일',
              create: '새로운 할 일',
              goal: goals.some((g) => g.id === goalDraft?.id)
                ? '월간 목표 수정'
                : '월간 목표 추가',
              search: '빠르게 찾기',
              wrap: `${reviewLabel} 돌아보기`,
              assistant: '곁에서 챙기는 Assistant',
              settings: '플래너 설정',
              docs: '업무 문서',
              workspace: 'Platform workspace',
              rollover: '다음 스프린트 계획',
            }[modal]
          }
          close={() => setModal(null)}
          wide={modal === 'wrap'}
        >
          {modal === 'archive' && (
            <div className="archived-tasks">
              <p>
                보관한 일은 계획과 업무량에서 빠집니다. 언제든 원래 계획으로
                복원할 수 있어요.
              </p>
              {archived.map((t) => (
                <article key={t.id}>
                  <div>
                    <b>{t.title}</b>
                    <p>
                      {t.id} ·{' '}
                      {t.date ? shortDate(t.date) + ' 계획' : '날짜 미정'}
                    </p>
                  </div>
                  <button
                    className="button"
                    onClick={() =>
                      patch(t.id, { archived: false }, `${t.id} · 복원했어요`)
                    }
                  >
                    복원
                  </button>
                </article>
              ))}
              {!archived.length && (
                <div className="empty-state">보관한 할 일이 없어요.</div>
              )}
            </div>
          )}
          {modal === 'create' && (
            <form onSubmit={create}>
              <input
                className="create-title"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="어떤 일을 해야 하나요?"
                aria-label="할 일 제목"
              />
              <div className="create-fields">
                <label>
                  계획 날짜
                  <input
                    type="date"
                    aria-label="새 할 일 계획 날짜"
                    value={newDate}
                    onInput={(e) => setNewDate(e.target.value)}
                  />
                </label>
                <label>
                  예상 시간
                  <select
                    aria-label="새 할 일 예상 시간"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                  >
                    {[15, 30, 45, 60, 90, 120, 180].map((m) => (
                      <option key={m} value={m}>
                        {duration(m)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="create-fields">
                <label>
                  연결 목표
                  <select
                    aria-label="새 할 일 연결 목표"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                  >
                    <option value="">목표 없이 시작</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  스프린트
                  <select
                    aria-label="새 할 일 스프린트"
                    value={newSprint}
                    onChange={(e) => setNewSprint(e.target.value)}
                  >
                    <option value="">지정 안 함</option>
                    <option value="24">Sprint 24</option>
                    <option value="25">Sprint 25</option>
                  </select>
                </label>
              </div>
              <p className="helper">
                개인 할 일로 생성돼요. 날짜를 비우면 계획함에 보관합니다.
              </p>
              <div className="modal-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  취소
                </button>
                <button className="button primary" disabled={!draft.trim()}>
                  할 일 추가
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}
          {modal === 'goal' && goalDraft && (
            <form onSubmit={saveGoal}>
              <input
                autoFocus
                className="create-title"
                aria-label="목표 제목"
                placeholder="이번 달에 어떤 결과를 만들까요?"
                required
                value={goalDraft.title}
                onChange={(e) =>
                  setGoalDraft({ ...goalDraft, title: e.target.value })
                }
              />
              <label className="goal-form-field">
                성공 기준
                <textarea
                  aria-label="목표 성공 기준"
                  placeholder="이 목표를 마쳤다고 판단할 수 있는 기준"
                  value={goalDraft.description}
                  onChange={(e) =>
                    setGoalDraft({ ...goalDraft, description: e.target.value })
                  }
                />
              </label>
              <div className="create-fields">
                <label>
                  시작일
                  <input
                    type="date"
                    required
                    aria-label="목표 시작일"
                    value={goalDraft.startDate}
                    onInput={(e) =>
                      setGoalDraft({ ...goalDraft, startDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  목표일
                  <input
                    type="date"
                    required
                    min={goalDraft.startDate}
                    aria-label="목표일"
                    value={goalDraft.due}
                    onInput={(e) =>
                      setGoalDraft({ ...goalDraft, due: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="goal-form-field">
                마일스톤
                <input
                  aria-label="목표 마일스톤"
                  placeholder="예: 결제 안정화 릴리스"
                  value={goalDraft.milestone}
                  onChange={(e) =>
                    setGoalDraft({ ...goalDraft, milestone: e.target.value })
                  }
                />
              </label>
              <p className="helper">
                내 월간 목표로 저장됩니다. 연결 업무의 원본 마감은 바뀌지
                않아요.
              </p>
              <div className="modal-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  취소
                </button>
                <button
                  className="button primary"
                  disabled={!goalDraft.title.trim()}
                >
                  목표 저장
                </button>
              </div>
            </form>
          )}
          {modal === 'search' && (
            <>
              <input
                autoFocus
                className="create-title"
                aria-label="태스크 검색"
                placeholder="할 일, Jira 키, 리뷰를 검색하세요"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchIndex((i) => Math.min(i + 1, results.length - 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchIndex((i) => Math.max(0, i - 1));
                  }
                  if (e.key === 'Enter' && results[searchIndex]) {
                    setSelected(results[searchIndex].id);
                    setModal(null);
                  }
                }}
              />
              <div className="search-results">
                {results.map((t, i) => (
                  <button
                    className={i === searchIndex ? 'highlight' : ''}
                    key={t.id}
                    onClick={() => {
                      setSelected(t.id);
                      setModal(null);
                    }}
                  >
                    <Source task={t} />
                    <span>{t.title}</span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
                {!results.length && <p>일치하는 할 일이 없어요.</p>}
              </div>
              <p className="helper">↑ ↓ 이동 · Enter 열기 · Esc 닫기</p>
            </>
          )}
          {modal === 'wrap' && (
            <>
              <div className="wrap-summary">
                <CircleCheck size={24} />
                <div>
                  <b>
                    {reviewed.filter((t) => t.status === 'done').length}
                    개의 일을 마쳤어요.
                  </b>
                  <p>미완료 업무는 확인하고 원하는 날짜로 옮기세요.</p>
                </div>
              </div>
              <div className="wrap-tasks">
                {reviewed.filter(isOpen).map((t) => (
                  <div key={t.id}>
                    <span>
                      <Source task={t} />
                      <b>{t.title}</b>
                    </span>
                    <label>
                      계획
                      <input
                        type="date"
                        aria-label={`${t.id} 마무리 계획 날짜`}
                        value={t.date || ''}
                        onInput={(e) => move(t.id, e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <label className="reflection">
                다음에 이어갈 때 기억할 것
                <textarea
                  placeholder="잘된 점, 막힌 이유, 내일 먼저 할 일…"
                  value={
                    data.reflections[reviewKey] ??
                    (reviewKey === TODAY ? data.reflection : '') ??
                    ''
                  }
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      reflections: {
                        ...p.reflections,
                        [reviewKey]: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <div className="modal-actions">
                <span className="helper">메모는 이 브라우저에 저장돼요.</span>
                <button
                  className="button primary"
                  onClick={() => {
                    setDay(
                      view === 'today'
                        ? shiftDate(day, 1)
                        : view === 'month'
                          ? shiftMonth(day, 1)
                          : view === 'sprint'
                            ? SPRINTS['25'].start
                            : shiftDate(day, 7),
                    );
                    if (view === 'sprint') setSprint('25');
                    changeView(view === 'today' ? 'today' : view);
                    setModal(null);
                  }}
                >
                  {view === 'sprint' && sprint === '25'
                    ? '스프린트 계획 보기'
                    : `다음 ${view === 'today' ? '날' : view === 'week' ? '주' : view === 'month' ? '달' : '스프린트'} 계획 확인`}
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {modal === 'assistant' && (
            <>
              <div className="assistant-note">
                <Sparkles size={22} />
                <b>내일의 마감과, 오늘의 여유를 확인했어요.</b>
                <p>
                  PAY-291 환불 웹훅 검증은 내일 마감이에요. 현재 내일 계획에는{' '}
                  {duration(capacity(tasks, TOMORROW).remaining)}의 여유가
                  있어요.
                </p>
              </div>
              <button
                className="suggestion"
                onClick={() => {
                  setModal(null);
                  setSelected('PAY-291');
                }}
              >
                마감 업무 확인
                <ArrowRight size={15} />
              </button>
              <button
                className="suggestion"
                onClick={() => {
                  setModal(null);
                  changeView('week');
                }}
              >
                한 주의 배치 살펴보기
                <ArrowRight size={15} />
              </button>
              <p className="helper">
                샘플 응답입니다. 실제 AI 호출과 자동 변경은 수행하지 않아요.
              </p>
            </>
          )}
          {modal === 'settings' && (
            <div className="settings-content">
              <p>업무 가능 시간의 기준</p>
              <dl>
                <dt>근무 시간</dt>
                <dd>09:00–18:00 · 점심 1시간 제외</dd>
                <dt>하루 업무량</dt>
                <dd>8시간</dd>
                <dt>예상하지 못한 일</dt>
                <dd>매일 1시간 확보</dd>
                <dt>회의</dt>
                <dd>그날의 일정에서 자동 제외</dd>
              </dl>
              <p className="helper">
                목업에서는 위 기준으로 가용 시간을 계산합니다. 계획 날짜를
                바꿔도 Jira 마감일은 유지됩니다.
              </p>
            </div>
          )}
          {modal === 'docs' && (
            <article className="document">
              <span className="eyebrow">ENGINEERING / PAYMENTS</span>
              <h2>Payment Retry Policy</h2>
              <p>
                일시적인 네트워크 오류에 한해 최대 3회, 지수 백오프로
                재시도합니다. 모든 재시도는 같은 멱등성 키를 유지합니다.
              </p>
              <h3>리뷰 시 확인할 점</h3>
              <ul>
                <li>이미 성공한 요청이 중복 결제되지 않는가?</li>
                <li>사용자 취소와 재시도 경합이 안전한가?</li>
                <li>최대 시도 초과가 지표와 로그에 남는가?</li>
              </ul>
              <button
                className="button"
                onClick={() => {
                  setSelected('PAY-382');
                  setModal(null);
                }}
              >
                연결된 PAY-382 보기
                <ArrowRight size={14} />
              </button>
            </article>
          )}
          {modal === 'workspace' && (
            <p className="helper">
              Platform 팀의 데모 워크스페이스입니다. 모든 이슈, 일정, 목표는 UX
              검증용 샘플이에요.
            </p>
          )}
          {modal === 'rollover' && (
            <>
              <p className="helper">
                Sprint {sprint}의 미완료 업무{' '}
                {tasks.filter((t) => t.sprint === sprint && isOpen(t)).length}
                개를 Sprint 25로 옮깁니다. 개인 계획 날짜와 마감일은 유지돼요.
              </p>
              <div className="modal-actions">
                <button className="button" onClick={() => setModal(null)}>
                  취소
                </button>
                <button
                  className="button primary"
                  disabled={
                    sprint === '25' ||
                    !tasks.some((t) => t.sprint === sprint && isOpen(t))
                  }
                  onClick={() => {
                    update(
                      (ts) =>
                        ts.map((t) =>
                          t.sprint === sprint && isOpen(t)
                            ? { ...t, sprint: '25' }
                            : t,
                        ),
                      '남은 업무를 Sprint 25로 옮겼어요',
                    );
                    setSprint('25');
                    setModal(null);
                  }}
                >
                  확인하고 옮기기
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function Capacity({ cap, large = false }) {
  return (
    <div
      className={`capacity ${large ? 'large' : ''} ${cap.remaining < 0 ? 'over' : ''}`}
    >
      <div>
        <span>
          {large ? '계획한 업무 ' : ''}
          <b>{shortDuration(cap.planned)}</b> / {shortDuration(cap.available)}
          {large ? ' 업무 가능' : ''}
        </span>
        {large && (
          <strong>
            {cap.remaining < 0
              ? `${duration(-cap.remaining)} 초과`
              : `${duration(cap.remaining)} 여유`}
          </strong>
        )}
      </div>
      <div className="capacity-track">
        <span
          style={{
            width: `${Math.min(100, (cap.planned / Math.max(1, cap.available)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
function Progress({ tasks, goal }) {
  const p = goalProgress(tasks, goal);
  return (
    <span className="goal-progress">
      <span>
        <i style={{ width: `${(p.done / Math.max(1, p.all)) * 100}%` }} />
      </span>
      <small>
        {p.done}/{p.all}
      </small>
    </span>
  );
}
function TaskRow({ task: t, toggle, open, patch }) {
  return (
    <div
      className={`task-row ${t.priority ? 'priority' : ''} ${t.status === 'done' ? 'done' : ''}`}
    >
      <button
        className={`task-check ${t.status === 'done' ? 'checked' : ''}`}
        aria-label={`${t.id} ${t.status === 'done' ? '완료 취소' : '완료'}`}
        onClick={() => toggle(t)}
      >
        {t.status === 'done' && <Check size={12} />}
      </button>
      <button className="task-info" onClick={() => open(t.id)}>
        <b>{t.title}</b>
        <span>
          <Source task={t} />
          {t.blocker && t.status === 'blocked' ? (
            <em className="blocker">
              <Flag size={11} />
              {t.blocker}
            </em>
          ) : (
            <>
              <i className={`status-dot ${t.status}`} />내 {STATUS[t.status]}
              {t.mr && t.source !== 'GitLab' && (
                <span className="mr-chip">
                  <GitPullRequest size={11} />
                  {t.mr}
                </span>
              )}
            </>
          )}
          {t.due && (
            <span className={t.due <= TODAY ? 'amber-text' : ''}>
              {t.due === TODAY ? '오늘 마감' : `${shortDate(t.due)} 마감`}
            </span>
          )}
        </span>
      </button>
      <button
        className="task-time"
        aria-label={`${t.id} 시간 편집`}
        onClick={() => open(t.id)}
      >
        <Clock3 size={12} />
        {duration(t.minutes)}
      </button>
      <button
        className={`star-button ${t.priority ? 'starred' : ''}`}
        aria-label={`${t.id} 우선순위 ${t.priority ? '해제' : '지정'}`}
        onClick={() => patch(t.id, { priority: !t.priority })}
      >
        <Flag size={14} />
      </button>
    </div>
  );
}
function TaskCard({ task: t, toggle, open, sprintView = false }) {
  return (
    <article
      className={`task-card ${t.status === 'done' ? 'done' : ''} ${t.status === 'blocked' ? 'blocked' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="card-meta">
        <Source task={t} />
        <button
          className={`task-check ${t.status === 'done' ? 'checked' : ''}`}
          aria-label={`${t.id} ${t.status === 'done' ? '완료 취소' : '완료'}`}
          onClick={() => toggle(t)}
        >
          {t.status === 'done' && <Check size={11} />}
        </button>
      </div>
      <button className="card-title" onClick={() => open(t.id)}>
        {t.title}
      </button>
      {t.status === 'blocked' && (
        <p className="blocker">
          <Flag size={11} />
          {t.blocker}
        </p>
      )}
      <div className="card-bottom">
        <span>
          <Clock3 size={11} />
          {duration(t.minutes)}
        </span>
        {sprintView && (
          <span>{t.date ? `${shortDate(t.date)} 계획` : '날짜 미정'}</span>
        )}
        {t.status === 'done' ? (
          <span className="green-text">내 작업 완료</span>
        ) : (
          <>
            {t.priority && <span className="green-text">우선순위</span>}
            {t.due && (
              <span className={t.due <= TODAY ? 'amber-text' : ''}>
                {shortDate(t.due)} 마감
              </span>
            )}
          </>
        )}
      </div>
    </article>
  );
}
function Agenda({ day, tasks, open }) {
  const rows = [
    ...MEETINGS.filter((m) => m.date === day).map((m) => ({
      ...m,
      meeting: true,
    })),
    ...tasks.filter((t) => t.date === day && t.time),
  ].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div className="agenda-items">
      {rows.map((r, i) => (
        <div className="agenda-row" key={r.id || r.time}>
          <time>{r.time}</time>
          <div
            className={`agenda-event ${r.meeting ? 'meeting' : 'work'} ${r.status === 'done' ? 'done' : ''}`}
          >
            {r.meeting ? (
              <>
                <span className="agenda-event-label">
                  <Video size={12} />
                  회의 · {duration(r.minutes)}
                </span>
                <b>{r.title}</b>
                <small>{r.people}</small>
              </>
            ) : (
              <button onClick={() => open(r.id)}>
                <span className="agenda-event-label">
                  {r.status === 'done' ? (
                    <CheckCheck size={12} />
                  ) : (
                    <span className="green-dot" />
                  )}
                  {r.status === 'done' ? '완료' : '집중'} ·{' '}
                  {duration(r.minutes)}
                </span>
                <b>{r.title}</b>
                <small>
                  {r.id} · {r.time}–{timeOf(minutesOf(r.time) + r.minutes)}
                </small>
              </button>
            )}
          </div>
        </div>
      ))}
      {![0, 6].includes(new Date(day + 'T12:00:00').getDay()) &&
        !rows.some(
          (r) =>
            minutesOf(r.time) < 1080 && minutesOf(r.time) + r.minutes > 1020,
        ) && (
          <div className="agenda-row">
            <time>17:00</time>
            <div className="agenda-free">
              <Clock3 size={12} />
              여유 시간 <span>예상하지 못한 일을 위해 비워둬요.</span>
            </div>
          </div>
        )}
    </div>
  );
}
function WeekTaskList({ children }) {
  const ref = useRef(null);
  const [more, setMore] = useState(false);
  const measure = () => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.scrollTop > el.clientHeight + 8);
  };
  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    const el = ref.current;
    if (el) {
      observer.observe(el);
      Array.from(el.children).forEach((child) => observer.observe(child));
    }
    return () => observer.disconnect();
  }, [children]);
  return (
    <div className="week-task-area">
      <div className="week-task-list" ref={ref} onScroll={measure}>
        {children}
      </div>
      {more && (
        <button
          className="week-scroll-hint"
          onClick={() =>
            ref.current?.scrollBy({ top: 200, behavior: 'smooth' })
          }
        >
          아래에 더 있어요 <ArrowDown size={12} />
        </button>
      )}
    </div>
  );
}
function PeriodNav({ label, previous, next, reset }) {
  return (
    <div className="date-step">
      <button aria-label={`이전 ${label} 보기`} onClick={previous}>
        <ChevronLeft size={14} />
      </button>
      <button onClick={reset}>{label === '주' ? '이번 주' : '이번 달'}</button>
      <button aria-label={`다음 ${label} 보기`} onClick={next}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
function Carryover({ tasks, missed, target, open, move }) {
  const [dates, setDates] = useState({});
  return (
    <section className="carryover-panel" aria-label="지난 계획에서 남은 일">
      <header>
        <div>
          <Flag size={14} />
          <b>
            지난 계획에서 남은 일 <span>{missed.length}</span>
          </b>
        </div>
        <small>다시 배치할 날짜를 골라주세요.</small>
      </header>
      {missed.map((t) => {
        const date = dates[t.id] || target;
        const after = capacity(moveTask(tasks, t.id, date), date).remaining;
        return (
          <div className="carryover-row" key={t.id}>
            <button className="carryover-task" onClick={() => open(t.id)}>
              <b>{t.title}</b>
              <span>
                <Source task={t} />
                {shortDate(t.date)} 계획 · {duration(t.minutes)}
                {t.due && ` · 원본 마감 ${shortDate(t.due)}`}
              </span>
            </button>
            <div className="carryover-actions">
              <label>
                <input
                  type="date"
                  aria-label={`${t.id} 다시 계획할 날짜`}
                  value={date}
                  onInput={(e) =>
                    setDates({ ...dates, [t.id]: e.target.value })
                  }
                />
                <small className={after < 0 ? 'amber-text' : ''}>
                  배치 후 {duration(Math.abs(after))}{' '}
                  {after < 0 ? '초과' : '여유'}
                </small>
              </label>
              <button className="button" onClick={() => move(t.id, date)}>
                이 날로
              </button>
              <button className="text-button" onClick={() => move(t.id, null)}>
                계획함
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
function Month({
  tasks,
  goals,
  goal,
  setGoal,
  open,
  changeView,
  day,
  setDay,
  editGoal,
  quick,
  move,
}) {
  const month = monthPeriod(day);
  const monthGoals = goalsForMonth(goals, day);
  const chosen = monthGoals.find((g) => g.id === goal);
  const visible = chosen ? [chosen] : monthGoals;
  const navigate = (date) => {
    setDay(date);
    setGoal(null);
  };
  return (
    <>
      <div className="section-top">
        <div>
          <div className="period-controls">
            <h2>
              {month.year}년 {month.month}월 <span>목표와 마일스톤</span>
            </h2>
            <PeriodNav
              label="달"
              previous={() => navigate(shiftMonth(day, -1))}
              next={() => navigate(shiftMonth(day, 1))}
              reset={() => navigate(TODAY)}
            />
          </div>
          <p>
            {monthGoals.length
              ? `${monthGoals.length}가지 목표를 실행할 일과 연결하세요.`
              : '이 달에 만들고 싶은 결과부터 적어보세요.'}
          </p>
        </div>
        <div className="period-actions">
          <button className="button" onClick={() => editGoal()}>
            <Plus size={14} />
            목표 추가
          </button>
          <button className="button" onClick={() => changeView('week')}>
            주간 실행 계획
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      {!monthGoals.length ? (
        <div className="empty-state">
          <Target size={26} />
          <b>아직 이 달의 목표가 없어요.</b>
          <p>목표와 성공 기준을 정하고, 다음 행동을 연결하세요.</p>
          <button className="button" onClick={() => editGoal()}>
            첫 목표 만들기
            <Plus size={14} />
          </button>
        </div>
      ) : (
        <div className="month-layout">
          <div>
            <div className="roadmap">
              <div className="roadmap-header">
                <span>이 달의 목표</span>
                <div
                  style={{
                    gridTemplateColumns: month.segments
                      .map((s) => `${s.days}fr`)
                      .join(' '),
                  }}
                >
                  {month.segments.map((s) => (
                    <span key={s.first}>
                      {s.first}–{s.last}일
                    </span>
                  ))}
                </div>
              </div>
              {monthGoals.map((g) => {
                const start =
                  g.startDate < month.start ? 1 : Number(g.startDate.slice(8));
                const end =
                  g.due > month.end ? month.count : Number(g.due.slice(8));
                return (
                  <div
                    className={`roadmap-row ${goal === g.id ? 'chosen' : ''}`}
                    key={g.id}
                  >
                    <button
                      className="roadmap-name"
                      onClick={() => setGoal(goal === g.id ? null : g.id)}
                    >
                      <span>
                        <i className={`dot ${g.color}`} />
                        {g.project}
                      </span>
                      <b>{g.title}</b>
                      <Progress tasks={tasks} goal={g.id} />
                    </button>
                    <div className="roadmap-lane">
                      <div
                        className="week-lines"
                        style={{ background: 'none' }}
                      >
                        {month.segments.slice(0, -1).map((s) => (
                          <i
                            key={s.last}
                            style={{
                              position: 'absolute',
                              left: `${(s.last / month.count) * 100}%`,
                              top: 0,
                              bottom: 0,
                              borderLeft: '1px solid var(--line)',
                            }}
                          />
                        ))}
                      </div>
                      {day.slice(0, 7) === TODAY.slice(0, 7) && (
                        <span
                          className="today-line"
                          style={{
                            left: `${((Number(TODAY.slice(8)) - 0.5) / month.count) * 100}%`,
                          }}
                        >
                          <small>오늘 {Number(TODAY.slice(8))}</small>
                        </span>
                      )}
                      <button
                        className={`roadmap-bar ${g.color}`}
                        style={{
                          left: `${((start - 1) / month.count) * 100}%`,
                          width: `${((end - start + 1) / month.count) * 100}%`,
                        }}
                        onClick={() => setGoal(goal === g.id ? null : g.id)}
                      >
                        {g.project}
                        <span>◇ {shortDate(g.due)}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="goal-details-heading">
              <h3>{chosen ? chosen.title : '목표별 다음 행동'}</h3>
              {chosen && (
                <button className="text-button" onClick={() => setGoal(null)}>
                  전체 목표 보기
                  <X size={12} />
                </button>
              )}
              <span>날짜를 정하면 일간·주간 계획에도 보여요.</span>
            </div>
            {visible.map((g) => {
              const health = goalHealth(tasks, g);
              const next = tasks
                .filter((t) => t.goal === g.id && isOpen(t))
                .sort(
                  (a, b) =>
                    Number(Boolean(a.date)) - Number(Boolean(b.date)) ||
                    Number(b.status === 'blocked') -
                      Number(a.status === 'blocked') ||
                    (a.date || '').localeCompare(b.date || ''),
                );
              return (
                <div className="goal-detail" key={g.id}>
                  <div className="goal-detail-title">
                    <span className={`goal-number ${g.color}`}>
                      {monthGoals.indexOf(g) + 1}
                    </span>
                    <div>
                      <h3>{g.title}</h3>
                      <p>
                        {g.description ||
                          '성공 기준을 적어 목표를 구체화하세요.'}
                      </p>
                    </div>
                    <span>{shortDate(g.due)} 목표</span>
                    <button className="text-button" onClick={() => editGoal(g)}>
                      수정
                    </button>
                  </div>
                  <div className="goal-health">
                    <span>남은 일 {health.open}</span>
                    {health.unplanned > 0 && (
                      <span className="amber-text">
                        미계획 {health.unplanned}
                      </span>
                    )}
                    {health.blocked > 0 && (
                      <span className="amber-text">막힘 {health.blocked}</span>
                    )}
                    {health.late > 0 && (
                      <span className="amber-text">
                        목표일 이후 계획 {health.late}
                      </span>
                    )}
                  </div>
                  <div className="goal-next-actions">
                    {next.slice(0, chosen ? next.length : 2).map((t) => (
                      <div className="goal-task" key={t.id}>
                        <button
                          className="goal-task-main"
                          onClick={() => open(t.id)}
                        >
                          <Source task={t} />
                          <span>{t.title}</span>
                          {!t.date && (
                            <small className="amber-text">계획 필요</small>
                          )}
                        </button>
                        <input
                          className="goal-date"
                          type="date"
                          aria-label={`${t.id} 목표에서 계획 날짜`}
                          value={t.date || ''}
                          onInput={(e) => move(t.id, e.target.value)}
                        />
                        <button
                          className="icon-button"
                          aria-label={`${t.id} 상세 열기`}
                          onClick={() => open(t.id)}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="goal-detail-actions">
                    <button
                      className="text-button"
                      onClick={() => quick(null, g.id)}
                    >
                      <Plus size={13} />
                      다음 행동 추가
                    </button>
                    {!chosen && next.length > 2 && (
                      <button
                        className="text-button"
                        onClick={() => setGoal(g.id)}
                      >
                        남은 {next.length}개 모두 보기
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <aside className="milestones">
            <h3>
              <Flag size={16} />이 달의 마일스톤
            </h3>
            {[...monthGoals]
              .sort((a, b) => a.due.localeCompare(b.due))
              .map((g) => (
                <button key={g.id} onClick={() => setGoal(g.id)}>
                  <span className="milestone-date">
                    {Number(g.due.slice(5, 7))}월<b>{g.due.slice(-2)}</b>
                  </span>
                  <span>
                    <b>{g.milestone}</b>
                    <small>{g.project}</small>
                    <span className={`milestone-tag ${g.color}`}>
                      {goalProgress(tasks, g.id).done}/
                      {goalProgress(tasks, g.id).all} 내 작업 완료
                    </span>
                  </span>
                </button>
              ))}
            <div className="next-cycle">
              <Layers size={18} />
              <h3>목표를 실행 계획으로</h3>
              <p>
                연결된 할 일에 날짜와 스프린트를 정하면 같은 업무로 계속
                추적해요.
              </p>
              <button
                className="text-button"
                onClick={() => changeView('sprint')}
              >
                스프린트 보기
                <ArrowRight size={13} />
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
function Inspector({
  onOpenWiki,
  task: t,
  tasks,
  goals,
  patch,
  move,
  close,
  toggle,
  archive,
}) {
  const [title, setTitle] = useState(t.title);
  useEffect(() => setTitle(t.title), [t.id, t.title]);
  const [note, setNote] = useState(''),
    [context, setContext] = useState(null);
  useEffect(() => {
    setContext(null);
    setNote('');
  }, [t.id]);
  const clash = conflicts(tasks, t);
  return (
    <aside className="inspector">
      <header>
        <Source task={t} />
        <button className="icon-button" aria-label="상세 닫기" onClick={close}>
          <X size={17} />
        </button>
      </header>
      {t.source === '개인' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && title.trim() !== t.title)
              patch(t.id, { title: title.trim() }, '할 일 이름을 수정했어요');
          }}
        >
          <input
            className="task-title-editor"
            aria-label="개인 할 일 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {title !== t.title && (
            <button className="button" disabled={!title.trim()}>
              이름 저장
            </button>
          )}
        </form>
      ) : (
        <h2>{t.title}</h2>
      )}
      <span className="inspector-subtitle">내 계획 · {t.source} 연결 샘플</span>
      <dl>
        <dt>내 진행 상태</dt>
        <dd>
          <select
            aria-label={`${t.id} 상태`}
            value={t.status}
            onChange={(e) => patch(t.id, { status: e.target.value })}
          >
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </dd>
        {t.source !== '개인' && (
          <>
            <dt>{t.source} 원본 상태</dt>
            <dd>
              {STATUS[t.sourceStatus] || '확인되지 않음'}{' '}
              <small>· 읽기 전용 샘플</small>
            </dd>
          </>
        )}
        <dt>계획 날짜</dt>
        <dd>
          <input
            aria-label={`${t.id} 계획 날짜`}
            type="date"
            value={t.date || ''}
            onInput={(e) => move(t.id, e.target.value)}
          />
        </dd>
        <dt>시작 시간</dt>
        <dd>
          <select
            aria-label={`${t.id} 시작 시간`}
            disabled={!t.date}
            value={t.time || ''}
            onChange={(e) => patch(t.id, { time: e.target.value })}
          >
            <option value="">시간 미정</option>
            {Array.from({ length: 36 }, (_, i) => timeOf(540 + i * 15)).map(
              (time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ),
            )}
          </select>
        </dd>
        <dt>예상 시간</dt>
        <dd>
          <select
            aria-label={`${t.id} 예상 시간`}
            value={t.minutes}
            onChange={(e) => patch(t.id, { minutes: Number(e.target.value) })}
          >
            {[15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 360, 480].map((m) => (
              <option key={m} value={m}>
                {duration(m)}
              </option>
            ))}
          </select>
        </dd>
        <dt>원본 마감</dt>
        <dd>{t.due ? `${shortDate(t.due)} · ${t.source}` : '없음'}</dd>
        <dt>연결 목표</dt>
        <dd>
          <select
            aria-label={`${t.id} 연결 목표`}
            value={t.goal || ''}
            onChange={(e) =>
              patch(
                t.id,
                { goal: e.target.value || null },
                '연결 목표를 변경했어요',
              )
            }
          >
            <option value="">지정 안 함</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </dd>
        <dt>스프린트</dt>
        <dd>
          <select
            aria-label={`${t.id} 스프린트`}
            value={t.sprint || ''}
            onChange={(e) => patch(t.id, { sprint: e.target.value || null })}
          >
            <option value="">지정 안 함</option>
            <option value="24">Sprint 24</option>
            <option value="25">Sprint 25</option>
          </select>
        </dd>
      </dl>
      {t.due && t.date > t.due && (
        <div className="inspector-alert">
          <Flag size={14} />
          계획 날짜가 원본 마감일 이후예요.
        </div>
      )}
      {t.time && minutesOf(t.time) + t.minutes > 1080 && (
        <div className="inspector-alert">
          <Clock3 size={14} />
          예상 종료 시간이 근무 시간(18:00)을 넘어요.
        </div>
      )}
      {clash.length > 0 && (
        <div className="inspector-alert">
          <Clock3 size={14} />
          시간이 겹치는 일정: {clash.map((c) => c.title).join(', ')}
        </div>
      )}
      {t.status === 'blocked' && (
        <div className="inspector-alert">
          <Flag size={14} />
          {t.blocker || '진행을 막는 이유를 메모에 남겨주세요.'}
        </div>
      )}
      <p className="helper">
        내 진행 상태와 계획을 바꿔도 원본 상태·마감은 유지돼요.
      </p>
      <section>
        <h3>작업 메모</h3>
        <p>
          {t.description ||
            '완료 조건과 다음 행동을 메모해두고, 계획한 시간에 이어서 작업하세요.'}
        </p>
      </section>
      {t.goal && (
        <section>
          <h3>연결된 맥락</h3>
          <div className="linked-goal">
            <Target size={14} />
            {goals.find((g) => g.id === t.goal)?.title}
          </div>
          {t.mr && (
            <button
              className="linked-object"
              onClick={() => setContext(context === 'mr' ? null : 'mr')}
            >
              <GitPullRequest size={14} />
              {t.mr} 코드 변경
              <ChevronRight size={12} />
            </button>
          )}
          {t.id === 'PAY-382' && (
            <button
              className="linked-object"
              onClick={() => setContext(context === 'doc' ? null : 'doc')}
            >
              <BookOpen size={14} />
              Payment Retry Policy
              <ChevronRight size={12} />
            </button>
          )}
          {context && (
            <div className="context-preview">
              <b>{context === 'doc' ? '재시도 정책' : '리뷰할 변경사항'}</b>
              <p>
                {context === 'doc'
                  ? '지수 백오프, 최대 3회. 모든 재시도에서 멱등성 키를 유지합니다.'
                  : 'Controller → Service → Repository. 상태 전이와 중복 요청 처리의 테스트를 먼저 확인하세요.'}
              </p>
              <small>연결 미리보기 · 샘플</small>
              {context === 'doc' && onOpenWiki && (
                <button
                  className="text-button"
                  onClick={() => onOpenWiki('retry-policy')}
                >
                  위키에서 문서 읽기 <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          )}
        </section>
      )}
      <section className="notes">
        <h3>
          <MessageSquare size={14} />
          개인 기록
        </h3>
        {(t.notes || []).map((n, i) => (
          <p className="saved-note" key={i}>
            {n}
          </p>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) {
              patch(t.id, { notes: [...(t.notes || []), note.trim()] });
              setNote('');
            }
          }}
        >
          <textarea
            aria-label="작업 기록"
            placeholder="다음에 이어갈 맥락을 남기세요…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="button" disabled={!note.trim()}>
            기록 남기기
          </button>
        </form>
      </section>
      <button
        className="button primary inspector-complete"
        onClick={() => toggle(t)}
      >
        <Check size={15} />
        {t.status === 'done' ? '완료 취소' : '내 작업 완료'}
      </button>
      {t.source === '개인' && (
        <div className="archive-actions">
          <button className="text-button" onClick={archive}>
            <Archive size={14} />할 일 보관
          </button>
        </div>
      )}
      <p className="helper">이 화면의 변경은 데모에만 저장됩니다.</p>
    </aside>
  );
}
function Modal({ title, close, wide, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    const selector =
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]';
    const focus =
      el.querySelector('[autofocus],input,textarea') ||
      el.querySelector(selector);
    focus?.focus();
    const trap = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = [...el.querySelectorAll(selector)];
      if (e.shiftKey && document.activeElement === nodes[0]) {
        e.preventDefault();
        nodes.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
        e.preventDefault();
        nodes[0]?.focus();
      }
    };
    el.addEventListener('keydown', trap);
    return () => {
      el.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="닫기" className="icon-button" onClick={close}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
