import * as React from 'react';
import { findItemByPath, Item, itemLinkLocation, Path } from "../item";
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
    const list = paths.map(path => {
      const item = findItemByPath(root, path);
      if (item === null)
        throw Error("can't found item by path");
      return (
        <li className="Breadcrumb-item">
          <Link to={ itemLinkLocation(item.id, path) }>
            { item.editor.getCurrentContent().getPlainText() }
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
