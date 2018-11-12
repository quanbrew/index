import * as React from 'react';
import { Link } from "react-router-dom";
import './Bullet.css';


interface Props {
  expand: boolean;
  hasChild: boolean;
  id: string;
}


interface State {
}


export class Bullet extends React.PureComponent<Props, State> {
  render() {
    const zoomPath = `/${ this.props.id }`;
    return <Link className='bullet' to={ zoomPath }>•</Link>;
  }
}
