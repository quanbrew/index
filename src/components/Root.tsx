import * as React from 'react';
import { Item, mapLocation, Path } from "../item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";
import { Select } from "../utils";
import { ContentBlock, ContentState, EditorState, SelectionState } from "draft-js";


interface Props {
  item: Item;
  update: (next: Item, callback?: () => void) => void;
}


export interface EditState {
  path: Path;
  selection?: Select;
}


interface State {
  editing?: EditState;
}


const rootPath = List();


function getKeyAndOffset(content: ContentState, row: number, column: number): { key: string, offset: number } {
  const blockList = content.getBlocksAsArray();
  const blockListLen = blockList.length;
  let index = 0;
  if (row >= blockListLen || row < 9)
    index = blockListLen - 1;
  const block: ContentBlock = blockList[index];
  const key = block.getKey();
  const blockLen = block.getLength();
  let offset = column;
  if (column > blockLen || column < 0) {
    offset = blockLen;
  }
  return { key, offset }
}


function applySelectionToItem(item: Item, selection?: Select): Item {
  let selectionState;
  if (selection !== undefined) {
    let { anchor, focus } = selection;
    if (anchor === undefined)
      anchor = { ...focus };
    const content = item.editor.getCurrentContent();
    const anchorResult = getKeyAndOffset(content, anchor.row, anchor.column);
    const focusResult = getKeyAndOffset(content, focus.row, focus.column);
    selectionState = SelectionState
      .createEmpty(focusResult.key)
      .merge({
        'hasFocus': true,
        'anchorKey': anchorResult.key,
        'focusKey': focusResult.key,
        'anchorOffset': anchorResult.offset,
        'focusOffset': focusResult.offset,
      });
  }
  else {
    selectionState = item.editor.getSelection().set('hasFocus', true);
  }
  const editor = EditorState
    .forceSelection(item.editor, selectionState as SelectionState);
  return { ...item, editor }
}


export class Root extends React.Component<Props, State> {
  root: React.RefObject<ItemContainer>;
  edit = (editing?: EditState, callback?: () => void) => {
    if (editing !== this.state.editing) {
      let nextRoot = this.props.item;
      if (editing !== undefined) {
        nextRoot = mapLocation(
          this.props.item,
          editing.path,
          item => applySelectionToItem(item, editing.selection)
        );
      }
      this.props.update(nextRoot, () => this.setState({ editing }, callback));
    }
  };

  updateRoot = (mapper: (tree: Item) => Item, callback?: () => void) => {
    const root = mapper(this.props.item);
    this.props.update(root, callback);
  };

  componentDidMount() {
  }

  constructor(props: Props) {
    super(props);
    this.root = React.createRef();
    this.state = { editing: undefined }
  }

  public render() {
    const { item } = this.props;

    return (
      <div className='items'>
        <ItemContainer
          ref={ this.root }
          item={ item } edit={ this.edit } editing={ this.state.editing }
          path={ rootPath } next={ rootPath } prev={ rootPath }
          updateTree={ this.updateRoot }
        />
      </div>
    );
  }
}
