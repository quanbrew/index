import * as React from 'react';
import { Link } from "react-router-dom";
import './Bullet.css';
import { Path } from "../item";


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
    const path = this.props.path.toJS();
    const pathname = `/id/${ this.props.id }`;
    return <Link className='bullet' to={ { pathname, state: { targetPathArray: path } } }>•</Link>;
  }
}
