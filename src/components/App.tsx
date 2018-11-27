import * as React from 'react';
import './App.css';
import { Item, Path } from "../item";
import { ItemList } from "./ItemList";
import { BrowserRouter as Router, Route, RouteComponentProps } from "react-router-dom";
import { Switch } from "react-router";
import { NotFound } from "./NotFound";
import ScrollToTop from "./ScrollToTop";
import { List } from "immutable";
import { getAllItem, IS_LOCAL } from "../api";
import randomTree = Item.randomTree;


interface Props {
}

interface State {
  root: Item;
  loading: boolean;
}


class App extends React.Component<Props, State> {
  update = (root: Item, callback?: () => void) => this.setState({ root }, callback);

  getTreeFromServer = () => {
    let future: Promise<Item>;
    if (IS_LOCAL) {
      future = new Promise((resolve) => {
        resolve(randomTree(1000));
      });
    }
    else {
      future = getAllItem();
    }
    future
      .then(root => {
        this.setState({ root, loading: false });
      });
  };

  constructor(props: Props) {
    super(props);
    const root = Item.create();
    this.state = { root, loading: true };
  }

  componentDidMount() {
    this.getTreeFromServer();
  }

  renderItemById = (routeProps: RouteComponentProps<{ id: string }>) => {
    const { match, location } = routeProps;
    const { root } = this.state;
    const { id } = match.params;
    let path;
    const targetPathArray = location.state && location.state["targetPathArray"];
    if (targetPathArray !== undefined) {
      path = List(targetPathArray as Array<number>);
      const item = Item.findByPath(root, path);
      if (item === null || item.id !== id) {
        return <NotFound/>
      }
    }
    else {
      const result = Item.findById(root, id);
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
        root={ item }
        update={ this.update }
        // only render items which start with this path
        startPath={ path }
      />
    )
  };

  public render() {
    if (this.state.loading) {
      return <main><p>loading</p></main>;
    }

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
