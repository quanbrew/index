import * as React from 'react';
import './App.css';
import { Item, randomTree } from "../Item";
import { ItemContainer, Modification } from "./ItemContainer";
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
    const root = randomTree();
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

    const modifying: Modification = {
      editing: selected,
      indent: empty,
      unIndent: empty,
      remove: empty,
      create: this.createChild,
      update: this.update,
    };

    return (
      <main className='App'>
        <div className='items'>
          <ItemContainer
            item={ root } edit={ this.edit }
            path={ rootPath } next={ rootPath } prev={ rootPath }
            modifying={ modifying }
          />
        </div>
      </main>
    );
  }
}

export default App;
