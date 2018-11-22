import * as React from 'react';
import './App.css';
import { buildEditor, createItem, findItemById, findItemByPath, Item, Path } from "../item";
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
  loading: boolean;
}


const HOST = "http://localhost:8080";


interface Row {
  id: string;
  content: string;
  parent: string | null;
  fold: boolean;
  metadata: object;
  favorite: boolean;
  tags: Array<string>;
  created: string;
  modified: string;
}


type RowMap = { [parent: string]: Array<Row> };


const buildTreeByRowMap = (row: Row, map: RowMap): Item => {
  let children;
  if (map[row.id] !== undefined) {
    children = List(map[row.id].map(row => buildTreeByRowMap(row, map)))
  }
  else {
    children = List()
  }
  return (
    {
      id: row.id,
      children,
      editor: buildEditor(row.content),
      expand: !row.fold,
    }
  )
};


const buildTree = (data: Array<Row>): Item => {
  let root: Row | null = null;
  let rowMap: RowMap = {};
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const parent = row.parent;
    if (parent === null) {
      root = row
    }
    else if (rowMap.hasOwnProperty(parent)) {
      rowMap[parent].push(row);
    }
    else {
      rowMap[parent] = [row];
    }
  }
  if (root === null) {
    return createItem('');
  }
  else {
    return buildTreeByRowMap(root, rowMap);
  }
};



class App extends React.Component<Props, State> {
  update = (root: Item, callback?: () => void) => this.setState({ root }, callback);

  getTreeFromServer = () => {

    fetch(HOST.concat("/item/"))
      .then(response => response.json())
      .then(data => {
        const root = buildTree(data);
        this.setState({ root, loading: false });
      });
  };

  constructor(props: Props) {
    super(props);
    const root = createItem('');
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
      const item = findItemByPath(root, path);
      if (item === null || item.id !== id) {
        return <NotFound/>
      }
    }
    else {
      const result = findItemById(root, id);
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
