import * as React from 'react';
import './App.css';
import { findItem, Item, randomTree } from "../item";
import { Root } from "./Root";
import { BrowserRouter as Router, Route, RouteComponentProps } from "react-router-dom";
import { Switch } from "react-router";
import { NotFound } from "./NotFound";


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

  renderItemById = ({ match }: RouteComponentProps<{ id: string }>) => {
    const item = findItem(this.state.root, match.params.id);
    if (item === null)
      return <NotFound/>;
    else
      return <Root item={ item } update={ this.update }/>;
  };

  public render() {
    const root = this.state.root;
    return (
      <Router>
        <main className='App'>
          <Switch>
            <Route path="/" exact render={ () => <Root item={ root } update={ this.update }/> }/>
            <Route path="/:id" render={ this.renderItemById }/>
            <Route component={ NotFound }/>
          </Switch>
        </main>
      </Router>
    );
  }
}

export default App;
