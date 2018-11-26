import * as React from 'react';
import "./Toggle.css";


interface Props {
  isExpanded: boolean;
  toggle: () => void;
}


interface State {
}


export class Toggle extends React.PureComponent<Props, State> {
  handleClick = () => {
    this.props.toggle();
  };
  render() {
    return <a className="toggle" onClick={ this.handleClick }>{ this.props.isExpanded ? ' - ' : ' + ' }</a>;
  }
} 
