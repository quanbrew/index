import * as React from 'react';
import { Link } from "react-router-dom";

interface Props {
  id: string;
}


interface State {
}


export class Zoom extends React.PureComponent<Props, State> {

  render() {
    const zoomPath = `/${ this.props.id }`;

    return (
      <Link to={ zoomPath }>zoom</Link>
    );
  }
} 
