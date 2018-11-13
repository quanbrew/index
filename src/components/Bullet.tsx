import * as React from 'react';
import { Link } from "react-router-dom";
import './Bullet.css';
import { itemLinkLocation, Path } from "../item";


interface Props {
  expand: boolean;
  hasChild: boolean;
  id: string;
  path: Path;
}


interface State {
}


export class Bullet extends React.PureComponent<Props, State> {
  render() {
    const { path, id } = this.props;
    return <Link className='bullet' to={ itemLinkLocation(id, path) }>•</Link>;
  }
}
