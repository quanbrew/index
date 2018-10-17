import * as React from 'react';
import './App.css';
import { addChild, createItem, Item } from "../Item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";
import { empty } from "../utils";


export type Keys = List<number>;


interface State {
  root: Item;
  selected?: Keys;
}


// interface Context {
// }
// export const {Provider, Consumer} = React.createContext<Context>({});

const rootKeys = List();

class App extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    const root = addChild(
      createItem('root'),
      addChild(
        createItem('foobar'),
        createItem('hello, world')
      ),
    );
    this.state = {root};
  }

  edit = (selected?: Keys) => this.setState({selected});

  update = (root: Item, callback?: () => void) => this.setState({root}, callback);

  public render() {
    const {root, selected} = this.state;

    return (
      <main className="App">
        <ul>
        <ItemContainer
          item={root} update={this.update} select={this.edit} create={empty} zoom
          selected={selected} keys={rootKeys} next={rootKeys} prev={rootKeys}
          indent={empty} unIndent={empty}
        />
        </ul>
      </main>
    );
  }
}

export default App;
