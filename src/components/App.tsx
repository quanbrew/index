import * as React from 'react';
import './App.css';
import { findItemById, findItemByPath, Item, Path, randomTree } from "../item";
import { ItemList } from "./ItemList";
import { BrowserRouter as Router, Route, RouteComponentProps } from "react-router-dom";
import { Switch } from "react-router";
import { NotFound } from "./NotFound";
import ScrollToTop from "./ScrollToTop";
import { List } from "immutable";


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

  renderItemById = (routeProps: RouteComponentProps<{ id: string }>) => {
    const { match } = routeProps;
    const { root } = this.state;
    const targetPathArray = routeProps.location.state["targetPathArray"];
    let path;
    if (targetPathArray !== undefined) {
      path = List(targetPathArray as Array<number>);
      const item = findItemByPath(root, path);
      if (item === null) {
        return <NotFound/>
      }
    }
    else {
      const result = findItemById(root, match.params.id);
      if (result === null) {
        return <NotFound/>;
      }
      path = result.path;
    }
    return this.renderItem(path);
  };

  renderItem = (path?: Path) => {
    const item = this.state.root;
    if (path === undefined)
      path = List();
    return (
      <ItemList
        key={ item.id }
        item={ item }
        update={ this.update }
        // only render items which start with this path
        startPath={ path }
      />
    )
  };

  public render() {
    return (
      <Router>
        <ScrollToTop>
          <main className='App'>
            <Switch>
              <Route path="/" exact render={ () => this.renderItem() }/>
              <Route path="/id/:id" render={ this.renderItemById }/>
              <Route component={ NotFound }/>
            </Switch>
          </main>
        </ScrollToTop>
      </Router>
    );
  }
}

export default App;
