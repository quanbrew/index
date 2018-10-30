import * as React from 'react';
import { Item } from "../item";
import { ItemContainer } from "./ItemContainer";
import { Path } from "../item";
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
  edit = (target?: Path) => {
    if (target === undefined)
      return;
    else if (this.root.current) {
      const index = target.first(null);
      if (index === null) {
        this.root.current.focus();
      }
      else {
        const child = this.root.current.children[index];
        if (child !== null && child !== undefined) {
          child.handleEdit(target);
        }
      }
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
