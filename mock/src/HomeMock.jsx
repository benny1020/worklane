import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, Check,
  CheckCheck, ChevronDown, ChevronRight, CircleCheck, CircleDot, Clock3,
  FileCode2, GitBranch, GitPullRequest, Home, Inbox, Layers, ListTodo,
  PanelLeft, Plus, Search, Settings2, ShieldCheck, Sparkles, Video, X,
} from 'lucide-react';
import { createPlanningItems, MOCK_TODAY, MOCK_WEEK, planningCounts } from './planning.js';
import './styles.css';

// Same fixture model as the previous studies: a single task has one planned date.
const SOURCE_ITEMS = [
  { id: '!391', kind: 'review', title: '주문 상태 매핑 변경 리뷰', description: '주문 상태 매핑 변경 리뷰', repo: 'order-api', by: '박지윤', initials: 'JP', status: '리뷰 요청', priority: '높음' },
  { id: 'PAY-291', kind: 'issue', title: '환불 웹훅 서명 검증', description: '환불 웹훅 서명 검증', repo: 'payment-api', by: '김윤', status: '시작 전', priority: '높음' },
  { id: 'OPS-91', kind: 'alert', title: '결제 API 오류 원인 확인', description: '결제 API 오류 원인 확인', repo: 'payment-api', by: '김윤', status: '진행 중', priority: '높음' },
  { id: 'PAY-382', kind: 'issue', title: '결제 재시도 로직 구현', description: '결제 재시도 로직 구현', repo: 'payment-api', by: '김윤', status: '진행 중', priority: '높음' },
  { id: 'API-128', kind: 'issue', title: '주문 API 리팩터링', description: '주문 API 리팩터링', repo: 'order-api', by: '김윤', status: '시작 전', priority: '보통' },
  { id: '!386', kind: 'review', title: '재시도 큐 관측 지표 리뷰', description: '재시도 큐 관측 지표 리뷰', repo: 'payment-api', by: '이민호', initials: 'ML', status: '리뷰 요청', priority: '보통' },
];
const PERIODS = [['today', '오늘 할 일'], ['week', '이번 주'], ['sprint', '스프린트'], ['backlog', '백로그']];
const MEETINGS = [
  { time: '09:00', end: '09:15', title: '데일리 스탠드업', detail: 'Backend team · 온라인', past: true },
  { time: '11:30', end: '12:00', title: '백엔드 싱크', detail: 'API 계약 정리 · 4명', next: true },
  { time: '14:00', end: '15:00', title: '스프린트 플래닝', detail: 'Sprint 24 · 회의실 2' },
];
const LABELS = { today: '오늘의 업무', week: '이번 주 계획', sprint: '스프린트 계획', backlog: '백로그' };
const plannedDay = date => MOCK_WEEK.find(day => day.date === date)?.label + '요일';
const timeLabel = minutes => minutes >= 60 ? `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}` : `${minutes}분`;
const linkedMR = { id: '!381', kind: 'review', title: '결제 재시도 처리', description: '결제 재시도 처리', repo: 'payment-api', by: '김윤', status: '리뷰 중' };
const linkedDoc = { id: 'DOC-42', kind: 'doc', title: 'Payment Retry Policy', description: '결제 재시도 정책', repo: 'Engineering / Payments' };
const linkedPipeline = { id: '#482', kind: 'pipeline', title: 'Payment API pipeline', repo: 'payment-api', status: '통과' };

function relatedObjects(item, plan) {
  if (item.id === 'PAY-382') return [linkedMR, linkedPipeline, linkedDoc];
  if (item.id === 'OPS-91') return [linkedPipeline, linkedMR];
  if (item.id === 'API-128') return [plan.find(task => task.id === '!391'), {id:'DOC-88', kind:'doc', title:'Order API Status Contract', repo:'Engineering / Orders'}];
  if (item.id === 'PAY-291') return [{id:'DOC-77', kind:'doc', title:'Webhook Signature Policy', repo:'Engineering / Payments'}];
  return [];
}

function Glyph({ icon: Component, size = 17, ...props }) { return <Component size={size} strokeWidth={1.65} aria-hidden="true" {...props}/>; }
function TypeIcon({ item, size = 15 }) { return <Glyph icon={item.kind === 'review' ? GitPullRequest : item.kind === 'personal' ? ListTodo : item.kind === 'doc' ? BookOpen : item.kind === 'pipeline' ? GitBranch : CircleDot} size={size}/>; }
function State({ item }) { return <span className={`rf-state ${item.status === '진행 중' ? 'progress' : item.kind === 'review' ? 'review' : ''}`}><span/>{item.status}</span>; }
function PlanDate({ item, schedule }) {
  return <label className="rf-date-control"><CalendarDays size={13}/><select aria-label={`${item.id} 계획 날짜`} value={item.plannedOn || ''} onChange={e => schedule(item.id, e.target.value || null)}><option value="">날짜 미정</option>{MOCK_WEEK.map(day => <option key={day.date} value={day.date}>{day.date === MOCK_TODAY ? '오늘' : `${day.label}요일`} · 10/{day.day}</option>)}</select></label>;
}

