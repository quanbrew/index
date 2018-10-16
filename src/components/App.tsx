import * as React from 'react';
import './App.css';
import { addChild, createItem, Item } from "../Item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";


export type Keys = List<number>;


interface State {
  root: Item;
  selected: Keys;
}


interface Context {
  edit: (selected: Keys) => void;
}


export const {Provider, Consumer} = React.createContext<Context>({ edit: () => {} });


class App extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    const root = addChild(
      createItem('root'),
      createItem('hello, world')
    );
    this.state = {root, selected: List()};
  }

  edit = (selected: Keys) => this.setState({selected});

  update = (root: Item) => this.setState({root});

  public render() {
    const {root, selected} = this.state;


    return (
      <main className="App">
        <Provider value={{edit: this.edit}}>
          <ItemContainer
            item={root} update={this.update}
            selected={selected} keys={List()} zoom
          />
        </Provider>
      </main>
    );
  }
}

export default App;
