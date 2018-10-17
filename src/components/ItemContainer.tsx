import * as React from 'react';
import { addChild, createItem, Item } from "../Item";
import { Keys } from "./App";


interface Props {
  item: Item,
  update: (next: Item, callback?: () => void) => void;
  select: (keys?: Keys) => void;
  create: (item?: Item, position?: number) => void;
  selected?: Keys;
  keys: Keys;
  next: Keys;
  prev: Keys;
  zoom?: boolean;
  indent: (keys: Keys) => void;
  unIndent: (keys: Keys) => void;
}


interface State {
}


export class ItemContainer extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  createChild = (child = createItem(), after?: number) => {
    const {keys, item, select, update} = this.props;
    const size = item.children.size;
    if (after === undefined) after = size;
    else {
      after += 1;
      if (after > size) after = size;
    }

    select(keys.push(after));
    update(addChild(item, child, after));
  };

  itemTail = (keys: Keys, item: Item): Keys => {
    const last = item.children.last(null);
    if (last === null) return keys;
    else return this.itemTail(keys.push(item.children.size - 1), last);
  };


  indent = (keys: Keys) => {
    const key = keys.last(null);
    if (key === null || key <= 0) return;
    const { item, update, select } = this.props;
    const prevItem = item.children.get(key - 1, null);
    const indentItem = item.children.get(key, null);
    if (prevItem === null || indentItem === null)
      return console.error('unexpected key', key);
    const children = item.children.set(key - 1, addChild(prevItem, indentItem)).remove(key);
    update(
      {...item, children},
      () => select(this.props.keys.push(key - 1, prevItem.children.size))
    );
  };


  unIndent = (keys: Keys) => {
    const key = keys.last(null);
    if (key === null || keys.size < 2) return;
    const {item, update, create} = this.props;
    const current = item.children.get(key);
    if (current === undefined) return console.error('unexpected key', key);
    update(
      {...item, children: item.children.remove(key)},
      () => create(current, this.props.keys.last())
    );
  };

  items = (currentItem: Item, key: number) => {
    const {selected, select, keys, update, item, prev, next} = this.props;
    let itemPrev = prev;
    const prevItem = item.children.get(key - 1);
    if (key === 0) itemPrev = keys;
    else if (prevItem !== undefined)
      itemPrev = this.itemTail(keys.push(key - 1), prevItem);
    let itemNext = next;
    if (key < item.children.size - 1) itemNext = keys.push(key + 1);

    return (
      <ItemContainer
        item={currentItem} key={currentItem.id} selected={selected}
        select={select} keys={keys.push(key)}
        prev={itemPrev} next={itemNext}
        create={this.createChild}
        indent={this.indent} unIndent={this.unIndent}
        update={(next, callback) => update({ ...item, children: item.children.set(key, next) }, callback)}
      />
    );
  };


  content = () => {
    const {keys, item, select} = this.props;
    return (<div className='itemContent' onClick={() => select(keys)}>{item.text}</div>);
  };

  editing = () => (
    <input autoFocus value={this.props.item.text} onChange={e => {
      const next = {...this.props.item, text: e.currentTarget.value};
      this.props.update(next);
    }} />
  );

  down = () => {
    const {select, next, item, keys} = this.props;
    if (item.children.size !== 0)
      select(keys.push(0));
    else
      select(next);
  };


  clearEditing = () => { this.props.select() };

  handleKeyDown = (e: React.KeyboardEvent) => {
    // console.log(e.key, e.keyCode);
    const {indent, unIndent, create, keys, select, prev} = this.props;
    e.stopPropagation();
    switch (e.key) {
      case 'ArrowUp': return select(prev);
      case 'ArrowDown': return this.down();
      case 'Enter': return create(createItem(), keys.last());
      case 'Escape': return this.clearEditing();
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) { return unIndent(keys) }
        else { return indent(keys) }
    }
  };


  render() {
    const {selected, keys} = this.props;
    const {children} = this.props.item;
    const isSelected = selected ? selected.equals(keys) : false;
    return (
      <li onKeyDown={this.handleKeyDown}>
        {isSelected ? this.editing() : this.content() }
        <ul>
          {children.map(this.items)}
        </ul>
      </li>
    );
  }
}
