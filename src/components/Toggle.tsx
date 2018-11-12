import * as React from 'react';
import "./Toggle.css";


interface Props {
  isExpanded: boolean;
  toggle: () => void;
}


interface State {
}


export class Toggle extends React.Component<Props, State> {
  render() {
    return <a className="toggle" onClick={ this.props.toggle }>{ this.props.isExpanded ? ' - ' : ' + ' }</a>;
  }
} 
