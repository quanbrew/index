import * as React from 'react';
import './App.css';
import { addChild, createItem, Item } from "../Item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";
import { empty } from "../utils";


export type Path = List<number>;


interface State {
  root: Item;
  selected?: Path;
}


const rootPath = List();

class App extends React.Component<{}, State> {
  edit = (selected?: Path) => this.setState({ selected });
  update = (root: Item, callback?: () => void) => this.setState({ root }, callback);

  constructor(props: {}) {
    super(props);
    const root = addChild(
      createItem('root'),
      addChild(
        createItem('foobar'),
        createItem('hello, world')
      ),
    );
    this.state = { root };
  }

  createChild = (item: Item) => {
    const { root } = this.state;
    const children = root.children.push(item);
    const select = () => this.edit(rootPath.push(children.size - 1));
    return this.update({ ...root, children }, select);
  };

  public render() {
    const { root, selected } = this.state;

    return (
      <main className='App'>
        <div className='items'>
          <ItemContainer
            item={ root } update={ this.update } edit={ this.edit }
            editing={ selected } path={ rootPath } next={ rootPath } prev={ rootPath }
            create={ this.createChild }
            indent={ empty } unIndent={ empty } remove={ empty }
          />
        </div>
      </main>
    );
  }
}

export default App;
