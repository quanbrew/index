import * as React from 'react';
import { ContentState, Editor, EditorState, SelectionState } from 'draft-js';

const ReactMarkdown = require('react-markdown');


interface Props {
  source: string;
  onChange: (source: string) => void;
}


interface State {
  editor?: EditorState;
  isEditing: boolean;
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
    if (parent === null)
      throw Error('can\'t found "data-sourcepos"');
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
  if (sibling === null && parent !== null) {

    const position = sourcePosition(source, parent);
    const { start } = position;
    if (content === null) {
      console.log('non-text node selected');
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
      console.log('non-text node selected');
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

  handleClick = () => {
    const selection = getSelection();
    if (selection.isCollapsed && !this.state.isEditing && selection.anchorNode !== null) {
      const source = this.props.source;
      const offset = markdownSourceOffset(source, selection.anchorNode, selection.anchorOffset);
      const content = ContentState.createFromText(source);
      const position = offsetToLineNumber(source, offset);
      const editorSelection = SelectionState
        .createEmpty(content.getBlocksAsArray()[position.row].getKey())
        .set('anchorOffset', position.column)
        .set('focusOffset', position.column)
        .set('hasFocus', true) as SelectionState;
      const editor = EditorState.acceptSelection(EditorState.createWithContent(content), editorSelection);
      this.setState({ editor, isEditing: true })
    }
  };

  exit = () => {
    const { editor } = this.state;
    this.setState({ isEditing: false });
    if (editor !== undefined) {
      const source = editor.getCurrentContent().getPlainText();
      this.props.onChange(source);
    }
  };

  constructor(props: Props) {
    super(props);
    this.editorRef = React.createRef();
    this.state = { isEditing: false }
  }


  render() {
    if (this.state.isEditing && this.state.editor) {
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
        <div onClick={ this.handleClick }>
          <ReactMarkdown
            sourcePos={ true }
            source={ this.props.source }
          />
        </div>
      );
    }
  }
} 
