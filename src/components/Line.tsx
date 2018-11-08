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


interface Position {
  row: number,
  column: number,
}


interface State {
  editor?: EditorState;
  position?: Position;
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


const hasSourcePos = (node: any): boolean =>
  node instanceof HTMLElement && node.hasAttribute('data-sourcepos');

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
  const sibling = node.previousSibling;
  const content = node.textContent;

  const searchSource = (start: number) => {
    if (content === null) {
      return start;
    }
    else {
      return source.indexOf(content, start) + offset;
    }
  };
  if (hasSourcePos(node)) {
    const position = sourcePosition(source, node as HTMLElement);
    return searchSource(position.start)
  }
  else if (hasSourcePos(sibling)) {
    const position = sourcePosition(source, sibling as HTMLElement);
    return searchSource(position.end);
  }
  else {
    let parent = node.parentElement;
    while (parent !== null) {
      if (hasSourcePos(parent)) {
        const position = sourcePosition(source, parent as HTMLElement);
        return searchSource(position.start)
      }
      parent = parent.parentElement;
    }
    debugger;
    return 0;
  }
};


export class Line extends React.Component<Props, State> {
  editorRef: React.RefObject<Editor>;
  documentRef: React.RefObject<HTMLDivElement>;

  static createEditor(source: string, row: number = 0, column: number = 0): EditorState {
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
      const selection = getSelection();
      if (!selection.isCollapsed && !selection.anchorNode) {
        return;
      }

      const offset = markdownSourceOffset(source, selection.anchorNode, selection.anchorOffset);
      const position = offsetToLineNumber(source, offset);
      this.setState({ position });
      edit();
    }
  };

  submit = (callback?: () => void) => {
    const { editor } = this.state;
    if (!editor)
      throw Error('editor is undefined');
    this.props.onChange(editor.getCurrentContent().getPlainText(), callback);
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

  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.isEditing && (state.editor === undefined || state.position)) {
      const { row, column } = state.position || { row: 0, column: 0 };
      const editor = Line.createEditor(props.source, row, column);
      return { editor, position: undefined }
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

  handleChange = (editor: EditorState) => {
    if (editor.getSelection().getHasFocus())
      this.setState({ editor })
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
        onChange={ this.handleChange }
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
        <div className="document" ref={ this.documentRef } onClick={ this.handleClick }>
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
