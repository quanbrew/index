import * as React from 'react';
import { Item, Path } from "../item";
import { ItemContainer } from "./ItemContainer";
import { List } from "immutable";


interface Props {
  item: Item;
  update: (next: Item, callback?: () => void) => void;
}


interface State {
  editing?: Path;
}


const rootPath = List();


export class Root extends React.Component<Props, State> {
  root: React.RefObject<ItemContainer>;
  edit = (editing?: Path, callback?: () => void) => {
    if (editing !== this.state.editing)
      this.setState({ editing }, callback)
  };

  updateRoot = (mapper: (tree: Item) => Item, callback?: () => void) => {
    const root = mapper(this.props.item);
    this.props.update(root, callback);
  };

  componentDidMount() {
  }

  constructor(props: Props) {
    super(props);
    this.root = React.createRef();
    this.state = { editing: undefined }
  }

  public render() {
    const { item } = this.props;

    return (
      <div className='items'>
        <ItemContainer
          ref={ this.root }
          item={ item } edit={ this.edit } editing={ this.state.editing }
          path={ rootPath } next={ rootPath } prev={ rootPath }
          updateTree={ this.updateRoot }
        />
      </div>
    );
  }
}
