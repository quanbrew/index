import * as React from 'react';
import { addChild, createItem, Item } from "../Item";
import { Path } from "./App";
import classNames from 'classnames';


interface Props {
  item: Item,
  update: (next: Item, callback?: () => void) => void;
  edit: (path?: Path) => void;
  create: (item?: Item, after?: number) => void;
  editing?: Path;
  path: Path;
  next: Path;
  prev: Path;
  indent: (path: Path) => void;
  unIndent: (path: Path) => void;
  remove: (path: Path, prev?: Path) => void;
}


interface State {
}


const itemTail = (path: Path, item: Item): Path => {
  const last = item.children.last(null);
  if (last === null) return path;
  else return itemTail(path.push(item.children.size - 1), last);
};


export class ItemContainer extends React.PureComponent<Props, State> {
  createChildItem = (child = createItem(), after?: number) => {
    const { path, item, edit, update } = this.props;
    const size = item.children.size;
    let position = size;
    if (after !== undefined) {
      if (after + 1 < size) position = after + 1;
    }
    update(addChild(item, child, position), () => edit(path.push(position)));
  };
  removeChild = (path: Path, prev?: Path) => {
    const index = path.last(undefined);
    if (index === undefined) return;

    const { item, update, edit } = this.props;

    update(
      { ...item, children: item.children.remove(index) },
      () => edit(prev),
    )
  };
  indentChild = (path: Path) => {
    const index = path.last(0);

    // first item or root item can't indent
    if (index === 0) return;

    const { item, update, edit } = this.props;
    const prevItem = item.children.get(index - 1, null);
    const indentItem = item.children.get(index, null);
    // make type checker happy
    if (prevItem === null || indentItem === null) return console.error('unexpected index', index);

    // move indent item as previous item's child.
    const children = item.children
      .splice(index - 1, 2, addChild(prevItem, indentItem));

    // update children
    update(
      { ...item, children },
      () => edit(this.props.path.push(index - 1, prevItem.children.size))
    );
  };
  unIndentChild = (path: Path) => {
    // root's children can't un-indent
    if (path.size < 2) return;

    const index = path.last() as number;
    const { item, update, create } = this.props;
    const currentItem = item.children.get(index);
    // make type checker happy
    if (currentItem === undefined) return console.error('unexpected index', index);
    update(
      { ...item, children: item.children.remove(index) },
      () => create(currentItem, this.props.path.last())
    );
  };
  displayChild = (currentItem: Item, index: number) => {
    const { editing, edit, path, update, item, prev, next } = this.props;

    let itemPrev = prev;
    const prevItem = item.children.get(index - 1);

    if (index === 0) itemPrev = path; // move to parent
    else if (prevItem !== undefined)
      itemPrev = itemTail(path.push(index - 1), prevItem);

    const itemNext = index < item.children.size - 1 ? path.push(index + 1) : next;

    const itemPath = path.push(index);

    const itemUpdate: typeof update = (next, callback) =>
      update({ ...item, children: item.children.set(index, next) }, callback);

    return (

      <ItemContainer
        item={ currentItem } key={ currentItem.id } editing={ editing }
        edit={ edit } path={ itemPath }
        prev={itemPrev} next={itemNext}
        create={ this.createChildItem }
        indent={ this.indentChild } unIndent={ this.unIndentChild }
        update={ itemUpdate } remove={ this.removeChild }
      />
    );
  };
  handleKeyDown = (e: React.KeyboardEvent) => {
    // console.log(e.key, e.keyCode);
    const { item, indent, unIndent, create, path, edit, prev, remove } = this.props;
    e.stopPropagation(); // don't propagate to parent.
    switch (e.key) {
      case 'ArrowUp':
        return edit(prev);
      case 'ArrowDown':
        return this.down();
      case 'Enter':
        // if content is empty and item is last item in siblings, indent it.
        if (item.text === '' && this.isLastItem() && path.size > 1)
          return unIndent(path);
        else
          return create(createItem(), path.last());
      // exit edit
      case 'Escape':
        return this.props.edit();
      // indent or un-indent
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          return unIndent(path)
        }
        else {
          return indent(path)
        }
      case 'Backspace':
        if (item.text === '') {
          e.preventDefault();
          return remove(path, prev);
        }
    }
  };

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  content() {
    const { item } = this.props;
    return (<span>{ item.text }</span>);
  };

  editing() {
    const { item, update } = this.props;
    return (
      <input
        autoFocus
        value={ item.text }
        onChange={ e => update({ ...item, text: e.currentTarget.value }) }
      />
    );
  }

  down() {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0)
      edit(path.push(0)); // enter next level
    else if (this.isFinallyItem())
      return;
    else
      edit(next);
  }

  isRoot(): boolean {
    return this.props.path.isEmpty()
  }

  isLastItem(): boolean {
    const { next, path } = this.props;
    return path.size > next.size;
  }

  isFinallyItem(): boolean {
    const { next, path } = this.props;
    return !path.isEmpty() && next.isEmpty();
  };

  isEditing(): boolean {
    const { editing, path } = this.props;
    return editing === undefined ? false : editing.equals(path);
  }

  render() {
    const { edit, path, item } = this.props;
    const isEditing = this.isEditing();
    const className = classNames('ItemContainer', { editing: isEditing });
    return (
      <div className={ className } onKeyDown={ this.handleKeyDown }>
        <div className='item-content' onClick={ () => edit(path) }>
          { isEditing ? this.editing() : this.content() }
        </div>
        <div className='children'>
          { item.children.map(this.displayChild) }
        </div>
      </div>
    );
  }
}
