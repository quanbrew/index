import * as React from 'react';
import './App.css';
import { Item, randomTree } from "../Item";
import { ItemContainer, Modification } from "./ItemContainer";
import { List } from "immutable";
import { empty } from "../utils";


export type Path = List<number>;


interface State {
  root: Item;
}


const rootPath = List();

class App extends React.Component<{}, State> {
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
  update = (root: Item, callback?: () => void) => this.setState({ root }, callback);

  constructor(props: {}) {
    super(props);
    this.root = React.createRef();
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
    const { root } = this.state;

    const modifying: Modification = {
      editing: undefined,
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
            ref={ this.root }
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