export default function HomeRefined({ standalone = false }) {
  const query = new URLSearchParams(location.search);
  const [period, setPeriod] = useState(PERIODS.some(([id]) => id === query.get('view')) ? query.get('view') : 'today');
  const [plan, setPlan] = useState(() => createPlanningItems(SOURCE_ITEMS));
  const [done, setDone] = useState(() => createPlanningItems(SOURCE_ITEMS).filter(item => item.completed).map(item => item.id));
  const [collapsed, setCollapsed] = useState(false);
  const [detail, setDetail] = useState(null);
  const [trail, setTrail] = useState([]);
  const [search, setSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [assistant, setAssistant] = useState(false);
  const quickRef = useRef(null);
  const counts = planningCounts(plan, done);
  const today = plan.filter(item => item.plannedOn === MOCK_TODAY && !done.includes(item.id));
  const completed = plan.filter(item => item.plannedOn === MOCK_TODAY && done.includes(item.id));
  const selected = detail && (plan.find(item => item.id === detail.id) || detail);

  function changePeriod(next) {
    setPeriod(next); setDetail(null); setTrail([]); setAssistant(false);
    const url = new URL(location.href); url.searchParams.set('view', next); history.replaceState(null, '', url);
  }
  function open(item) { setDetail(item); setTrail([]); setAssistant(false); }
  function follow(item) { setTrail(current => [...current, selected]); setDetail(item); }
  function toggle(id) { setDone(current => current.includes(id) ? current.filter(key => key !== id) : [...current, id]); }
  function schedule(id, date) {
    const before = plan.find(item => item.id === id)?.plannedOn || null;
    setPlan(current => current.map(item => item.id === id ? { ...item, plannedOn: date } : item));
    setFeedback({ text: `${id} · ${date === MOCK_TODAY ? '오늘 할 일' : date ? `10/${date.slice(-2)}` : '백로그'}로 옮겼어요`, undo: () => setPlan(current => current.map(item => item.id === id ? { ...item, plannedOn: before } : item)) });
  }
  function addTask(event) {
    event.preventDefault(); if (!newTitle.trim()) return;
    const title = newTitle.trim();
    setPlan(current => [...current, { id: `TODO-${100 + current.length}`, title, description: title, kind: 'personal', source: '개인', plannedOn: period === 'backlog' ? null : MOCK_TODAY, minutes: 30, status: '시작 전', by: '김윤', priority: '보통' }]);
    setNewTitle('');
  }
  function quickCreate() { if (!['today', 'backlog'].includes(period)) changePeriod('today'); requestAnimationFrame(() => quickRef.current?.focus()); }
  useEffect(() => {
    function keydown(event) {
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if ((event.metaKey || event.ctrlKey) && ['k', 'j', 'n'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        if (event.key.toLowerCase() === 'k') setSearch(current => !current);
        if (event.key.toLowerCase() === 'j') { setAssistant(current => !current); setDetail(null); }
        if (event.key.toLowerCase() === 'n') quickCreate();
      }
      if (event.key === 'Escape') { setSearch(false); setDetail(null); setAssistant(false); setFeedback(null); }
      if (!editing && event.key === '/') { event.preventDefault(); setSearch(true); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [period]);

  const shared = { done, toggle, open, schedule, selected };
  const quickAdd = <form className="rf-quick-add" onSubmit={addTask}><Plus size={16}/><input ref={quickRef} aria-label="새 할 일" placeholder={period === 'backlog' ? '나중에 할 일 추가…' : '할 일 추가…'} value={newTitle} onChange={event => setNewTitle(event.target.value)}/><button disabled={!newTitle.trim()} type="submit" aria-label="입력한 할 일 추가">Enter ↵</button></form>;
  const future = plan.filter(item => ['PAY-291', '!386'].includes(item.id) && item.plannedOn !== MOCK_TODAY && !done.includes(item.id));

  return <div className={`rf-app ${collapsed ? 'rf-collapsed' : ''} ${standalone ? 'rf-home-mock' : ''}`}>
    <div className="rf-study"><span><b>Worklane</b><i/>Home refinement <span className="rf-study-version">03</span></span><div><a href="/" target="_blank" rel="noreferrer">기존 앱<ArrowUpRight size={12}/></a><a href="?round=2&variant=desk">이전 시안<ArrowUpRight size={12}/></a><span className="rf-mock-dot"/>인터랙티브 목업</div></div>
    <div className="rf-shell">
      <aside className="rf-sidebar">
        <div className="rf-brand"><span className="rf-logo">w.</span><strong>Worklane</strong><ChevronDown size={14}/></div>
        <div className="rf-workspace"><span>P</span><div><b>Platform</b><small>Engineering workspace</small></div><ChevronDown size={13}/></div>
        <button className="rf-sidebar-search" aria-label="전체 검색" onClick={() => setSearch(true)}><Search size={16}/><span>무엇이든 찾기</span><kbd>⌘ K</kbd></button>
        <nav aria-label="워크스페이스 메뉴">{[[Home,'홈'],[Inbox,'인박스'],[ListTodo,'내 업무'],[CalendarDays,'캘린더'],[Layers,'프로젝트'],[GitPullRequest,'코드'],[CircleDot,'Observe'],[BookOpen,'문서']].map(([icon,title]) => <button key={title} title={title} className={title === '홈' ? 'active' : ''} onClick={() => title === '홈' || title === '내 업무' ? changePeriod('today') : title === '캘린더' ? changePeriod('week') : title === '프로젝트' ? changePeriod('sprint') : title === '문서' ? open(linkedDoc) : title === '코드' ? open(plan.find(item => item.id === '!391')) : title === 'Observe' ? open(plan.find(item => item.id === 'OPS-91')) : open({kind:'notifications',id:'notifications',title:'확인할 알림'})}><Glyph icon={icon}/><span>{title}</span>{title === '인박스' && <b>3</b>}{title === '코드' && <b>2</b>}</button>)}</nav>
        <div className="rf-projects"><span>즐겨찾는 프로젝트</span>{[['P','Payments','green'],['A','Order platform','blue'],['O','Infrastructure','amber']].map(([key,title,color]) => <button key={key} onClick={() => changePeriod('sprint')}><i className={color}>{key}</i>{title}</button>)}</div>
        <div className="rf-sidebar-bottom"><button onClick={() => open({kind:'settings', id:'settings', title:'연동 설정'})} title="설정 및 연동"><Settings2 size={16}/><span>설정 및 연동</span></button><div className="rf-profile"><span>YK</span><div><b>김윤</b><small>Platform Engineering</small></div><ChevronDown size={13}/></div></div>
      </aside>
      <div className="rf-window">
        <header className="rf-toolbar"><div><button aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'} onClick={() => setCollapsed(current => !current)}><PanelLeft size={17}/></button><span className="rf-toolbar-divider"/><Home size={14}/><span>홈</span><ChevronRight size={12}/><b>{LABELS[period]}</b></div><div><span className="rf-demo">데모 워크스페이스</span><button aria-label="전체 검색 열기" onClick={() => setSearch(true)}><Search size={17}/></button><button aria-label="알림 열기" className="rf-bell" onClick={() => open({kind:'notifications',id:'notifications',title:'확인할 알림'})}><Bell size={17}/><i/></button><button className={`rf-assistant-button ${assistant ? 'active' : ''}`} onClick={() => {setAssistant(current => !current); setDetail(null);}}><Sparkles size={16}/>Assistant<kbd>⌘ J</kbd></button></div></header>
        <main className="rf-content">
          <header className="rf-page-heading"><div><span className="rf-eyebrow">10월 21일 수요일</span><h1>{LABELS[period]}</h1><p>{period === 'today' ? <>오늘 <b>{counts.today}개</b> 남음<span>·</span>{counts.todayDone}개 완료<span>·</span>일정 3개</> : period === 'week' ? '10월 19일–23일 · 회의와 할 일을 함께 계획하세요.' : period === 'sprint' ? `Sprint 24 · 10월 12일–23일 · ${counts.sprintDone}/${counts.sprintTotal}개 완료` : '날짜를 정하지 않은 일. 계획할 때 오늘이나 이번 주에 넣어주세요.'}</p></div><button className="rf-button rf-primary" onClick={quickCreate}><Plus size={16}/>할 일 추가<kbd>⌘ N</kbd></button></header>
          <nav className="rf-periods" aria-label="할 일 기간">{PERIODS.map(([id,title]) => <button key={id} className={id === period ? 'active' : ''} aria-pressed={id === period} onClick={() => changePeriod(id)}>{title}<span>{counts[id]}</span></button>)}<span className="rf-period-hint">{period === 'today' ? '내 계획' : '같은 할 일, 다른 보기'}</span></nav>
          <div className={`rf-body ${selected || assistant ? 'has-inspector' : ''} ${period !== 'today' && !selected && !assistant ? 'rf-body-wide' : ''}`}>
            <div className="rf-main-column">
              {period === 'today' ? <>
                <section className="rf-today" aria-label="오늘 할 일 목록"><div className="rf-section-heading"><h2>오늘 할 일<span>{today.length}</span></h2><span>예상 {timeLabel(today.reduce((total,item) => total + item.minutes, 0))}</span></div>
                  {today.map(item => <TaskRow key={item.id} item={item} {...shared}/>)}{!today.length && <div className="rf-empty"><CircleCheck size={22}/><b>오늘 계획한 일을 모두 마쳤어요.</b><button onClick={() => changePeriod('backlog')}>백로그 살펴보기<ArrowRight size={14}/></button></div>}
                  {quickAdd}
                  <button className="rf-completed-toggle" aria-expanded={completedOpen} onClick={() => setCompletedOpen(current => !current)}><ChevronRight size={14} className={completedOpen ? 'expanded' : ''}/><CheckCheck size={15}/>완료한 일 {completed.length}개<span>{completedOpen ? '접기' : '보기'}</span></button>
                  {completedOpen && completed.map(item => <TaskRow key={item.id} item={item} {...shared} complete/>)}</section>
                <section className="rf-resume"><span><Clock3 size={14}/>이어서 보기</span><button onClick={() => open(plan.find(item => item.id === 'PAY-382'))}>PAY-382<ChevronRight size={12}/></button><button onClick={() => open(linkedMR)}><GitPullRequest size={13}/>!381</button><button onClick={() => open(linkedPipeline)}><CircleCheck size={13}/>Pipeline #482</button><button onClick={() => open(linkedDoc)}><BookOpen size={13}/>Retry Policy</button></section>
                <section className="rf-ahead"><div className="rf-section-heading"><h2>미리 챙길 일<span>{future.length}</span></h2><button onClick={() => changePeriod('week')}>이번 주 보기<ArrowRight size={13}/></button></div>{future.map(item => <div className="rf-ahead-row" key={item.id}><TypeIcon item={item}/><button onClick={() => open(item)}><b>{item.description}</b><span>{item.id} · {item.kind === 'review' ? `${item.by} · ${item.repo}` : 'Payments · Sprint 24'}</span></button><span className={item.dueOn ? 'rf-due' : 'rf-muted'}>{item.dueOn ? '내일 마감' : item.plannedOn ? `${plannedDay(item.plannedOn)} 계획` : '날짜 미정'}</span><button className="rf-small-button" onClick={() => schedule(item.id, MOCK_TODAY)}>오늘에 넣기</button></div>)}</section>
                <div className="rf-recent"><BookOpen size={15}/><button onClick={() => open(linkedDoc)}>Payment Retry Policy</button><span>이민호 · 28분 전 수정</span><ArrowUpRight size={13}/></div>
              </> : <PlanningView period={period} plan={plan} counts={counts} changePeriod={changePeriod} showDone={showDone} setShowDone={setShowDone} quickAdd={quickAdd} {...shared}/>}
            </div>
            {selected ? <Inspector item={selected} plan={plan} follow={follow} schedule={schedule} close={() => {setDetail(null); setTrail([]);}} back={trail.length ? () => {setDetail(trail[trail.length - 1]); setTrail(current => current.slice(0,-1));} : null} notify={text => setFeedback({text})}/> : assistant ? <AssistantPane plan={plan} schedule={schedule} open={open} close={() => setAssistant(false)}/> : period === 'today' ? <aside className="rf-day-aside"><section className="rf-agenda"><div className="rf-section-heading"><h2><CalendarDays size={16}/>오늘 일정<span>3</span></h2><button aria-label="주간 일정 보기" onClick={() => changePeriod('week')}><ArrowUpRight size={15}/></button></div><div className="rf-next-meeting"><span className="rf-live-dot"/>다음 회의까지 1시간 9분</div>{MEETINGS.map(meeting => <button key={meeting.time} className={`rf-meeting ${meeting.past ? 'past' : ''} ${meeting.next ? 'next' : ''}`} onClick={() => open({ ...meeting, id:meeting.time, kind:'meeting' })}><time>{meeting.time}<small>{meeting.end}</small></time><div><b>{meeting.title}</b><span>{meeting.detail}</span>{meeting.next && <small><Video size={12}/>온라인 회의</small>}</div>{meeting.past ? <Check size={14}/> : <ChevronRight size={14}/>}</button>)}<div className="rf-agenda-footer"><Clock3 size={13}/>회의 1시간 45분<span>할 일 {timeLabel(today.reduce((sum,item) => sum + item.minutes, 0))}</span></div></section>
              <section className="rf-brief"><div className="rf-section-heading"><h2><Sparkles size={16}/>챙겨둘 일</h2><span>Assistant</span></div><div className="rf-brief-item"><span className="rf-brief-mark review"><GitPullRequest size={15}/></span><div><b>동료가 리뷰를 기다리고 있어요</b><p>!391 · 박지윤 · 요청 후 18시간</p><button onClick={() => open(plan.find(item => item.id === '!391'))}>리뷰 미리보기<ArrowRight size={13}/></button></div></div><div className="rf-brief-item"><span className="rf-brief-mark"><CalendarDays size={15}/></span><div><b>웹훅 서명 검증, 내일 마감</b><p>PAY-291 · {plan.find(item => item.id === 'PAY-291')?.plannedOn === MOCK_TODAY ? '오늘' : plan.find(item => item.id === 'PAY-291')?.plannedOn === '2026-10-22' ? '목요일' : '다른 날짜'}에 45분 계획됨</p><button onClick={() => open(plan.find(item => item.id === 'PAY-291'))}>계획 확인하기<ArrowRight size={13}/></button></div></div></section>
</aside> : null}
          </div>
        </main>
        <footer className="rf-statusbar"><span><i/>샘플 워크스페이스<span>·</span>Jira · GitLab · Confluence</span><span>목업 데이터 · 10월 21일 10:21<kbd>⌘ K</kbd>찾기<kbd>⌘ J</kbd>Assistant</span></footer>
      </div>
    </div>
    {feedback && <div className="rf-toast" role="status"><CircleCheck size={16}/>{feedback.text}{feedback.undo && <button onClick={() => {feedback.undo(); setFeedback(null);}}>되돌리기</button>}<button aria-label="알림 닫기" onClick={() => setFeedback(null)}><X size={14}/></button></div>}
    {search && <SearchPalette term={searchTerm} setTerm={setSearchTerm} plan={plan} close={() => setSearch(false)} open={item => {setSearch(false); open(item);}}/>}
  </div>;
}

function TaskRow({ item, complete, selected, toggle, open, schedule }) {
  return <div className={`rf-task-row ${selected?.id === item.id ? 'selected' : ''} ${complete ? 'complete' : ''}`}>
    <button className="rf-checkbox" role="checkbox" aria-checked={!!complete} aria-label={`${item.id} ${complete ? '완료 취소' : '완료'}`} onClick={() => toggle(item.id)}>{complete && <Check size={12}/>}</button>
    <button className="rf-task-label" onClick={() => open(item)}><b>{item.description}</b><span><TypeIcon item={item} size={12}/>{item.id}<i/>{item.kind === 'review' ? `${item.repo} · ${item.by}` : item.source === '개인' ? '개인 할 일' : item.sprint || item.repo}</span></button>
    {!complete && <><State item={item}/><span className="rf-estimate">{timeLabel(item.minutes)}</span><PlanDate item={item} schedule={schedule}/></>}
    <button className="rf-row-open" aria-label={`${item.id} 미리보기`} onClick={() => open(item)}><ChevronRight size={16}/></button>
  </div>;
}

function PlanningView({ period, plan, done, counts, showDone, setShowDone, quickAdd, ...props }) {
  const backlog = plan.filter(item => !item.plannedOn && !done.includes(item.id));
  const pool = plan.filter(item => period === 'sprint' ? item.sprint === 'Sprint 24' : MOCK_WEEK.some(day => day.date === item.plannedOn));
  const visible = pool.filter(item => showDone || !done.includes(item.id));
  const columns = period === 'week' ? MOCK_WEEK.map(day => ({...day, tasks:visible.filter(item => item.plannedOn === day.date)})) : [['시작 전','todo'],['진행 중','progress'],['리뷰 요청','review'],['완료','done']].map(([label,date]) => ({label,date,tasks: pool.filter(item => date === 'done' ? done.includes(item.id) : !done.includes(item.id) && item.status === label)}));
  return <>
    <div className="rf-plan-summary"><span>{period === 'backlog' ? `${backlog.length}개 · 아직 날짜를 정하지 않았어요` : `${counts[period]}개 남음 · ${pool.filter(item => done.includes(item.id)).length}개 완료`}</span>{period === 'week' && <label><input type="checkbox" checked={showDone} onChange={event => setShowDone(event.target.checked)}/>완료한 일 표시</label>}</div>
    {period === 'backlog' ? <section className="rf-backlog">{backlog.map(item => <div className="rf-backlog-row" key={item.id}><TypeIcon item={item}/><button onClick={() => props.open(item)}><b>{item.description}</b><small>{item.id} · {item.source} · {timeLabel(item.minutes)}</small></button><PlanDate item={item} schedule={props.schedule}/><button className="rf-small-button" onClick={() => props.schedule(item.id, MOCK_TODAY)}>오늘에 넣기<ArrowRight size={13}/></button></div>)}{!backlog.length && <p className="rf-plan-empty">날짜를 정하지 않은 일이 없습니다.</p>}{quickAdd}</section> : <>
      <div className={`rf-plan-board ${period === 'sprint' ? 'sprint' : ''}`}>{columns.map(column => <section className={`rf-plan-column ${column.date === MOCK_TODAY ? 'today' : ''}`} aria-label={column.day ? `${column.label}요일 ${column.day}일` : column.label} key={column.date} onDragOver={event => {if (period === 'week') event.preventDefault();}} onDrop={event => {if (period !== 'week') return; event.preventDefault(); const id=event.dataTransfer.getData('text/worklane-task'); if(plan.some(item => item.id === id)) props.schedule(id,column.date);}}><header><h2>{column.label}{column.day && <span>{column.day}</span>}</h2>{column.date === MOCK_TODAY && <b>오늘</b>}<span>{column.tasks.filter(item => !done.includes(item.id)).length}</span></header>{period === 'week' && <div className="rf-plan-meetings">{column.date === MOCK_TODAY ? MEETINGS.map(meeting => <div key={meeting.time}><Video size={11}/><time>{meeting.time}</time>{meeting.title}</div>) : column.date === '2026-10-22' ? <div><Video size={11}/><time>10:00</time>결제 설계 리뷰</div> : <span>등록된 일정 없음</span>}</div>}
        <div className="rf-plan-cards">{column.tasks.map(item => <article draggable={period === 'week'} onDragStart={event => {event.dataTransfer.setData('text/worklane-task', item.id); event.dataTransfer.effectAllowed='move';}} className={done.includes(item.id) ? 'complete' : ''} key={item.id}><div><button className="rf-checkbox" role="checkbox" aria-checked={done.includes(item.id)} aria-label={`${item.id} ${done.includes(item.id) ? '완료 취소' : '완료'}`} onClick={() => props.toggle(item.id)}>{done.includes(item.id) && <Check size={12}/>}</button><span>{item.id}</span><small>{timeLabel(item.minutes)}</small></div><button className="rf-card-title" onClick={() => props.open(item)}>{item.description}</button><footer>{done.includes(item.id) ? <span className="rf-card-done"><CheckCheck size={12}/>완료</span> : <State item={item}/>}<span>{item.dueOn ? '10/22 마감' : item.source}</span></footer><PlanDate item={item} schedule={props.schedule}/></article>)}{!column.tasks.length && <p className="rf-plan-empty">{period === 'week' ? plan.some(item => item.plannedOn === column.date && done.includes(item.id)) ? '계획한 일 모두 완료' : '계획한 일이 없어요' : '해당 업무가 없어요'}</p>}</div></section>)}</div>
      <section className="rf-week-backlog"><header><h2><Inbox size={15}/>아직 날짜를 정하지 않은 일<span>{backlog.length}</span></h2><span>날짜를 선택해 이번 주에 배치하세요</span></header><div>{backlog.map(item => <div key={item.id}><button onClick={() => props.open(item)}><small>{item.id}</small>{item.description}</button><PlanDate item={item} schedule={props.schedule}/></div>)}</div></section>
    </>}
  </>;
}

function Inspector({ item, plan, close, back, follow, schedule, notify }) {
  const [drafts, setDrafts] = useState({});
  const comment = drafts[item.id] || '';
  const setComment = text => setDrafts(current => ({...current, [item.id]: text}));
  const [comments, setComments] = useState([]);
  const review = item.kind === 'review';
  return <aside className="rf-inspector" aria-label="업무 미리보기"><header><div>{back && <button aria-label="이전 업무로" onClick={back}><ArrowLeft size={16}/></button>}<TypeIcon item={item}/><span>{item.kind === 'doc' ? 'Confluence 문서' : review ? 'GitLab · Merge request' : item.kind === 'pipeline' ? 'GitLab · Pipeline' : item.kind === 'personal' ? '개인 할 일' : item.kind === 'meeting' ? '일정' : item.kind === 'settings' ? '설정' : item.kind === 'notifications' ? '알림' : 'Jira 이슈'}</span></div><button aria-label="미리보기 닫기" onClick={close}><X size={18}/></button></header>
    <div className="rf-inspector-scroll" key={item.id}><span className="rf-object-key">{item.id.startsWith('DOC') ? 'Engineering / Payments' : item.kind === 'meeting' || ['settings','notifications'].includes(item.kind) ? '샘플 워크스페이스' : `${item.id} · ${item.repo || item.source || '내 계획'}`}</span><h2>{item.title}</h2>
      {item.kind === 'doc' ? <><p className="rf-object-subtitle">이민호 · 28분 전 수정</p>{item.id !== 'DOC-42' ? <div className="rf-document"><h3>{item.id === 'DOC-77' ? '서명 검증과 재전송' : '주문 상태 응답 계약'}</h3><p>{item.id === 'DOC-77' ? '원문 요청 본문과 시크릿으로 HMAC-SHA256 서명을 검증합니다. 타임스탬프가 5분을 벗어난 요청은 거절하고, 같은 이벤트 ID는 한 번만 처리합니다.' : '부분 환불과 전체 환불을 구분합니다. 기존 클라이언트의 상태 코드는 유지하며, 알 수 없는 결제사 응답은 명시적인 오류로 처리합니다.'}</p></div> : <div className="rf-document"><h3>결제 재시도 원칙</h3><p>네트워크 오류나 일시적인 결제사 장애가 발생한 요청만 자동으로 재시도합니다. 명확하게 거절된 결제는 다시 요청하지 않습니다.</p><h3>멱등성 보장</h3><p>API, 큐, 워커 전체에서 최초 요청의 멱등성 키를 유지합니다. 중복 실행되어도 결제 결과는 한 번만 반영합니다.</p><h3>재시도 간격</h3><ol><li>최초 실패 후 30초 대기</li><li>2분, 10분 간격으로 추가 요청</li><li>3회 실패하면 운영 확인 대상으로 전환</li></ol></div>}<button className="rf-related" onClick={() => follow(plan.find(task => task.id === (item.id === 'DOC-77' ? 'PAY-291' : item.id === 'DOC-88' ? 'API-128' : 'PAY-382')))}><CircleDot size={15}/>{item.id === 'DOC-77' ? 'PAY-291 · 환불 웹훅 서명 검증' : item.id === 'DOC-88' ? 'API-128 · 주문 API 리팩터링' : 'PAY-382 · 결제 재시도 로직 구현'}<ArrowRight size={14}/></button></> : item.kind === 'pipeline' ? <><div className="rf-pipeline-success"><CircleCheck size={18}/>모든 단계 통과<span>2분 41초</span></div>{[['검증','Lint · 타입 검사','18초'],['테스트','Unit 124 · Integration 38','1분 52초'],['빌드','payment-api:retry-381','31초']].map(([title,desc,time]) => <div className="rf-pipeline-stage" key={title}><CircleCheck size={16}/><div><b>{title}</b><span>{desc}</span></div><small>{time}</small></div>)}<p className="rf-private-note">브랜치 feat/payment-retry · 샘플 실행 결과</p><button className="rf-related" onClick={() => follow(linkedMR)}><GitPullRequest size={15}/>!381 · 결제 재시도 처리<ArrowRight size={14}/></button></> : item.kind === 'meeting' ? <><p className="rf-object-subtitle">{item.time}–{item.end} · 10월 21일</p><div className="rf-document"><h3>참석 및 안건</h3><p>{item.detail}</p><p>{item.title === '백엔드 싱크' ? '주문 API 상태 계약과 부분 환불 응답을 함께 확인합니다. MR !391을 회의 전에 살펴보세요.' : item.title === '스프린트 플래닝' ? 'Sprint 24의 남은 이슈와 다음 주 우선순위를 정리합니다.' : '진행 중인 업무, 막힌 부분과 오늘의 계획을 짧게 공유합니다.'}</p></div><button className="rf-related" onClick={() => follow(plan.find(task => task.id === '!391'))}><GitPullRequest size={15}/>연결된 리뷰 !391<ArrowRight size={14}/></button></> : item.kind === 'settings' ? <><p className="rf-object-subtitle">디자인 목업 · 실제 연동 정보는 사용하지 않습니다.</p>{['Jira Cloud','Confluence Cloud','GitLab Self-hosted','Anthropic API'].map(title => <div className="rf-setting-row" key={title}><b>{title}</b><span>샘플 연결</span></div>)}</> : item.kind === 'notifications' ? <><p className="rf-object-subtitle">지금 확인할 일 3개</p>{[plan.find(task => task.id === '!391'),plan.find(task => task.id === 'PAY-291'),plan.find(task => task.id === 'OPS-91')].map(task => <button className="rf-related" key={task.id} onClick={() => follow(task)}><TypeIcon item={task}/>{task.id} · {task.title}<ArrowRight size={14}/></button>)}</> : <>
        <div className="rf-object-fields"><span>상태<State item={item}/></span><span>담당자<b>{item.by || '김윤'}</b></span>{plan.some(task => task.id === item.id) && <span>내 계획<PlanDate item={item} schedule={schedule}/></span>}{item.dueOn && <span>마감일<b className="rf-due">10월 22일</b></span>}</div>
        <div className="rf-document"><h3>{review ? '변경 요약' : '작업 내용'}</h3><p>{item.id === 'PAY-382' || item.id === '!381' ? '일시적인 결제 실패에 지수 백오프와 최대 3회 재시도를 적용합니다. API부터 큐·워커까지 같은 멱등성 키를 유지합니다.' : item.id === '!391' ? '부분 환불 주문이 취소 상태로 매핑되는 문제를 수정합니다. 상태 변환을 한곳에 모으고 기존 API 응답은 유지합니다.' : item.id === 'OPS-91' ? '08:42 배포 이후 증가한 payment-api의 5xx 응답을 조사합니다. 타임아웃과 중복 결제 요청의 상관관계를 확인합니다.' : item.id === 'PAY-291' ? '환불 웹훅의 HMAC 서명을 검증하고 재전송 요청과 위조 요청을 구분합니다. 테스트 및 검증에 45분을 계획했습니다.' : item.description}</p></div>
        {review ? <><div className="rf-mr-numbers"><span><FileCode2 size={14}/>{item.id === '!391' ? '8' : '12'}개 파일</span><b>+124</b><span>−38</span><i><Check size={12}/>CI 통과</i></div><h3 className="rf-subheading">변경 흐름</h3><div className="rf-code-flow"><span>Controller</span><ArrowRight size={14}/><span>{item.id === '!391' ? 'OrderMapper' : 'RetryService'}</span><ArrowRight size={14}/><span>{item.id === '!391' ? 'OrderStatus' : 'Queue'}</span></div><div className="rf-review-guide"><h3><Sparkles size={14}/>리뷰 시작점<span>AI 초안</span></h3><p>{item.id === '!391' ? '부분 환불과 전체 환불이 구분되는지, 기존 상태 응답이 유지되는지 확인하세요.' : '멱등성 키가 경계 사이에서 유지되는지, 중복 실행이 안전한지 확인하세요.'}</p></div><form className="rf-comment" onSubmit={event => {event.preventDefault(); if(comment.trim()){setComments(current=>[...current,{id:item.id,text:comment.trim()}]);setComment('');}}}><label htmlFor="rf-review-comment">내 리뷰 메모</label>{comments.filter(entry => entry.id === item.id).map((entry,index) => <p key={index}>{entry.text}</p>)}<textarea id="rf-review-comment" value={comment} onChange={event => setComment(event.target.value)} placeholder="확인할 부분을 적어두세요…"/><div><span>이 목업에만 보관</span><button className="rf-small-button" disabled={!comment.trim()}>메모 남기기</button></div></form></> : item.kind !== 'personal' && <><h3 className="rf-subheading">연결된 업무</h3>{relatedObjects(item, plan).map(object => <button className="rf-related" key={object.id} onClick={() => follow(object)}><TypeIcon item={object}/>{object.kind === 'doc' ? object.title : `${object.id} · ${object.title}`}{object.kind === 'pipeline' && <span className="rf-success">통과</span>}<ArrowRight size={14}/></button>)}{!relatedObjects(item,plan).length && <p className="rf-private-note">아직 연결된 업무가 없습니다.</p>}</>}
        {plan.some(task => task.id === item.id) && <div className="rf-inspector-actions"><button className="rf-button" onClick={() => schedule(item.id, '2026-10-22')}><CalendarDays size={14}/>내일로 옮기기</button><button className="rf-button" onClick={() => notify(`${item.id} · 계획은 이 목업에서만 변경됩니다.`)}><ShieldCheck size={14}/>내 계획</button></div>}
      </>}
    </div>
  </aside>;
}

function AssistantPane({ close, open, plan, schedule }) {
  const [pending, setPending] = useState(false);
  const alreadyTomorrow = plan.find(item => item.id === 'API-128')?.plannedOn === '2026-10-22';
  return <aside className="rf-inspector rf-assistant-pane" aria-label="Assistant 패널"><header><div><Sparkles size={16}/>Assistant</div><button aria-label="Assistant 닫기" onClick={close}><X size={18}/></button></header><div className="rf-inspector-scroll"><span className="rf-object-key">오늘의 업무 · 샘플 응답</span><h2>오늘은 이렇게 시작해요.</h2><p>리뷰 한 건을 먼저 확인하고, 결제 재시도 작업을 이어가면 좋겠어요.</p><button className="rf-assistant-suggestion" onClick={() => open(plan.find(item => item.id === '!391'))}><GitPullRequest size={17}/><span><b>주문 상태 매핑 리뷰</b><small>박지윤님이 18시간째 기다리고 있어요.</small></span><ArrowRight size={15}/></button><button className="rf-assistant-suggestion" onClick={() => open(plan.find(item => item.id === 'PAY-382'))}><CircleDot size={17}/><span><b>결제 재시도 로직 이어가기</b><small>관련 MR과 문서가 연결되어 있어요.</small></span><ArrowRight size={15}/></button><div className="rf-assistant-schedule"><b>오늘 못 끝낼 일이 있나요?</b><p>{alreadyTomorrow ? 'API-128은 이미 내일 계획에 있어요.' : 'API-128을 내일로 옮길 수 있어요.'}</p>{alreadyTomorrow ? null : pending ? <div><span>API-128 · 10/21 → 10/22</span><button className="rf-button rf-primary" onClick={() => {schedule('API-128','2026-10-22');setPending(false);}}>확인하고 옮기기</button><button className="rf-small-button" onClick={() => setPending(false)}>취소</button></div> : <button className="rf-button" onClick={() => setPending(true)}>내일 계획으로 옮기기</button>}</div></div></aside>;
}

function SearchPalette({ term, setTerm, plan, close, open }) {
  const [index, setIndex] = useState(0);
  const matches = [...plan,linkedDoc,linkedMR,linkedPipeline].filter(item => `${item.id} ${item.description || ''} ${item.title}`.toLowerCase().includes(term.toLowerCase())).slice(0,7);
  return <div className="rf-search-backdrop" onClick={close}><section className="rf-search-palette" role="dialog" aria-modal="true" aria-label="전체 검색" onClick={event => event.stopPropagation()}><label><Search size={20}/><input autoFocus aria-label="검색어" placeholder="이슈, MR, 문서, 할 일 찾기…" value={term} onChange={event => {setTerm(event.target.value);setIndex(0);}} onKeyDown={event => {if(event.key === 'ArrowDown'){event.preventDefault();setIndex(current=>Math.min(current+1,matches.length-1));} if(event.key === 'ArrowUp'){event.preventDefault();setIndex(current=>Math.max(0,current-1));} if(event.key === 'Enter'&&matches[index]) open(matches[index]);}}/><button aria-label="검색 닫기" onClick={close}><kbd>esc</kbd></button></label><p>{term ? '검색 결과' : '최근 업무'}</p>{matches.map((item,position) => <button className={position === index ? 'selected' : ''} key={item.id} onClick={() => open(item)}><TypeIcon item={item}/><span><b>{item.description || item.title}</b><small>{item.id} · {item.repo || item.source}</small></span><ArrowRight size={15}/></button>)}{!matches.length && <div className="rf-search-empty">일치하는 업무가 없습니다.</div>}<footer><span>↑ ↓ 이동</span><span>↵ 미리보기</span><span>esc 닫기</span></footer></section></div>;
}
