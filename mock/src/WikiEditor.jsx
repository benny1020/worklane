import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Table2,
  Undo2,
  Redo2,
  Plus,
  Heading2,
  CheckSquare,
  Minus,
  MessageSquare,
  Link2,
  X,
} from 'lucide-react';

export default function WikiEditor({
  content,
  editing,
  onChange,
  onReady,
  onComment,
}) {
  const [menu, setMenu] = useState(null),
    [query, setQuery] = useState(''),
    [active, setActive] = useState(0),
    [linkOpen, setLinkOpen] = useState(false),
    [linkUrl, setLinkUrl] = useState(''),
    [linkError, setLinkError] = useState('');
  const menuRef = useRef(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      TableKit.configure({ table: { resizable: false } }),
      TaskList,
      TaskItem.configure({
        nested: true,
        a11y: { checkboxLabel: (node) => `${node.textContent} 완료 여부` },
      }),
      Placeholder.configure({
        placeholder: '내용을 입력하세요. / 를 누르면 블록을 추가할 수 있어요.',
      }),
    ],
    content,
    editable: editing,
    editorProps: {
      attributes: {
        class: 'wiki-prose',
        'aria-label': '문서 본문',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-readonly': editing ? 'false' : 'true',
      },
      handleKeyDown: (view, event) => {
        if (
          event.key === '/' &&
          !event.isComposing &&
          view.editable &&
          view.state.selection.$from.parent.type.name === 'paragraph' &&
          !view.state.selection.$from.parent.textContent
        ) {
          event.preventDefault();
          setMenu({ from: view.state.selection.from });
          setQuery('');
          setActive(0);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (e.isEditable) onChange(e.getJSON());
    },
  });
  useEffect(() => {
    if (editor && !editor.isDestroyed) onReady(editor);
  }, [editor, onReady]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(editing, false);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content))
      editor.commands.setContent(content, { emitUpdate: false });
    editor.view.dom
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => {
        input.disabled = !editing;
      });
  }, [editing, content, editor]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !e.target.closest('[data-block-insert]')
      )
        setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && !e.isDestroyed
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            code: e.isActive('code'),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            quote: e.isActive('blockquote'),
            table: e.isActive('table'),
            heading: e.isActive('heading', { level: 2 })
              ? 'h2'
              : e.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p',
            undo: e.can().undo(),
            redo: e.can().redo(),
          }
        : {},
  });
  if (!editor || editor.isDestroyed) return <p>에디터를 준비하고 있어요.</p>;
  const actions = [
    [
      '제목',
      '문서의 큰 단락',
      Heading2,
      () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    ],
    [
      '체크리스트',
      '확인할 항목과 할 일',
      CheckSquare,
      () => editor.chain().focus().toggleTaskList().run(),
    ],
    [
      '글머리 기호',
      '순서 없는 목록',
      List,
      () => editor.chain().focus().toggleBulletList().run(),
    ],
    [
      '코드 블록',
      '예제 코드와 설정',
      Code,
      () => editor.chain().focus().toggleCodeBlock().run(),
    ],
    [
      '표',
      '비교와 명세 정리',
      Table2,
      () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    ],
    [
      '안내 문구',
      '중요한 원칙 강조',
      Quote,
      () => editor.chain().focus().toggleBlockquote().run(),
    ],
    [
      '구분선',
      '단락 나누기',
      Minus,
      () => editor.chain().focus().setHorizontalRule().run(),
    ],
  ].filter((a) => `${a[0]} ${a[1]}`.includes(query));
  function apply(item) {
    if (!item) return;
    if (menu) editor.commands.setTextSelection(menu.from);
    item[3]();
    setMenu(null);
  }
  function applyLink(e) {
    e.preventDefault();
    try {
      const url = new URL(linkUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      const attrs = {
        href: url.href,
        target: '_blank',
        rel: 'noopener noreferrer',
      };
      if (editor.state.selection.empty && !editor.isActive('link'))
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: url.href,
            marks: [{ type: 'link', attrs }],
          })
          .run();
      else editor.chain().focus().extendMarkRange('link').setLink(attrs).run();
      setLinkOpen(false);
      setLinkError('');
    } catch {
      setLinkError('https:// 또는 http:// 주소를 입력해주세요.');
    }
  }
  function tool(label, I, command, pressed, disabled = false) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={command}
      >
        <I size={15} />
      </button>
    );
  }
  return (
    <>
      {editing && (
        <div
          className="wiki-editor-toolbar"
          role="toolbar"
          aria-label="본문 서식"
        >
          <select
            aria-label="문단 스타일"
            value={state.heading}
            onChange={(e) =>
              e.target.value === 'p'
                ? editor.chain().focus().setParagraph().run()
                : editor
                    .chain()
                    .focus()
                    .setHeading({ level: Number(e.target.value.slice(1)) })
                    .run()
            }
          >
            <option value="p">본문</option>
            <option value="h2">제목 2</option>
            <option value="h3">제목 3</option>
          </select>
          <i />
          {tool(
            '굵게 · ⌘B',
            Bold,
            () => editor.chain().focus().toggleBold().run(),
            state.bold,
          )}
          {tool(
            '기울임 · ⌘I',
            Italic,
            () => editor.chain().focus().toggleItalic().run(),
            state.italic,
          )}
          {tool(
            '인라인 코드',
            Code,
            () => editor.chain().focus().toggleCode().run(),
            state.code,
          )}
          {tool(
            '링크 편집',
            Link2,
            () => {
              setLinkUrl(editor.getAttributes('link').href || '');
              setLinkError('');
              setLinkOpen(!linkOpen);
            },
            linkOpen,
          )}
          <i />
          {tool(
            '글머리 기호',
            List,
            () => editor.chain().focus().toggleBulletList().run(),
            state.bullet,
          )}
          {tool(
            '번호 목록',
            ListOrdered,
            () => editor.chain().focus().toggleOrderedList().run(),
            state.ordered,
          )}
          {tool(
            '안내 문구',
            Quote,
            () => editor.chain().focus().toggleBlockquote().run(),
            state.quote,
          )}
          <i />
          <button
            data-block-insert
            onClick={() => {
              setMenu(menu ? null : { from: editor.state.selection.from });
              setQuery('');
              setActive(0);
            }}
            aria-expanded={!!menu}
          >
            <Plus size={15} /> 삽입 <kbd>/</kbd>
          </button>
          <span className="wiki-toolbar-spacer" />
          {tool(
            '실행 취소 · ⌘Z',
            Undo2,
            () => editor.chain().focus().undo().run(),
            undefined,
            !state.undo,
          )}
          {tool(
            '다시 실행 · ⇧⌘Z',
            Redo2,
            () => editor.chain().focus().redo().run(),
            undefined,
            !state.redo,
          )}
          {state.table && (
            <div className="wiki-table-tools">
              <span>표 편집</span>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                행 추가
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                열 추가
              </button>
              <button onClick={() => editor.chain().focus().deleteRow().run()}>
                행 삭제
              </button>
            </div>
          )}
        </div>
      )}
      {menu && (
        <div
          className="wiki-insert-menu"
          ref={menuRef}
          role="dialog"
          aria-label="블록 삽입"
        >
          <div>
            <input
              autoFocus
              placeholder="블록 찾기…"
              aria-label="블록 찾기"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setMenu(null);
                  editor.commands.focus();
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, actions.length - 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  apply(actions[active]);
                }
              }}
            />
            <button aria-label="블록 메뉴 닫기" onClick={() => setMenu(null)}>
              <X size={14} />
            </button>
          </div>
          {actions.map(([title, description, I, run], i) => (
            <button
              key={title}
              className={i === active ? 'active' : ''}
              onClick={() => apply([title, description, I, run])}
            >
              <I size={18} />
              <span>
                <b>{title}</b>
                <small>{description}</small>
              </span>
            </button>
          ))}
          {!actions.length && <p>일치하는 블록이 없어요.</p>}
          <footer>
            ↑ ↓ 이동 <span>↵ 삽입</span>
          </footer>
        </div>
      )}
      <EditorContent editor={editor} />
      {linkOpen && editing && (
        <form className="wiki-link-editor" onSubmit={applyLink}>
          <label>
            선택한 텍스트에 링크
            <input
              autoFocus
              aria-label="링크 주소"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </label>
          {linkError && <p role="alert">{linkError}</p>}
          <div>
            <button
              type="button"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange('link')
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }}
            >
              링크 제거
            </button>
            <button type="button" onClick={() => setLinkOpen(false)}>
              취소
            </button>
            <button className="button primary">적용</button>
          </div>
        </form>
      )}
      {!editing && onComment && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: e, from, to }) =>
            from !== to && !!e.state.doc.textBetween(from, to).trim()
          }
        >
          <button
            className="wiki-selection-comment"
            onClick={() =>
              onComment(
                editor.state.doc.textBetween(
                  editor.state.selection.from,
                  editor.state.selection.to,
                  ' ',
                ),
              )
            }
          >
            <MessageSquare size={14} /> 선택한 문장에 댓글
          </button>
        </BubbleMenu>
      )}
    </>
  );
}
