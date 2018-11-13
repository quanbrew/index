import * as React from 'react';
import { findItemByPath, Item, itemLinkLocation, Path } from "../item";
import { Link } from "react-router-dom";


interface Props {
  root: Item;
  path: Path;
}


interface State {
}


const makeLi = (item: Item, path: Path) => (
  <li>
    <Link to={ itemLinkLocation(item.id, path) }>
      { item.editor.getCurrentContent().getPlainText() }
    </Link>
  </li>
);


export class Breadcrumb extends React.Component<Props, State> {
  render() {
    const { path, root } = this.props;
    if (path.isEmpty())
      return null;
    let paths = [];
    for (let i = 0; i < path.size; i++) {
      paths.push(path.slice(0, i));
    }
    const list = paths.map(path => {
      const item = findItemByPath(root, path);
      if (item === null)
        throw Error("can't found item by path");
      return makeLi(item, path);
    });
    return (
      <ol>{ list }</ol>
    );
  }
} 
