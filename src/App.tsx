import * as React from 'react';
import './App.css';
import { List } from "immutable";


interface State {
  focus: List<number>;
}


class App extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
  }

  public render() {

    return (
      <div className="App">
        <h1>Memoko</h1>
      </div>
    );
  }
}

export default App;
