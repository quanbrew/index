import * as React from 'react';
import './Bullet.css';


interface Props {
  onClick: () => void;
  expand: boolean;
  hasChild: boolean;
}


interface State {
}


export class Bullet extends React.PureComponent<Props, State> {
  render() {
    const { onClick, hasChild, expand } = this.props;
    let symbol = '•';
    if (hasChild && expand) {
      symbol = '-';
    }
    else if (hasChild && !expand) {
      symbol = '+';
    }
    return <a className='bullet' onClick={ onClick }>{ symbol }</a>;
  }
}
