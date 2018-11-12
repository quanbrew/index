import * as React from 'react';
import { Item, mapLocation, Path } from "../item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";
import { Position } from "../utils";
import { EditorState, SelectionState } from "draft-js";


interface Props {
  item: Item;
  update: (next: Item, callback?: () => void) => void;
}


export interface EditState {
  path: Path;
  position?: Position;
}


interface State {
  editing?: EditState;
}


const rootPath = List();


function applyPositionToItem(item: Item, position?: Position): Item {
  let selection;
  if (position !== undefined) {
    const { column, row } = position;
    if (column === -1 && row === -1) {
      return { ...item, editor: EditorState.moveFocusToEnd(item.editor) }
    }
    const content = item.editor.getCurrentContent();
    const blocks = content.getBlocksAsArray();
    const block_length = blocks[row].getLength();
    const offset = column <= block_length ? column : block_length;
    selection = SelectionState
      .createEmpty(content.getBlocksAsArray()[row].getKey())
      .merge({
        'hasFocus': true,
        'anchorOffset': offset,
        'focusOffset': offset,
      });
  }
  else {
    selection = item.editor.getSelection().set('hasFocus', true);
  }
  const editor = EditorState
    .acceptSelection(item.editor, selection as SelectionState);
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
          item => applyPositionToItem(item, editing.position)
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
