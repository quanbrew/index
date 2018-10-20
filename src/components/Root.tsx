import * as React from 'react';
import { Item } from "../item";
import { ItemContainer, Modification } from "./ItemContainer";
import { empty } from "../utils";
import { Path } from "../path";
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
      if (index === null)
        this.root.current.focus();
      else {
        const child = this.root.current.children[index];
        if (child !== null && child !== undefined) {
          child.handleEdit(target);
        }
      }
    }
  };
  createChild = (child: Item) => {
    const { item, update } = this.props;
    const children = item.children.push(child);
    const select = () => this.edit(rootPath.push(children.size - 1));
    return update({ ...item, children }, select);
  };

  constructor(props: Props) {
    super(props);
    this.root = React.createRef();
  }

  public render() {
    const { item, update } = this.props;

    const modifying: Modification = {
      editing: undefined,
      indent: empty,
      unIndent: empty,
      remove: empty,
      create: this.createChild,
      update: update,
      insert: empty,
    };

    return (
      <div className='items'>
        <ItemContainer
          ref={ this.root }
          item={ item } edit={ this.edit }
          path={ rootPath } next={ rootPath } prev={ rootPath }
          modifying={ modifying }
        />
      </div>
    );
  }
}
