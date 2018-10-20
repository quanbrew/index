import * as React from 'react';
import './App.css';
import { Item, randomTree } from "../item";
import { Root } from "./Root";


interface Props {
}

interface State {
  root: Item;
}


class App extends React.Component<Props, State> {
  update = (root: Item, callback?: () => void) => this.setState({ root }, callback);

  constructor(props: Props) {
    super(props);
    const root = randomTree();
    this.state = { root };
  }

  public render() {
    return (
      <main className='App'>
        <Root item={ this.state.root } update={ this.update }/>
      </main>
    );
  }
}

export default App;
