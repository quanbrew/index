import * as React from 'react';
import { DraftHandleValue, Editor, EditorState, getDefaultKeyBinding } from 'draft-js';
import { Position, Select } from "../utils";
import classNames from 'classnames';
import "./Line.css";

const ReactMarkdown = require('react-markdown');


interface Props {
  editor: EditorState;
  onChange: (editor: EditorState, callback?: () => void) => void;
  isEditing: boolean;
  edit: (selection?: Select, callback?: () => void) => void;
  exit: (callback?: () => void) => void;
  navigateNext: (selection?: Select) => void;
  navigatePrev: (selection?: Select) => void;
  indent: () => void;
  unIndent: () => void;
  remove: () => void;
  toggle: (setExpand?: boolean) => void;
  onEnter: (hasContent: boolean) => void;
  swap: (direction: 'Prev' | 'Next') => void;
}


interface SourceRange {
  start: number;
  end: number;
}


const lineNumberToOffset = (source: string, lineNumber: number): number => {
  let position = 0;
  for (let i = 0; i < lineNumber; i++) {
    const result = source.indexOf('\n', position);
    if (result === -1)
      return position;
    position = result + 1;
  }
  return position;
};


const offsetToLineNumber = (source: string, offset: number): Position => {
  let row = 0;
  let lineOffset = 0;
  for (; ;) {
    const wrapPos = source.indexOf('\n', lineOffset);
    if (wrapPos === -1 || wrapPos >= offset) {
      break;
    }
    lineOffset = wrapPos + 1;
    row += 1;
  }
  return { row, column: offset - lineOffset };
};

const sourcePosition = (source: string, element: HTMLElement): SourceRange => {
  const value = element.getAttribute('data-sourcepos');
  if (value === null) {
    throw Error('there is no `data-sourcepos`')
  }
  // 1 base [start, end)
  const result = /(\d+):(\d+)-(\d+):(\d+)/.exec(value);
  if (result === null)
    throw Error('can\'t parse source position');
  // -1 for 0 base
  const startRow = parseInt(result[1]) - 1;
  const startColumn = parseInt(result[2]) - 1;
  const endRow = parseInt(result[3]) - 1;
  const endColumn = parseInt(result[4]) - 1;

  return {
    start: lineNumberToOffset(source, startRow) + startColumn,
    end: lineNumberToOffset(source, endRow) + endColumn,
  };
};


const markdownSourceOffset = (source: string, node: Node, offset: number): number => {
  const content = node.textContent;
  if (content === null) {
    debugger;
    return 0;
  }
  let n: Node | null = node;
  while (n !== null) {
    if (n instanceof HTMLElement && n.hasAttribute('data-sourcepos')) {
      const position = sourcePosition(source, n);
      return source.indexOf(content, position.start) + offset;
    }
    n = n.parentElement;
  }
  return 0;
};


interface State {
  release: boolean;
}


function Text(props: object) {
  return (
    <span
      data-sourcepos={ props['data-sourcepos'] }
      children={ props['children'] }
    />
  );
}


function Link(props: object) {
  return (
    <a
      contentEditable={ false }
      data-sourcepos={ props['data-sourcepos'] }
      href={ props['href'] }
    >
      { props['children'] }
    </a>
  )
}


function getPosition(source: string, node: Node, offset: number): Position {
  if (node instanceof HTMLElement && node.className === 'document') {
    const child = node.childNodes[offset];
    if (child instanceof HTMLElement) {
      const sourceRange = sourcePosition(source, child);
      return offsetToLineNumber(source, sourceRange.start);
    }
    else {
      throw Error('document child is not element');
    }
  }
  else if (node === null) {
    return { column: 0, row: 0 }
  }
  else {
    const sourceOffset = markdownSourceOffset(source, node, offset);
    return offsetToLineNumber(source, sourceOffset);
  }
}


