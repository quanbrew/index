import * as React from 'react';
import { ContentState, Editor, EditorState, SelectionState } from 'draft-js';

const ReactMarkdown = require('react-markdown');


interface Props {
  source: string;
  onChange: (source: string) => void;
  isEditing: boolean;
  edit: (callback?: () => void) => void;
  exit: (callback?: () => void) => void;
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
      throw Error('can\'t found "data-sourcepos"');
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

  handleClick = (e: React.MouseEvent) => {
    const { source, edit, isEditing } = this.props;
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
      const selection = SelectionState
        .createEmpty(content.getFirstBlock().getKey())
        .set('anchorOffset', 0)
        .set('focusOffset', 0)
        .set('hasFocus', true) as SelectionState;
      const editor = EditorState.acceptSelection(prevEditor, selection);
      this.setState({ editor }, edit);
    }
    // const selection = getSelection();
    // let node = selection.anchorNode;
    // const out = (n: any) => n instanceof HTMLElement && n.className === 'document';
    // if (selection.isCollapsed && !this.props.isEditing && node !== null && !out(node)) {
    //   const source = this.props.source;
    //   const offset = markdownSourceOffset(source, node, selection.anchorOffset);
    //   const content = ContentState.createFromText(source);
    //   const position = offsetToLineNumber(source, offset);
    //   const editorSelection = SelectionState
    //     .createEmpty(content.getBlocksAsArray()[position.row].getKey())
    //     .set('anchorOffset', position.column)
    //     .set('focusOffset', position.column)
    //     .set('hasFocus', true) as SelectionState;
    //   const editor = EditorState.acceptSelection(EditorState.createWithContent(content), editorSelection);
    //   this.setState({ editor });
    //   this.props.edit()
    // }
  };

  submit = () => {
    const { editor } = this.state;
    if (editor) {
      this.props.onChange(editor.getCurrentContent().getPlainText())
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


  render() {
    if (this.props.isEditing && this.state.editor) {
      return (
        <Editor
          editorState={ this.state.editor }
          onBlur={ this.exit }
          ref={ this.editorRef }
          onChange={ editor => this.setState({ editor }) }
        />
      );
    }
    else {
      return (
        <div className="document" onClick={ this.handleClick }>
          <ReactMarkdown
            sourcePos={ true }
            source={ this.props.source }
            allowedTypes={ ['root', 'text', 'emphasis', 'strong', 'link', 'image', 'inlineCode'] }
            unwrapDisallowed={ true }
          />
        </div>
      );
    }
  }
} 
