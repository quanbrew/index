import * as React from 'react';
import { Item, Path } from "../item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";


interface Props {
  item: Item;
  update: (next: Item, callback?: () => void) => void;
}


interface State {
}


const rootPath = List();


export class Root extends React.Component<Props, State> {
  root: React.RefObject<ItemContainer>;
  edit = (target: Path) => {
    let index = target.first(null);
    let node = this.root.current;
    while (index !== null && node) {
      node = node.children[index];
      target = target.rest();
      index = target.first(null);
    }
    if (node) {
      node.focus();
    }
  };

  updateRoot = (mapper: (tree: Item) => Item, callback?: () => void) => {
    const root = mapper(this.props.item);
    this.props.update(root, callback);
  };

  constructor(props: Props) {
    super(props);
    this.root = React.createRef();
  }

  public render() {
    const { item } = this.props;

    return (
      <div className='items'>
        <ItemContainer
          ref={ this.root }
          item={ item } edit={ this.edit }
          path={ rootPath } next={ rootPath } prev={ rootPath }
          updateTree={ this.updateRoot }
        />
      </div>
    );
  }
}
