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


const rootKeys = List();

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

  public render() {
    const { root, selected } = this.state;

    return (
      <main className="App">
        <ul>
          <ItemContainer
            item={ root } update={ this.update } select={ this.edit } create={ empty }
            selected={ selected } path={ rootKeys } next={ rootKeys } prev={ rootKeys }
            indent={ empty } unIndent={ empty }
          />
        </ul>
      </main>
    );
  }
}

export default App;
