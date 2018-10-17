import * as React from 'react';
import './App.css';
import { addChild, createItem, Item } from "../Item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";
import { empty } from "../utils";


export type Keys = List<number>;


interface State {
  root: Item;
  selected: Keys;
}


interface Context {
  edit: (selected: Keys) => void;
}


export const {Provider, Consumer} = React.createContext<Context>({ edit: empty });

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
    this.state = {root, selected: rootKeys};
  }

  edit = (selected: Keys) => this.setState({selected});

  update = (root: Item) => this.setState({root});

  public render() {
    const {root, selected} = this.state;


    return (
      <main className="App">
        <Provider value={{edit: this.edit}}>
          <ul>
          <ItemContainer
            item={root} update={this.update} select={this.edit} create={empty} zoom
            selected={selected} keys={rootKeys} next={rootKeys} prev={rootKeys}
            indent={empty}
          />
          </ul>
        </Provider>
      </main>
    );
  }
}

export default App;
