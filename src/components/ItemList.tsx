import * as React from 'react';
import { Item, Path } from "../item";
import { ItemNode } from "./ItemNode";
import { List } from "immutable";
import { Select } from "../utils";
import { Breadcrumb } from "./Breadcrumb";


interface Props {
  root: Item;
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
      let nextRoot = this.props.root;
      if (editing !== undefined) {
        nextRoot = Item.modify(
          this.props.root,
          editing.path,
          item => Item.select(item, editing.selection)
        );
      }
      this.props.update(nextRoot, () => this.setState({ editing }, callback));
    }
  };

  updateRoot = (mapper: (tree: Item) => Item, callback?: () => void) => {
    const root = mapper(this.props.root);
    this.props.update(root, callback);
  };

  constructor(props: Props) {
    super(props);
    this.state = { editing: undefined }
  }

  public render() {
    const { root, startPath } = this.props;

    return (
      <div className='items'>
        <Breadcrumb root={ root } path={ startPath }/>
        <ItemNode
          item={ root } edit={ this.edit } editing={ this.state.editing }
          path={ emptyPath } next={ emptyPath } prev={ emptyPath }
          updateTree={ this.updateRoot } start={ startPath }
          parentId={ null } previousId={ null }
        />
      </div>
    );
  }
}
