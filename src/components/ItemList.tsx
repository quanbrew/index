import * as React from 'react';
import { applySelectionToItem, Item, mapLocation, Path } from "../item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";
import { Select } from "../utils";


interface Props {
  item: Item;
  update: (next: Item, callback?: () => void) => void;
  startPath: Path;
}


export interface EditState {
  path: Path;
  selection?: Select;
}


interface State {
  editing?: EditState;
}


const emptyPath = List();


export class ItemList extends React.Component<Props, State> {
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

  constructor(props: Props) {
    super(props);
    this.state = { editing: undefined }
  }

  public render() {
    const { item, startPath } = this.props;

    return (
      <div className='items'>
        <ItemContainer
          item={ item } edit={ this.edit } editing={ this.state.editing }
          path={ emptyPath } next={ emptyPath } prev={ emptyPath }
          updateTree={ this.updateRoot } start={ startPath }
        />
      </div>
    );
  }
}
