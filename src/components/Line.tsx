import * as React from 'react';
import { ContentState, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, SelectionState } from 'draft-js';

const ReactMarkdown = require('react-markdown');


interface Props {
  source: string;
  onChange: (source: string, callback?: () => void) => void;
  isEditing: boolean;
  edit: (callback?: () => void) => void;
  exit: (callback?: () => void) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  indent: () => void;
  unIndent: () => void;
  remove: () => void;
  toggle: (setExpand?: boolean) => void;
  onEnter: (hasContent: boolean) => void;
  swap: (direction: 'Prev' | 'Next') => void;
}


interface State {
  editor?: EditorState;
}


interface Position {
  row: number,
  column: number,
}


interface SourceRange {
  start: number;
  end: number;
}


const lineNumberToOffset = (source: string, lineNumber: number): number => {
  let position = -1;
  while (lineNumber > 0) {
    position = source.indexOf('\n', position + 1);
    lineNumber -= 1;
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
    const parent = element.parentElement;
    if (parent === null) {
      console.warn('can\'t found "data-sourcepos"');
      debugger;
      return { start: 0, end: 0 }
    }
    return sourcePosition(source, parent);
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
  const sibling = node.previousSibling;
  const parent = node.parentElement;
  const content = node.textContent;
  const hasSourcePos = (n: any): n is HTMLElement =>
    n instanceof HTMLElement && n.hasAttribute('data-sourcepos');
  if (hasSourcePos(node)) {
    const position = sourcePosition(source, node);
    const { start, end } = position;
    if (content === null) {
      return end;
    }
    else {
      return source.indexOf(content, start) + offset;
    }
  }
  else if (sibling === null && parent !== null) {
    const position = sourcePosition(source, parent);
    const { start } = position;
    if (content === null) {
      return start;
    }
    else {
      return source.indexOf(content, start) + offset;
    }
  }
  else if (sibling instanceof HTMLElement) {
    const position = sourcePosition(source, sibling);
    const content = node.textContent;
    const end = position.end - 1;
    if (content === null) {
      return position.start;
    }
    else {
      return source.indexOf(content, end) + offset;
    }
  }
  return 0;
};


export class Line extends React.Component<Props, State> {
  editorRef: React.RefObject<Editor>;

  static createEditor(source: string, row: number, column: number): EditorState {
    const content = ContentState.createFromText(source);
    const selection = SelectionState
      .createEmpty(content.getBlocksAsArray()[row].getKey())
      .merge({
        'hasFocus': true,
        'anchorOffset': column,
        'focusOffset': column,
      });
    const editor = EditorState.createWithContent(content);
    return EditorState.acceptSelection(editor, selection as SelectionState)
  }

  handleClick = (e: React.MouseEvent) => {
    const { source, edit, isEditing } = this.props;
    e.stopPropagation();

    if (!isEditing) {

      let content;
      let prevEditor;
      if (!this.state.editor) {
        content = ContentState.createFromText(source);
        prevEditor = EditorState.createWithContent(content);
      }
      else {
        prevEditor = this.state.editor;
        content = prevEditor.getCurrentContent();
      }
      const selection = getSelection();
      let selectionState;
      const node = selection.anchorNode;
      const outOfContent = (n: any) => n instanceof HTMLElement && n.className === 'document';
      const position = offsetToLineNumber(source, markdownSourceOffset(source, node, selection.anchorOffset));
      if (selection.isCollapsed && node !== null && !outOfContent(node)) {
        selectionState = SelectionState
          .createEmpty(content.getBlocksAsArray()[position.row].getKey())
          .merge({
            'hasFocus': true,
            'anchorOffset': position.column,
            'focusOffset': position.column,
          })
      }
      else {
        selectionState = SelectionState
          .createEmpty(content.getFirstBlock().getKey())
          .merge({
            'hasFocus': true,
            'anchorOffset': 0,
            'focusOffset': 0,
          });
      }
      const editor = EditorState.acceptSelection(prevEditor, selectionState as SelectionState);
      this.setState({ editor }, edit);
    }
  };

  submit = (callback?: () => void) => {
    const { editor } = this.state;
    if (editor) {
      this.props.onChange(editor.getCurrentContent().getPlainText(), callback);
      this.forceUpdate();
    }
    else if (callback !== undefined) {
      callback();
    }
  };

  exit = () => {
    this.props.exit(this.submit);
  };

  constructor(props: Props) {
    super(props);
    this.state = {};
    this.editorRef = React.createRef();
  }

  onUpArrow = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.metaKey) {
      this.props.swap('Prev');
    }
    else {
      this.submit(this.props.navigatePrev);
    }
  };

  onDownArrow = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.metaKey) {
      this.props.swap('Next');
    }
    else {
      this.submit(this.props.navigateNext)
    }
  };

  hasContent(): boolean {
    const { editor } = this.state;
    return editor !== undefined && editor.getCurrentContent().hasText()
  }

  shouldComponentUpdate(nextProps: Props) {
    return this.props.isEditing || nextProps.isEditing;
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.isEditing && state.editor === undefined) {
      const editor = Line.createEditor(props.source, 0, 0);
      return { editor }
    }
    return null;
  }

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
  private onTab = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      return this.props.unIndent()
    }
    else {
      return this.props.indent()
    }
  };
  private handleReturn = (): DraftHandleValue => {
    this.submit(() => this.props.onEnter(this.hasContent()));
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

  renderEditor() {
    let { editor } = this.state;
    if (!editor) {
      throw Error('editor is undefined');
    }
    return (
      <Editor
        editorState={ editor }
        onBlur={ this.exit }
        ref={ this.editorRef }
        onChange={ editor => this.setState({ editor }) }
        onTab={ this.onTab }
        handleReturn={ this.handleReturn }
        onUpArrow={ this.onUpArrow }
        onDownArrow={ this.onDownArrow }
        keyBindingFn={ this.keyBindingFn }
        handleKeyCommand={ this.handleKeyCommand }
      />
    );
  }

  render() {
    if (this.props.isEditing) {
      return this.renderEditor();
    }
    else {
      return (
        <div className="document" onClick={ this.handleClick }>
          <ReactMarkdown
            sourcePos={ true }
            containerTagName="span"
            source={ this.props.source }
            renderers={ { paragraph: 'span' } }
            allowedTypes={ ['paragraph', 'root', 'text', 'emphasis', 'strong', 'link', 'image', 'inlineCode'] }
          />
        </div>
      );
    }
  }
} 
