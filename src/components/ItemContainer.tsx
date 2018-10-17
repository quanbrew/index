import * as React from 'react';
import { addChild, createItem, Item } from "../Item";
import { Consumer, Keys } from "./App";


interface Props {
  item: Item,
  update: (next: Item) => void;
  select: (keys: Keys) => void;
  create: () => void;
  selected: Keys;
  keys: Keys;
  next: Keys;
  prev: Keys;
  zoom?: boolean;
}


interface State {
}


export class ItemContainer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  createChild = (child = createItem()) => {
    const {keys, item, select, update} = this.props;
    select(keys.push(item.children.size));
    update(addChild(item, child));
  };

  itemTail = (keys: Keys, item: Item): Keys => {
    const last = item.children.last(null);
    if (last === null) return keys;
    else return this.itemTail(keys.push(item.children.size - 1), last);
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
        item={currentItem} key={key} selected={selected}
        select={select} keys={keys.push(key)}
        prev={itemPrev} next={itemNext}
        create={this.createChild}
        update={(next: Item) => update({
          ...item,
          children: item.children.set(key, next)
        })}
      />
    );
  };


  content = () => {
    const {keys, item} = this.props;
    return (
      <Consumer>
        {context => <div className='itemContent' onClick={() => context.edit(keys)}>{item.text}</div>}
      </Consumer>
    );
  };

  editing = () => (
    <input autoFocus value={this.props.item.text} onChange={e => {
      const next = {...this.props.item, text: e.currentTarget.value};
      this.props.update(next);
    }} />
  );

  up = () => {
    const {select, prev} = this.props;
    select(prev);
  };

  down = () => {
    const {select, next, item, keys} = this.props;
    if (item.children.size !== 0)
      select(keys.push(0));
    else
      select(next);
  };

  indent = () => {
    console.log('>');
  };

  unIndent = () => {
    console.log('<');
  };

  handleKeyDown = (e: React.KeyboardEvent) => {
    // console.log(e.key, e.keyCode);
    e.stopPropagation();
    switch (e.key) {
      case 'ArrowUp': return this.up();
      case 'ArrowDown': return this.down();
      case 'Enter': return this.props.create();
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) { return this.unIndent() }
        else { return this.indent() }
    }
  };


  render() {
    const {selected, keys} = this.props;
    const {children} = this.props.item;
    const isSelected = selected.equals(keys);

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
