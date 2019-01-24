import * as React from 'react';
import { Item, Path } from "../item";
import { Link } from "react-router-dom";
import "./Breadcrumb.css"

const ReactMarkdown = require("react-markdown");
const removeMd = require('remove-markdown');

interface Props {
  root: Item;
  path: Path;
}


interface State {
}


export class Breadcrumb extends React.PureComponent<Props, State> {
  static source(item: Item) {
    const source = removeMd(item.source);
    const max = 24;
    if (source.length <= max) {
      return source;
    }
    else {
      return source.substring(0, max - 1).concat("…");
    }
  }

  item = (path: Path, key: number) => {
    const item = Item.findByPath(this.props.root, path);
    if (item === null) {
      throw Error("can't found item by path");
    }
    return (
      <li key={ key } className="Breadcrumb-item">
        <Link to={ Item.linkLocation(item.id, path) }>
          <ReactMarkdown allowedTypes={ ['text'] } unwrapDisallowed source={ Breadcrumb.source(item) }/>
        </Link>
      </li>
    );
  };

  render() {
    const { path } = this.props;
    if (path.isEmpty()) {
      return null;
    }
    let paths = [];
    for (let i = 1; i < path.size; i++) {
      paths.push(path.slice(0, i));
    }
    return (
      <ol className="Breadcrumb">
        <li className="Breadcrumb-item Breadcrumb-root"><Link to="/">Home</Link></li>
        { paths.map(this.item) }
      </ol>
    );
  }
} 
