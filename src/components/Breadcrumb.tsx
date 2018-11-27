import * as React from 'react';
import { Item, Path } from "../item";
import { Link } from "react-router-dom";
import "./Breadcrumb.css"


interface Props {
  root: Item;
  path: Path;
}


interface State {
}


export class Breadcrumb extends React.PureComponent<Props, State> {
  render() {
    const { path, root } = this.props;
    if (path.isEmpty())
      return null;
    let paths = [];
    for (let i = 1; i < path.size; i++) {
      paths.push(path.slice(0, i));
    }
    const list = paths.map((path, key) => {
      const item = Item.findByPath(root, path);
      if (item === null)
        throw Error("can't found item by path");
      return (
        <li key={ key } className="Breadcrumb-item">
          <Link to={ Item.linkLocation(item.id, path) }>
            { item.source }
          </Link>
        </li>
      );
    });
    return (
      <ol className="Breadcrumb">
        <li className="Breadcrumb-item Breadcrumb-root"><Link to="/">Home</Link></li>
        { list }
      </ol>
    );
  }
} 
