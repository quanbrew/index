import * as React from 'react';
import { Item } from "../Item";
import { Consumer, Keys } from "./App";


interface Props {
  item: Item,
  update: (next: Item) => void;
  selected: Keys;
  keys: Keys;
  zoom?: boolean;
}


interface State {
}


export class ItemContainer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }


  items = (item: Item, key: number) => (
    <ItemContainer
      item={item} key={key} selected={this.props.selected}
      keys={this.props.keys.push(key)}
      update={(next: Item) => this.props.update({
        ...this.props.item,
        children: this.props.item.children.set(key, next)
      })}
    />
  );


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


  render() {
    const {selected, keys} = this.props;
    const {children} = this.props.item;
    const isSelected = selected.equals(keys);

    return (
      <li>
        {isSelected ? this.editing() : this.content() }
        <ul>
          {children.map(this.items)}
        </ul>
      </li>
    );
  }
}