export class Line extends React.Component<Props, State> {
  editorRef: React.RefObject<Editor>;
  documentRef: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.state = { release: true };
    this.documentRef = React.createRef();
    this.editorRef = React.createRef();
  }

  handleSelectMarkdown = (e: React.SyntheticEvent) => {
    const { editor, edit, isEditing } = this.props;
    e.stopPropagation();
    if (!isEditing) {
      e.preventDefault();
      const source = editor.getCurrentContent().getPlainText();
      const selection = getSelection();
      const focus = getPosition(source, selection.focusNode, selection.focusOffset);
      const anchor = getPosition(source, selection.anchorNode, selection.anchorOffset);
      edit({ focus, anchor });
    }
  };

  hasContent(): boolean {
    return this.props.editor.getCurrentContent().hasText()
  }

  handleChange = (editor: EditorState) => {
    this.props.onChange(editor)
  };
  onBlur = () => {
    if (document.hasFocus())
      this.props.exit();
  };

  getCurrentPosition(): Select | undefined {
    const { editor } = this.props;
    const selection = editor.getSelection();
    const column = selection.getFocusOffset();
    const row = -1;
    const focus = { column, row };
    return { focus }
  }
  private onTab = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      return this.props.unIndent()
    }
    else {
      return this.props.indent()
    }
  };
  private onUpArrow = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.metaKey) {
      this.props.swap('Prev');
    }
    else {
      this.props.navigatePrev(this.getCurrentPosition());
    }
  };
  private onDownArrow = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.metaKey) {
      this.props.swap('Next');
    }
    else {
      this.props.navigateNext(this.getCurrentPosition())
    }
  };
  private handleReturn = (): DraftHandleValue => {
    this.props.onEnter(this.hasContent());
    return 'handled';
  };
  private keyBindingFn = (e: React.KeyboardEvent): string | null => {
    // console.log(e.key, e.keyCode);
    const DOT = 190;
    switch (e.keyCode) {
      case DOT:
        if (e.metaKey) return 'list-toggle';
        break;
    }
    return getDefaultKeyBinding(e);
  };
  private handleKeyCommand = (command: string): DraftHandleValue => {
    const { toggle, navigateNext, navigatePrev, remove } = this.props;
    switch (command) {
      case 'backspace':
        if (!this.hasContent()) {
          remove();
          return 'handled'
        }
        break;
      case 'list-toggle':
        toggle();
        return 'handled';
      case 'navigate-next':
        navigateNext();
        return "handled";
      case 'navigate-prev':
        navigatePrev();
        return "handled";
      case 'list-expand':
        toggle(true);
        return "handled";
      case 'list-fold':
        toggle(false);
        return "handled";
    }
    return "not-handled";
  };


  renderEditor() {
    let { editor } = this.props;
    return (
      <div>
        <Editor
          editorState={ editor }
          onBlur={ this.onBlur }
          ref={ this.editorRef }
          onChange={ this.handleChange }
          onTab={ this.onTab }
          handleReturn={ this.handleReturn }
          onUpArrow={ this.onUpArrow }
          onDownArrow={ this.onDownArrow }
          keyBindingFn={ this.keyBindingFn }
          handleKeyCommand={ this.handleKeyCommand }
          stripPastedStyles
        />
      </div>
    );
  }

  renderMarkdown() {
    const allowedTypes = [
      'root', 'text', 'emphasis', 'strong', 'link', 'inlineCode', 'image'
    ];

    return (
      <div
        ref={ this.documentRef }
        className="document"
        contentEditable
        suppressContentEditableWarning
        onSelect={ this.handleSelectMarkdown }
      >
        <ReactMarkdown
          sourcePos
          rawSourcePos
          containerTagName="span"
          unwrapDisallowed
          source={ this.props.editor.getCurrentContent().getPlainText() }
          renderers={ { text: Text, link: Link } }
          allowedTypes={ allowedTypes }
        />
      </div>
    );
  }

  render() {
    const { isEditing } = this.props;

    const className = classNames({ editing: isEditing });

    return (
      <div className={ className }>
        { isEditing ? this.renderEditor() : this.renderMarkdown() }
      </div>
    );
  }
} 
