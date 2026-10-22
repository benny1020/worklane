import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  GitPullRequest,
  History,
  Home,
  Inbox,
  Layers,
  LayoutDashboard,
  Link2,
  List,
  LockKeyhole,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import WikiEditor from './WikiEditor.jsx';
import {
  WIKI_STORE,
  SPACES,
  TEMPLATES,
  initialWikiState,
  restoreWikiState,
  searchPages,
  saveWikiDraft,
  publishWikiDraft,
  discardWikiDraft,
  pageAncestors,
  createWikiPage,
  documentText,
} from './wiki-model.js';
import './planner.css';
import './wiki.css';

const NAV = [
  ['home', '위키 홈', Home],
  ['spaces', '스페이스', FolderOpen],
  ['recent', '최근 본 문서', Clock3],
  ['favorites', '즐겨찾기', Star],
  ['drafts', '내 초안', Pencil],
];
const read = () => {
  try {
    return restoreWikiState(JSON.parse(localStorage.getItem(WIKI_STORE)));
  } catch {
    return initialWikiState();
  }
};
const date = (value) =>
  new Date(value).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
  });
const spaceOf = (page) => SPACES.find((s) => s.id === page?.space) || SPACES[0];

function Dialog({ title, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    ref.current
      ?.querySelector('input:not([type="hidden"]), textarea, select')
      ?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`wiki-dialog ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="대화상자 닫기" onClick={close}>
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export default function WikiMock({ route, navigate, onPlanner }) {
  const [data, setData] = useState(read),
    [saved, setSaved] = useState(true);
  const [collapsed, setCollapsed] = useState(false),
    [treeHidden, setTreeHidden] = useState(false),
    [focus, setFocus] = useState(false);
  const [space, setSpace] = useState('pay'),
    [branches, setBranches] = useState([
      'payments-guide',
      'order-guide',
      'onboarding',
    ]);
  const [query, setQuery] = useState(''),
    [filterSpace, setFilterSpace] = useState('');
  const [panel, setPanel] = useState('outline'),
    [commentFilter, setCommentFilter] = useState('open');
  const [modal, setModal] = useState(null),
    [toast, setToast] = useState(''),
    [searchIndex, setSearchIndex] = useState(0);
  const [commentText, setCommentText] = useState(''),
    [quote, setQuote] = useState(''),
    [replyTo, setReplyTo] = useState(null);
  const [preview, setPreview] = useState(null),
    [revision, setRevision] = useState(null),
    [publishNote, setPublishNote] = useState('');
  const [newTitle, setNewTitle] = useState(''),
    [newSpace, setNewSpace] = useState('pay'),
    [newParent, setNewParent] = useState(''),
    [template, setTemplate] = useState('spec');
  const [editor, setEditor] = useState(null),
    [headings, setHeadings] = useState([]),
    [activeHeading, setActiveHeading] = useState(0);
  const contentScroll = useRef(null),
    commentRef = useRef(null);
  const page = data.pages.find((p) => p.id === route.page);
  const editing = route.edit === '1' && !!page;
  const tab = NAV.some((n) => n[0] === route.tab) ? route.tab : 'home';
  const draft = page && data.drafts[page.id];
  const visibleContent = editing
    ? draft?.content || page.content
    : page?.content;
  const title = editing ? (draft?.title ?? page.title) : page?.title;
  const comments = data.comments.filter((c) => c.pageId === page?.id);
  const openComments = comments.filter((c) => !c.resolved);
  const searchResults = searchPages(
    data,
    query,
    modal === 'search' ? '' : filterSpace,
  );
  const visiblePages =
    tab === 'recent'
      ? data.recent
          .map((id) => searchResults.find((p) => p.id === id))
          .filter(Boolean)
      : searchResults
          .filter((p) =>
            tab === 'favorites'
              ? data.favorites.includes(p.id)
              : tab === 'drafts'
                ? !!data.drafts[p.id]
                : p.published,
          )
          .sort((a, b) => (query ? 0 : b.updated.localeCompare(a.updated)));
  const pageSpace = page ? spaceOf(page) : SPACES.find((s) => s.id === space);
  const ancestors = page ? pageAncestors(data.pages, page) : [];
  const previewPage = data.pages.find((p) => p.id === preview);

  useEffect(() => {
    try {
      localStorage.setItem(WIKI_STORE, JSON.stringify(data));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [data]);
  useEffect(() => {
    if (!page) return;
    setSpace(page.space);
    setPanel('outline');
    setQuote('');
    setCommentText('');
    setReplyTo(null);
    setPreview(null);
    setRevision(null);
    setActiveHeading(0);
    setBranches((values) => [
      ...new Set([
        ...values,
        ...pageAncestors(data.pages, page).map((p) => p.id),
      ]),
    ]);
    setData((s) => ({
      ...s,
      recent: [page.id, ...s.recent.filter((id) => id !== page.id)].slice(
        0,
        20,
      ),
    }));
    contentScroll.current?.scrollTo({ top: 0 });
  }, [page?.id]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function keys(e) {
      if (e.isComposing || !(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setSearchIndex(0);
        setModal('search');
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        startNew();
      }
      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setModal('assistant');
      }
      if (e.key.toLowerCase() === 's' && editing) {
        e.preventDefault();
        setToast(
          saved
            ? '이 브라우저에 초안을 저장했어요.'
            : '저장소를 사용할 수 없어요. 현재 탭을 유지해주세요.',
        );
      }
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  const ready = useCallback((e) => {
    setEditor(e);
  }, []);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const update = () => {
      const items = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading')
          items.push({ title: node.textContent, level: node.attrs.level, pos });
      });
      setHeadings(items);
    };
    update();
    editor.on('update', update);
    return () => editor.off('update', update);
  }, [editor, visibleContent]);

  function go(params) {
    setModal(null);
    setQuery('');
    setFilterSpace('');
    setPreview(null);
    setFocus(false);
    navigate({ view: 'wiki', ...params });
  }
  function openPage(p) {
    go({
      page: p.id,
      ...(p.published && !(tab === 'drafts' && data.drafts[p.id])
        ? {}
        : { edit: '1' }),
    });
  }
  function favorite(id) {
    setData((s) => ({
      ...s,
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((v) => v !== id)
        : [...s.favorites, id],
    }));
  }
  function save(changes) {
    setData((s) =>
      saveWikiDraft(s, page.id, {
        title: draft?.title ?? page.title,
        content: draft?.content || page.content,
        ...changes,
      }),
    );
  }
  function startEdit() {
    if (!draft)
      setData((s) =>
        saveWikiDraft(s, page.id, { title: page.title, content: page.content }),
      );
    go({ page: page.id, edit: '1' });
  }
  function startNew(parent = '') {
    setNewTitle('');
    setNewSpace(data.pages.find((p) => p.id === parent)?.space || space);
    setNewParent(parent);
    setTemplate('spec');
    setModal('create');
  }
  function create(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const result = createWikiPage(data, {
      title: newTitle,
      space: newSpace,
      parent: newParent,
      template,
    });
    setData(result.state);
    go({ page: result.id, edit: '1' });
  }
  function beginComment(value = '') {
    setQuote(value.trim());
    setReplyTo(null);
    setPanel('comments');
    setCommentFilter('open');
    requestAnimationFrame(() => commentRef.current?.focus());
  }
  function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (replyTo)
      setData((s) => ({
        ...s,
        comments: s.comments.map((c) =>
          c.id === replyTo
            ? {
                ...c,
                replies: [
                  ...c.replies,
                  {
                    id: crypto.randomUUID(),
                    body: commentText.trim(),
                    author: '김윤',
                    time: '방금',
                  },
                ],
              }
            : c,
        ),
      }));
    else
      setData((s) => ({
        ...s,
        comments: [
          ...s.comments,
          {
            id: crypto.randomUUID(),
            pageId: page.id,
            author: '김윤',
            initials: 'YK',
            body: commentText.trim(),
            quote,
            version: page.version,
            resolved: false,
            time: '방금',
            replies: [],
          },
        ],
      }));
    setCommentText('');
    setQuote('');
    setReplyTo(null);
    setToast('댓글을 목업에 저장했어요. 외부 알림은 보내지 않습니다.');
  }
  function jumpHeading(index) {
    const node = editor?.view.dom.querySelectorAll('h2,h3')[index];
    if (node) {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' });
      setActiveHeading(index);
    }
  }
  function quoteLocation(c) {
    let found = null;
    editor?.state.doc.descendants((node, pos) => {
      if (node.isText && found === null) {
        const index = node.text.indexOf(c.quote);
        if (index >= 0) found = pos + index;
      }
    });
    if (found !== null)
      editor
        .chain()
        .setTextSelection({ from: found, to: found + c.quote.length })
        .scrollIntoView()
        .run();
    else
      setToast(
        `v${c.version}의 인용문이에요. 현재 본문에서는 찾을 수 없습니다.`,
      );
  }
  function tree(parent = null, depth = 0) {
    return data.pages
      .filter((p) => p.space === space && p.parent === parent)
      .map((p) => {
        const children = data.pages.some((c) => c.parent === p.id),
          expanded = branches.includes(p.id);
        return (
          <React.Fragment key={p.id}>
            <div
              className={`wiki-tree-row ${page?.id === p.id ? 'selected' : ''}`}
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              {children ? (
                <button
                  className="tree-toggle"
                  aria-label={`${p.title} ${expanded ? '접기' : '펼치기'}`}
                  aria-expanded={expanded}
                  onClick={() =>
                    setBranches((s) =>
                      expanded ? s.filter((id) => id !== p.id) : [...s, p.id],
                    )
                  }
                >
                  {expanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                </button>
              ) : (
                <span className="tree-indent" />
              )}
              <button
                className="tree-page"
                title={p.title}
                aria-current={page?.id === p.id ? 'page' : undefined}
                onClick={() => openPage(p)}
              >
                <FileText size={14} />
                <span>{p.title}</span>
                {!p.published && <i className="wiki-draft-dot" title="초안" />}
              </button>
              <button
                className="tree-add"
                aria-label={`${p.title} 하위 페이지 추가`}
                onClick={() => startNew(p.id)}
              >
                <Plus size={12} />
              </button>
            </div>
            {expanded && tree(p.id, depth + 1)}
          </React.Fragment>
        );
      });
  }
  function pageRows(pages) {
    return (
      <div className="wiki-page-table">
        <div className="wiki-table-head">
          <span>페이지</span>
          <span>스페이스</span>
          <span>업데이트</span>
          <span />
        </div>
        {pages.map((p) => (
          <div key={p.id} className="wiki-page-row">
            <button className="wiki-page-name" onClick={() => openPage(p)}>
              <span className={`wiki-file-icon ${spaceOf(p).color}`}>
                <FileText size={17} />
              </span>
              <span>
                <b>
                  {tab === 'drafts'
                    ? data.drafts[p.id]?.title || p.title
                    : p.title}
                </b>
                <small>
                  {p.author} · {p.type}
                  {data.drafts[p.id] && ' · 작성 중인 초안'}
                </small>
              </span>
              {p.status === '검토 중' && (
                <i className="wiki-pill amber">검토 중</i>
              )}
            </button>
            <span className={`wiki-space-label ${spaceOf(p).color}`}>
              {spaceOf(p).name}
            </span>
            <span className="wiki-date">
              {date(
                tab === 'drafts'
                  ? data.drafts[p.id]?.savedAt || p.updated
                  : p.updated,
              )}
            </span>
            <button
              className={`wiki-star ${data.favorites.includes(p.id) ? 'on' : ''}`}
              aria-label={`${p.title} 즐겨찾기 ${data.favorites.includes(p.id) ? '해제' : '추가'}`}
              aria-pressed={data.favorites.includes(p.id)}
              onClick={() => favorite(p.id)}
            >
              <Star size={15} />
            </button>
          </div>
        ))}
        {!pages.length && (
          <div className="wiki-empty">
            <Search size={24} />
            <h3>일치하는 문서가 없어요</h3>
            <p>검색어나 스페이스 필터를 바꿔보세요.</p>
            <button
              className="button"
              onClick={() => {
                setQuery('');
                setFilterSpace('');
              }}
            >
              필터 지우기
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`planner-app wiki-app ${collapsed || focus ? 'nav-collapsed' : ''}`}
    >
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">w</span>
          <b>worklane</b>
          <span className="brand-version">BETA</span>
        </div>
        <div className="workspace">
          <span className="workspace-icon">P</span>
          <span>
            <b>Platform</b>
            <small>나의 워크스페이스</small>
          </span>
        </div>
        <button
          className="nav-search"
          onClick={() => {
            setQuery('');
            setModal('search');
          }}
        >
          <Search size={15} />
          <span>빠르게 찾기</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="nav-caption">MY WORKSPACE</span>
        <nav>
          <button title="내 플래너" onClick={() => onPlanner()}>
            <LayoutDashboard size={17} />
            <span>내 플래너</span>
          </button>
          <button
            title="계획함"
            onClick={() => onPlanner('today', { backlog: '1' })}
          >
            <Inbox size={17} />
            <span>계획함</span>
          </button>
          <button
            title="Jira 업무"
            onClick={() => onPlanner('sprint', { filter: 'jira' })}
          >
            <Layers size={17} />
            <span>Jira 업무</span>
          </button>
          <button
            title="코드 리뷰"
            onClick={() => onPlanner('sprint', { filter: 'review' })}
          >
            <GitPullRequest size={17} />
            <span>코드 리뷰</span>
          </button>
          <button
            title="위키"
            className="active"
            onClick={() => go({ tab: 'home' })}
          >
            <BookOpen size={17} />
            <span>위키</span>
            <span className="nav-dot" />
          </button>
        </nav>
        <div className="sidebar-note">
          <span>기록은 다음 작업의 시작점.</span>
          <small>결정의 이유까지 함께 남겨요.</small>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <button
            title="Confluence 연결 정보"
            onClick={() => setModal('connection')}
          >
            <Settings2 size={16} />
            <span>Confluence 연결</span>
          </button>
          <div className="profile">
            <span className="avatar">YK</span>
            <span>
              <b>김윤</b>
              <small>Platform engineer</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div>
            <button
              className="icon-button"
              aria-label={collapsed ? '전체 메뉴 펼치기' : '전체 메뉴 접기'}
              onClick={() => setCollapsed(!collapsed)}
            >
              <PanelLeft size={17} />
            </button>
            <i />
            <button onClick={() => go({ tab: 'home' })}>워크스페이스</button>
            <ChevronRight size={12} />
            <b>위키</b>
          </div>
          <div>
            <span className="demo-badge">Confluence · 샘플 스페이스</span>
            <button
              className="assistant-trigger"
              onClick={() => setModal('assistant')}
            >
              <Sparkles size={15} />
              Assistant <kbd>⌘ J</kbd>
            </button>
            <span className="avatar small">YK</span>
          </div>
        </header>
        <div
          className={`wiki-layout ${treeHidden || focus ? 'tree-hidden' : ''}`}
        >
          {!treeHidden && !focus && (
            <aside className="wiki-navigation" aria-label="위키 탐색">
              <div className="wiki-nav-heading">
                <b>지식 라이브러리</b>
                <button aria-label="새 페이지" onClick={() => startNew()}>
                  <Plus size={17} />
                </button>
              </div>
              <nav className="wiki-views">
                {NAV.map(([id, name, I]) => (
                  <button
                    key={id}
                    className={!page && tab === id ? 'active' : ''}
                    aria-current={!page && tab === id ? 'page' : undefined}
                    onClick={() => go({ tab: id })}
                  >
                    <I size={15} />
                    <span>{name}</span>
                    {id === 'drafts' && (
                      <small>{Object.keys(data.drafts).length}</small>
                    )}
                  </button>
                ))}
              </nav>
              <div className="wiki-tree-label">
                <span>스페이스 탐색</span>
                <button
                  aria-label="스페이스 목록"
                  onClick={() => go({ tab: 'spaces' })}
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
              <label className="wiki-space-picker">
                <span
                  className={`wiki-space-mark ${SPACES.find((s) => s.id === space).color}`}
                >
                  {SPACES.find((s) => s.id === space).key.slice(0, 1)}
                </span>
                <select
                  aria-label="탐색할 스페이스"
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                >
                  {SPACES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="wiki-tree"
                role="navigation"
                aria-label="페이지 트리"
              >
                {tree()}
              </div>
              <button className="wiki-tree-new" onClick={() => startNew()}>
                <Plus size={14} />
                페이지 추가
              </button>
              <div className="wiki-nav-footer">
                <BookOpen size={15} />
                <div>
                  <b>Confluence Cloud</b>
                  <small>샘플 데이터 · 로컬 편집</small>
                </div>
                <LockKeyhole size={12} />
              </div>
            </aside>
          )}
          <main className="wiki-main">
            {page ? (
              <>
                <div className="wiki-document-bar">
                  <div className="wiki-breadcrumb">
                    <button
                      aria-label={
                        treeHidden ? '페이지 트리 펼치기' : '페이지 트리 접기'
                      }
                      onClick={() => setTreeHidden(!treeHidden)}
                    >
                      <PanelLeft size={15} />
                    </button>
                    <button
                      onClick={() => {
                        go({ tab: 'spaces' });
                        setFilterSpace(page.space);
                      }}
                    >
                      {pageSpace.name}
                    </button>
                    {ancestors.map((a) => (
                      <React.Fragment key={a.id}>
                        <ChevronRight size={12} />
                        <button title={a.title} onClick={() => openPage(a)}>
                          {a.title}
                        </button>
                      </React.Fragment>
                    ))}
                    <ChevronRight size={12} />
                    <span>{editing ? '편집 중' : page.type}</span>
                  </div>
                  <div className="wiki-document-actions">
                    {editing ? (
                      <>
                        <span
                          className={`wiki-save-state ${saved ? '' : 'error'}`}
                          role="status"
                        >
                          {saved ? <Check size={13} /> : <X size={13} />}
                          {saved ? '초안 저장됨' : '저장 실패'}
                        </span>
                        <button
                          className="button"
                          onClick={() =>
                            go(
                              page.published
                                ? { page: page.id }
                                : { tab: 'drafts' },
                            )
                          }
                        >
                          초안 닫기
                        </button>
                        <button
                          className="icon-button"
                          aria-label="초안 버리기"
                          title="초안 버리기"
                          onClick={() => setModal('discard')}
                        >
                          <X size={15} />
                        </button>
                        <button
                          className="button primary"
                          disabled={!title?.trim() || !saved}
                          onClick={() => {
                            setPublishNote('');
                            setModal('publish');
                          }}
                        >
                          게시 검토
                          <ArrowRight size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={`icon-button wiki-star ${data.favorites.includes(page.id) ? 'on' : ''}`}
                          aria-label="현재 문서 즐겨찾기"
                          aria-pressed={data.favorites.includes(page.id)}
                          onClick={() => favorite(page.id)}
                        >
                          <Star size={16} />
                        </button>
                        <button
                          className="wiki-comment-toggle"
                          aria-label={`댓글 ${openComments.length}개 열기`}
                          onClick={() =>
                            setPanel(
                              panel === 'comments' ? 'outline' : 'comments',
                            )
                          }
                        >
                          <MessageSquare size={15} />
                          {openComments.length}
                        </button>
                        <button
                          className="icon-button"
                          aria-label="문서 버전 기록"
                          onClick={() => {
                            setRevision(page.versions[0]);
                            setModal('history');
                          }}
                        >
                          <History size={16} />
                        </button>
                        <button className="button primary" onClick={startEdit}>
                          <Pencil size={14} />
                          {draft ? '초안 이어쓰기' : '편집'}
                        </button>
                      </>
                    )}
                    <button
                      className="icon-button"
                      title={focus ? '집중 모드 해제' : '집중 모드'}
                      aria-label={focus ? '집중 모드 해제' : '집중 모드'}
                      onClick={() => setFocus(!focus)}
                    >
                      {focus ? (
                        <Minimize2 size={15} />
                      ) : (
                        <Maximize2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
                {draft && !editing && (
                  <div className="wiki-draft-banner">
                    <Pencil size={13} />
                    게시된 문서와 별도로 저장된 내 초안이 있어요.
                    <button onClick={startEdit}>
                      이어서 편집 <ArrowRight size={12} />
                    </button>
                  </div>
                )}
                <div
                  className={`wiki-reading-layout ${focus ? 'focused' : ''}`}
                >
                  <div className="wiki-content-scroll" ref={contentScroll}>
                    <article
                      className={`wiki-document ${editing ? 'editing' : ''}`}
                    >
                      <div className="wiki-document-kicker">
                        <span className={`wiki-pill ${editing ? 'amber' : ''}`}>
                          {editing ? (
                            '내 초안'
                          ) : (
                            <>
                              <CheckCheck size={12} /> {page.status}
                            </>
                          )}
                        </span>
                        <span>
                          {page.type} · {pageSpace.key}
                        </span>
                      </div>
                      {editing ? (
                        <input
                          className="wiki-title-input"
                          aria-label="문서 제목"
                          value={title}
                          onChange={(e) => save({ title: e.target.value })}
                          placeholder="페이지 제목"
                        />
                      ) : (
                        <h1>{page.title}</h1>
                      )}
                      <div className="wiki-document-meta">
                        <span className="wiki-author-avatar">
                          {page.author.slice(-2)}
                        </span>
                        <span>{page.author}</span>
                        <i /> <span>{date(page.updated)} 업데이트</span>
                        <i />
                        <span>v{page.version || '초안'}</span>
                        <span className="wiki-reading-time">
                          {Math.max(
                            1,
                            Math.ceil(
                              documentText(visibleContent).length / 450,
                            ),
                          )}
                          분 읽기
                        </span>
                      </div>
                      {!editing && (
                        <div className="wiki-labels">
                          {page.labels.map((l) => (
                            <button
                              key={l}
                              onClick={() => {
                                go({ tab: 'home' });
                                setQuery(l);
                              }}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      )}
                      {editing && (
                        <p className="wiki-edit-explainer">
                          변경은 내 초안에 자동 저장됩니다. 게시 전까지 읽기
                          화면에는 이전 버전이 표시돼요.
                        </p>
                      )}
                      <WikiEditor
                        key={page.id}
                        content={visibleContent}
                        editing={editing}
                        onChange={(content) => save({ content })}
                        onReady={ready}
                        onComment={beginComment}
                      />
                      {!editing && (
                        <footer className="wiki-document-end">
                          <span>여기까지 읽었어요.</span>
                          <button
                            className="button"
                            onClick={() => beginComment()}
                          >
                            <MessageSquare size={14} />
                            의견 남기기
                          </button>
                          <button
                            className="button"
                            onClick={() => startNew(page.id)}
                          >
                            <Plus size={14} />
                            하위 문서 만들기
                          </button>
                        </footer>
                      )}
                    </article>
                  </div>
                  {!focus && (
                    <aside className="wiki-context" aria-label="문서 맥락">
                      <nav className="wiki-context-tabs" aria-label="문서 정보">
                        {[
                          ['outline', '목차'],
                          ['comments', `댓글 ${openComments.length}`],
                          ['context', '연결'],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className={panel === id ? 'active' : ''}
                            aria-pressed={panel === id}
                            onClick={() => setPanel(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                      {panel === 'outline' && (
                        <>
                          <div className="wiki-context-section">
                            <span className="wiki-section-eyebrow">
                              이 페이지에서
                            </span>
                            <nav className="wiki-outline">
                              {headings.map((h, i) => (
                                <button
                                  key={`${h.pos}-${i}`}
                                  className={
                                    activeHeading === i ? 'active' : ''
                                  }
                                  style={{
                                    paddingLeft: 12 + (h.level - 2) * 12,
                                  }}
                                  onClick={() => jumpHeading(i)}
                                >
                                  <span>{String(i + 1).padStart(2, '0')}</span>
                                  {h.title || '제목 없음'}
                                </button>
                              ))}
                            </nav>
                            {!headings.length && (
                              <p className="wiki-muted">
                                제목을 추가하면 목차가 생겨요.
                              </p>
                            )}
                          </div>
                          <div className="wiki-context-section">
                            <span className="wiki-section-eyebrow">
                              연결된 업무
                            </span>
                            <button
                              className="wiki-linked-work"
                              onClick={() => {
                                setPanel('context');
                                setPreview('issue');
                              }}
                            >
                              <Layers size={15} />
                              <span>
                                <b>
                                  {page.space === 'pay'
                                    ? 'PAY-382'
                                    : page.space === 'api'
                                      ? 'API-128'
                                      : 'OPS-91'}
                                </b>
                                <small>
                                  {page.space === 'pay'
                                    ? '결제 재시도 로직 구현'
                                    : page.space === 'api'
                                      ? '주문 API 리팩터링'
                                      : '운영 안정성 개선'}
                                </small>
                              </span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                          <div className="wiki-context-section wiki-reading-tip">
                            <MessageSquare size={17} />
                            <p>
                              궁금한 문장을 선택해
                              <br />그 자리에 의견을 남겨보세요.
                            </p>
                          </div>
                        </>
                      )}
                      {panel === 'comments' && (
                        <>
                          <div className="wiki-comments-filter">
                            <button
                              aria-pressed={commentFilter === 'open'}
                              onClick={() => setCommentFilter('open')}
                            >
                              진행 중 {openComments.length}
                            </button>
                            <button
                              aria-pressed={commentFilter === 'resolved'}
                              onClick={() => setCommentFilter('resolved')}
                            >
                              해결됨 {comments.length - openComments.length}
                            </button>
                          </div>
                          <div className="wiki-comments-list">
                            {comments
                              .filter(
                                (c) =>
                                  c.resolved === (commentFilter === 'resolved'),
                              )
                              .map((c) => (
                                <article key={c.id} className="wiki-comment">
                                  <header>
                                    <span className="wiki-author-avatar">
                                      {c.initials}
                                    </span>
                                    <b>{c.author}</b>
                                    <small>{c.time}</small>
                                  </header>
                                  {c.quote && (
                                    <button
                                      className="wiki-comment-quote"
                                      onClick={() => quoteLocation(c)}
                                    >
                                      <QuoteIcon />
                                      {c.quote}
                                      <small>본문 위치 · v{c.version}</small>
                                    </button>
                                  )}
                                  <p>{c.body}</p>
                                  {c.replies.map((r) => (
                                    <div className="wiki-reply" key={r.id}>
                                      <b>{r.author}</b>
                                      <p>{r.body}</p>
                                    </div>
                                  ))}
                                  <footer>
                                    <button
                                      onClick={() => {
                                        setReplyTo(c.id);
                                        setQuote('');
                                        requestAnimationFrame(() =>
                                          commentRef.current?.focus(),
                                        );
                                      }}
                                    >
                                      답글
                                    </button>
                                    <button
                                      onClick={() =>
                                        setData((s) => ({
                                          ...s,
                                          comments: s.comments.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  resolved: !item.resolved,
                                                }
                                              : item,
                                          ),
                                        }))
                                      }
                                    >
                                      {c.resolved ? (
                                        '다시 열기'
                                      ) : (
                                        <>
                                          <Check size={12} />
                                          해결
                                        </>
                                      )}
                                    </button>
                                  </footer>
                                </article>
                              ))}
                            {!comments.some(
                              (c) =>
                                c.resolved === (commentFilter === 'resolved'),
                            ) && (
                              <div className="wiki-empty small">
                                <CheckCheck size={22} />
                                <p>
                                  {commentFilter === 'open'
                                    ? '남아 있는 댓글이 없어요.'
                                    : '아직 해결된 댓글이 없어요.'}
                                </p>
                              </div>
                            )}
                          </div>
                          <form
                            className="wiki-comment-form"
                            onSubmit={submitComment}
                          >
                            {(quote || replyTo) && (
                              <div className="wiki-comment-target">
                                <span>
                                  {replyTo
                                    ? '선택한 댓글에 답글'
                                    : `“${quote}”`}
                                </span>
                                <button
                                  type="button"
                                  aria-label="댓글 연결 해제"
                                  onClick={() => {
                                    setQuote('');
                                    setReplyTo(null);
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                            <textarea
                              ref={commentRef}
                              aria-label="댓글 작성"
                              placeholder="생각이나 질문을 남겨보세요…"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                            />
                            <div>
                              <small>목업에만 저장</small>
                              <button
                                className="button primary"
                                disabled={!commentText.trim()}
                              >
                                댓글 남기기
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                      {panel === 'context' && (
                        <>
                          <div className="wiki-context-section">
                            <span className="wiki-section-eyebrow">
                              업무 맥락
                            </span>
                            <button
                              className="wiki-linked-work"
                              onClick={() => setPreview('issue')}
                            >
                              <Layers size={16} />
                              <span>
                                <b>
                                  {page.space === 'pay'
                                    ? 'PAY-382'
                                    : page.space === 'api'
                                      ? 'API-128'
                                      : 'OPS-91'}
                                </b>
                                <small>설계가 구현되는 업무</small>
                              </span>
                              <ChevronRight size={13} />
                            </button>
                            <button
                              className="wiki-linked-work"
                              onClick={() => setPreview('mr')}
                            >
                              <GitPullRequest size={16} />
                              <span>
                                <b>{page.space === 'api' ? '!391' : '!381'}</b>
                                <small>연결된 코드 변경</small>
                              </span>
                              <ChevronRight size={13} />
                            </button>
                            {(preview === 'issue' || preview === 'mr') && (
                              <div className="wiki-inline-preview">
                                <b>
                                  {preview === 'issue'
                                    ? '내 계획 · 진행 중'
                                    : 'MR · 리뷰 대기'}
                                </b>
                                <p>
                                  {preview === 'issue'
                                    ? '실패 조건과 멱등성 검증을 이번 주 작업에 반영합니다.'
                                    : 'Controller → PaymentService → RetryQueue. 중복 요청과 타임아웃 경계를 확인합니다.'}
                                </p>
                                <button
                                  onClick={() =>
                                    onPlanner(
                                      preview === 'issue' ? 'today' : 'sprint',
                                    )
                                  }
                                >
                                  플래너에서 보기 <ArrowUpRight size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="wiki-context-section">
                            <span className="wiki-section-eyebrow">
                              함께 읽는 문서
                            </span>
                            {data.pages
                              .filter(
                                (p) =>
                                  p.space === page.space &&
                                  p.id !== page.id &&
                                  p.published,
                              )
                              .slice(0, 3)
                              .map((p) => (
                                <button
                                  className="wiki-related-page"
                                  key={p.id}
                                  onClick={() =>
                                    setPreview(preview === p.id ? null : p.id)
                                  }
                                >
                                  <FileText size={14} />
                                  {p.title}
                                  <ChevronRight size={12} />
                                </button>
                              ))}
                            {previewPage && (
                              <div className="wiki-inline-preview">
                                <b>{previewPage.title}</b>
                                <p>{previewPage.summary}</p>
                                <button onClick={() => openPage(previewPage)}>
                                  문서 열기 <ArrowRight size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="wiki-context-section">
                            <span className="wiki-section-eyebrow">
                              문서 정보
                            </span>
                            <dl className="wiki-metadata">
                              <dt>관리자</dt>
                              <dd>{page.author}</dd>
                              <dt>위치</dt>
                              <dd>{pageSpace.name}</dd>
                              <dt>공유 범위</dt>
                              <dd>스페이스 멤버 · 샘플</dd>
                              <dt>버전</dt>
                              <dd>v{page.version}</dd>
                            </dl>
                            <button
                              className="wiki-text-button"
                              onClick={() => {
                                setRevision(page.versions[0]);
                                setModal('history');
                              }}
                            >
                              <History size={14} />
                              버전 기록 보기
                            </button>
                          </div>
                        </>
                      )}
                    </aside>
                  )}
                </div>
              </>
            ) : route.page ? (
              <div className="wiki-empty">
                <FileText size={32} />
                <h2>문서를 찾을 수 없어요</h2>
                <p>링크가 잘못되었거나 이 브라우저의 샘플에 없는 문서입니다.</p>
                <button
                  className="button primary"
                  onClick={() => go({ tab: 'home' })}
                >
                  위키 홈으로
                </button>
              </div>
            ) : (
              <div className="wiki-library-scroll">
                <div className="wiki-library-heading">
                  <div>
                    <span className="wiki-section-eyebrow">
                      KNOWLEDGE, CONNECTED
                    </span>
                    <h1>{NAV.find((n) => n[0] === tab)[1]}</h1>
                    <p>
                      {
                        {
                          home: '다시 찾을 지식, 이어갈 생각. 지금 하는 일과 가까운 문서부터.',
                          spaces: '팀의 지식을 주제별로 탐색하세요.',
                          recent: '마지막으로 읽었던 문서부터 이어보세요.',
                          favorites: '자주 찾는 기준과 절차를 가까이 두세요.',
                          drafts:
                            '아직 게시하지 않은 생각을 이어서 정리하세요.',
                        }[tab]
                      }
                    </p>
                  </div>
                  <button className="button primary" onClick={() => startNew()}>
                    <Plus size={15} />새 페이지 <kbd>⌘ N</kbd>
                  </button>
                </div>
                {tab === 'spaces' ? (
                  <>
                    <div className="wiki-space-grid">
                      {SPACES.map((s) => (
                        <button
                          key={s.id}
                          className={filterSpace === s.id ? 'selected' : ''}
                          onClick={() => {
                            setFilterSpace(filterSpace === s.id ? '' : s.id);
                            setSpace(s.id);
                          }}
                        >
                          <div>
                            <span className={`wiki-space-mark ${s.color}`}>
                              {s.key.slice(0, 1)}
                            </span>
                            <ArrowUpRight size={16} />
                          </div>
                          <h2>{s.name}</h2>
                          <p>{s.description}</p>
                          <footer>
                            <span>
                              {
                                data.pages.filter((p) => p.space === s.id)
                                  .length
                              }
                              개 페이지
                            </span>
                            <span>{s.owner}</span>
                          </footer>
                        </button>
                      ))}
                    </div>
                    <div className="wiki-list-heading">
                      <h2>
                        {filterSpace
                          ? SPACES.find((s) => s.id === filterSpace).name
                          : '모든 스페이스'}
                        의 문서
                      </h2>
                      {filterSpace && (
                        <button onClick={() => setFilterSpace('')}>
                          전체 보기
                        </button>
                      )}
                    </div>
                    {pageRows(searchResults)}
                  </>
                ) : (
                  <>
                    {tab === 'home' && !query && !filterSpace && (
                      <div className="wiki-home-top">
                        <section>
                          <div className="wiki-list-heading">
                            <h2>이어서 읽기</h2>
                            <button onClick={() => go({ tab: 'recent' })}>
                              전체 보기 <ArrowRight size={12} />
                            </button>
                          </div>
                          <div className="wiki-continue-grid">
                            {data.recent
                              .slice(0, 2)
                              .map((id) => data.pages.find((p) => p.id === id))
                              .filter(Boolean)
                              .map((p, i) => (
                                <button key={p.id} onClick={() => openPage(p)}>
                                  <div>
                                    <span
                                      className={`wiki-space-label ${spaceOf(p).color}`}
                                    >
                                      {spaceOf(p).name}
                                    </span>
                                    <ArrowUpRight size={15} />
                                  </div>
                                  <h3>{p.title}</h3>
                                  <p>
                                    {p.summary ||
                                      documentText(p.content).slice(0, 85)}
                                  </p>
                                  <footer>
                                    <Clock3 size={12} />
                                    <span>
                                      {i === 0
                                        ? '가장 최근에 읽은 문서'
                                        : '최근 열어본 문서'}
                                    </span>
                                  </footer>
                                </button>
                              ))}
                          </div>
                        </section>
                        <aside className="wiki-home-draft">
                          <div>
                            <Pencil size={17} />
                            <span>생각을 이어갈 시간</span>
                          </div>
                          <h3>
                            {Object.keys(data.drafts).length}개의 작성 중인 초안
                          </h3>
                          <p>
                            게시 전까지 안전하게 정리하세요.
                            <br />이 브라우저에 저장되어 있어요.
                          </p>
                          <button onClick={() => go({ tab: 'drafts' })}>
                            내 초안 이어쓰기 <ArrowRight size={14} />
                          </button>
                        </aside>
                      </div>
                    )}
                    <div className="wiki-library-filter">
                      <label>
                        <Search size={16} />
                        <input
                          aria-label="위키 문서 검색"
                          placeholder="제목, 내용, 라벨로 문서 찾기…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button
                            aria-label="검색 지우기"
                            onClick={() => setQuery('')}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </label>
                      <select
                        aria-label="문서 스페이스 필터"
                        value={filterSpace}
                        onChange={(e) => setFilterSpace(e.target.value)}
                      >
                        <option value="">모든 스페이스</option>
                        {SPACES.map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="wiki-list-heading">
                      <h2>
                        {query
                          ? `검색 결과 · ${visiblePages.length}`
                          : {
                              home: '최근 업데이트',
                              recent: '열어본 순서',
                              favorites: '즐겨찾는 문서',
                              drafts: '게시 전 초안',
                            }[tab]}
                      </h2>
                      <span>
                        {tab === 'drafts'
                          ? '내 브라우저에서만 보입니다'
                          : '제목을 누르면 바로 읽을 수 있어요'}
                      </span>
                    </div>
                    {pageRows(visiblePages)}
                    {tab === 'home' && (
                      <section className="wiki-home-templates">
                        <div className="wiki-list-heading">
                          <h2>좋은 기록의 시작</h2>
                          <span>자주 쓰는 문서 구조</span>
                        </div>
                        <div>
                          {Object.entries(TEMPLATES)
                            .filter(([id]) => id !== 'blank')
                            .map(([id, t]) => (
                              <button
                                key={id}
                                onClick={() => {
                                  startNew();
                                  setTemplate(id);
                                }}
                              >
                                <FileText size={17} />
                                <span>
                                  <b>{t.label}</b>
                                  <small>{t.description}</small>
                                </span>
                                <Plus size={14} />
                              </button>
                            ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
        <footer className="app-footer">
          <span>
            <i className={saved ? 'green-dot' : ''} />
            {saved
              ? '이 브라우저에 저장됨'
              : '저장소 사용 불가 · 현재 탭에만 유지'}
          </span>
          <span>Confluence 디자인 목업 · 외부 서버 반영 없음</span>
          <button onClick={() => setModal('connection')}>연결 정보</button>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="알림 닫기" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            {
              create: '새 페이지',
              search: '위키에서 빠르게 찾기',
              publish: '게시 전 확인',
              history: '버전 기록',
              connection: 'Confluence 연결 정보',
              discard: '초안을 버릴까요?',
              assistant: '문서와 함께 생각하기',
            }[modal]
          }
          close={() => setModal(null)}
          wide={modal === 'history'}
        >
          {modal === 'create' && (
            <form className="wiki-create-form" onSubmit={create}>
              <input
                autoFocus
                aria-label="새 페이지 제목"
                placeholder="무엇을 기록할까요?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
              <div className="wiki-create-location">
                <label>
                  스페이스
                  <select
                    value={newSpace}
                    onChange={(e) => {
                      setNewSpace(e.target.value);
                      setNewParent('');
                    }}
                  >
                    {SPACES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  상위 페이지
                  <select
                    aria-label="상위 페이지"
                    value={newParent}
                    onChange={(e) => setNewParent(e.target.value)}
                  >
                    <option value="">스페이스 최상위</option>
                    {data.pages
                      .filter((p) => p.space === newSpace && p.published)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <span className="wiki-section-eyebrow">시작할 템플릿</span>
              <div className="wiki-template-picker">
                {Object.entries(TEMPLATES).map(([id, t]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={template === id}
                    onClick={() => setTemplate(id)}
                  >
                    <FileText size={17} />
                    <span>
                      <b>{t.label}</b>
                      <small>{t.description}</small>
                    </span>
                    {template === id && <Check size={15} />}
                  </button>
                ))}
              </div>
              <footer>
                <span>먼저 내 초안으로 만들어집니다.</span>
                <button className="button primary" disabled={!newTitle.trim()}>
                  초안 만들기 <ArrowRight size={14} />
                </button>
              </footer>
            </form>
          )}
          {modal === 'search' && (
            <div className="wiki-search-dialog">
              <label>
                <Search size={19} />
                <input
                  autoFocus
                  aria-label="빠른 문서 검색"
                  placeholder="문서 제목이나 기억나는 내용…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSearchIndex((i) =>
                        Math.min(i + 1, searchResults.length - 1),
                      );
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSearchIndex((i) => Math.max(0, i - 1));
                    }
                    if (e.key === 'Enter' && searchResults[searchIndex])
                      openPage(searchResults[searchIndex]);
                  }}
                />
              </label>
              <span className="wiki-section-eyebrow">
                {query ? '문서 검색 결과' : '전체 문서'}
              </span>
              <div className="wiki-search-results">
                {searchResults.map((p, i) => (
                  <button
                    className={searchIndex === i ? 'active' : ''}
                    key={p.id}
                    onClick={() => openPage(p)}
                  >
                    <FileText size={17} />
                    <span>
                      <b>{p.title}</b>
                      <small>
                        {spaceOf(p).name} · {p.published ? p.type : '내 초안'}
                      </small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
                {!searchResults.length && (
                  <p>찾는 문서가 없어요. 다른 검색어를 입력해주세요.</p>
                )}
              </div>
              <footer>
                ↑ ↓ 선택 <span>↵ 문서 열기</span>
                <span>esc 닫기</span>
              </footer>
            </div>
          )}
          {modal === 'publish' && (
            <div className="wiki-publish">
              <span className="wiki-pill amber">로컬 게시 시뮬레이션</span>
              <h3>{title}</h3>
              <dl>
                <dt>게시 위치</dt>
                <dd>
                  {pageSpace.name}
                  {ancestors.length ? ` / ${ancestors.at(-1).title}` : ''}
                </dd>
                <dt>버전</dt>
                <dd>
                  v{page.version} → v{page.version + 1}
                </dd>
                <dt>반영 범위</dt>
                <dd>이 브라우저의 목업</dd>
              </dl>
              <label>
                변경 내용 요약 <small>선택</small>
                <textarea
                  autoFocus
                  aria-label="게시 변경 요약"
                  placeholder="어떤 내용을 보완했나요?"
                  value={publishNote}
                  onChange={(e) => setPublishNote(e.target.value)}
                />
              </label>
              <p>
                Confluence 서버나 다른 사람에게 전송하지 않습니다. 게시한 내용은
                버전 기록에서 다시 읽을 수 있어요.
              </p>
              <footer>
                <button className="button" onClick={() => setModal(null)}>
                  계속 편집
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    setData((s) => publishWikiDraft(s, page.id, publishNote));
                    go({ page: page.id });
                    setToast('새 버전을 목업에 게시했어요.');
                  }}
                >
                  샘플에 게시 <Check size={14} />
                </button>
              </footer>
            </div>
          )}
          {modal === 'history' && (
            <div className="wiki-history">
              <nav>
                {page.versions.map((v) => (
                  <button
                    key={v.version}
                    className={revision?.version === v.version ? 'active' : ''}
                    onClick={() => setRevision(v)}
                  >
                    <b>
                      v{v.version}{' '}
                      {v.version === page.version && <small>현재</small>}
                    </b>
                    <span>{v.note}</span>
                    <small>
                      {v.author} · {v.date}
                    </small>
                  </button>
                ))}
              </nav>
              <article>
                <span className="wiki-section-eyebrow">읽기 전용 스냅샷</span>
                <h3>{revision?.title}</h3>
                <p className="wiki-history-note">{revision?.note}</p>
                {revision && (
                  <WikiEditor
                    key={`version-${revision.version}`}
                    content={revision.content}
                    editing={false}
                    onChange={() => {}}
                    onReady={() => {}}
                    onComment={() => {}}
                  />
                )}
              </article>
            </div>
          )}
          {modal === 'discard' && page && (
            <div className="wiki-publish">
              <h3>{title}</h3>
              <p>
                {page.published
                  ? '게시하지 않은 내 변경 내용이 삭제됩니다. 기존 게시본과 버전 기록은 유지됩니다.'
                  : '이 페이지는 아직 게시되지 않았습니다. 내 초안에서 삭제됩니다. 하위 페이지는 현재 상위 위치로 옮겨집니다.'}
              </p>
              <footer>
                <button className="button" onClick={() => setModal(null)}>
                  계속 작성
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    setData((s) => discardWikiDraft(s, page.id));
                    go(page.published ? { page: page.id } : { tab: 'drafts' });
                    setToast('초안을 버렸어요.');
                  }}
                >
                  초안 버리기
                </button>
              </footer>
            </div>
          )}
          {modal === 'connection' && (
            <div className="wiki-info-dialog">
              <span className="wiki-pill">Confluence Cloud</span>
              <h3>연동 흐름을 검증하는 샘플입니다.</h3>
              <p>
                실제 앱은 별도의 사이트 URL과 토큰을 사용하는 기존 Confluence
                연동을 유지합니다. 이 목업에는 실제 계정 정보가 필요하지
                않습니다.
              </p>
              <dl>
                <dt>문서 원본</dt>
                <dd>샘플 스페이스 3개</dd>
                <dt>저장 위치</dt>
                <dd>현재 브라우저</dd>
                <dt>읽기 · 편집</dt>
                <dd>로컬 데이터에서 동작</dd>
                <dt>실시간 공동 편집</dt>
                <dd>이 목업 범위에 포함되지 않음</dd>
              </dl>
            </div>
          )}
          {modal === 'assistant' && (
            <div className="wiki-info-dialog">
              <span className="wiki-pill">
                <Sparkles size={12} />
                문서 맥락 · 샘플
              </span>
              <h3>{page ? page.title : '지식을 업무로 연결하기'}</h3>
              <p>
                {page
                  ? documentText(page.content).slice(0, 200)
                  : '문서를 열면 현재 문서와 연결된 업무를 함께 확인할 수 있어요.'}
              </p>
              <div className="wiki-assistant-actions">
                {page && (
                  <>
                    <button
                      className="button"
                      onClick={() => {
                        setModal(null);
                        setPanel('context');
                      }}
                    >
                      연결된 Jira·MR 보기 <ArrowRight size={14} />
                    </button>
                    <button
                      className="button"
                      onClick={() => {
                        setModal(null);
                        beginComment('');
                      }}
                    >
                      검토 의견 남기기 <MessageSquare size={14} />
                    </button>
                  </>
                )}
              </div>
              <small>
                위 내용은 문서 발췌입니다. AI 엔드포인트를 호출하지 않습니다.
              </small>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function QuoteIcon() {
  return <span className="wiki-quote-mark">“</span>;
}
