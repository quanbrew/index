import * as React from 'react';
import { createItem, insert, isSubPathOf, Item, itemTail, mapLocation, Path, remove, update } from "../item";
import './ItemContainer.css';
import 'draft-js/dist/Draft.css';
import classNames from 'classnames';
import { Bullet } from "./Bullet";
import { Line } from "./Line";
import { Zoom } from "./Zoom";


interface Props {
  item: Item,
  path: Path;
  next: Path;
  prev: Path;
  editing?: Path;
  edit: (path?: Path, callback?: () => void) => void;
  updateTree: (mapper: (prev: Item) => Item, callback?: () => void) => void;
}


interface State {
  loadChildren: boolean;
}


export class ItemContainer extends React.Component<Props, State> {
  private update(item: Item, callback?: () => void) {
    const { updateTree, path } = this.props;
    updateTree(tree => update(tree, item, path), callback)
  }

  private toggle = (setExpand?: boolean) => {
    const { item, path, edit } = this.props;
    const expand = setExpand === undefined ? !item.expand : setExpand;
    this.update({ ...item, expand }, () => edit(path));
  };

  private indent = () => {
    const { updateTree, path, item, edit, prev } = this.props;
    if (prev.size < path.size)
      return;
    const sibling = prev.slice(0, path.size);
    let newIndex = 0;
    updateTree(
      tree => mapLocation(
        remove(tree, path),
        sibling,
        prevItem => {
          newIndex = prevItem.children.size;
          const children = prevItem.children.push(item);
          return { ...prevItem, children, expand: true }
        }
      ),
      () => edit(sibling.push(newIndex))
    );
  };

  private unIndent = () => {
    const { updateTree, path, item, edit } = this.props;
    if (path.size < 2) return;
    const parent = path.pop();
    const next = parent.update(parent.size - 1, x => x + 1);
    updateTree(tree => insert(remove(tree, path), [item], next), () => edit(next));
  };

  private remove = (skipChildrenCheck?: boolean) => {
    const { updateTree, path, edit, prev, item } = this.props;
    const index = path.last(null);
    if (index === null || (skipChildrenCheck !== true && !item.children.isEmpty())) return;
    updateTree(tree => remove(tree, path), () => edit(prev));
  };

  private displayChild = (currentItem: Item, index: number) => {
    const { path, item, prev, next, updateTree, edit, editing } = this.props;

    let prevPath = prev;
    const prevItem = item.children.get(index - 1);

    if (index === 0) prevPath = path; // move to parent
    else if (prevItem !== undefined) {
      if (prevItem.expand)
        prevPath = itemTail(path.push(index - 1), prevItem);
      else
        prevPath = path.push(index - 1);
    }
    const nextPath = index < item.children.size - 1 ? path.push(index + 1) : next;

    return (
      <ItemContainer
        item={ currentItem } key={ currentItem.id } editing={ editing }
        path={ path.push(index) } prev={ prevPath } next={ nextPath } edit={ edit }
        updateTree={ updateTree }
      />
    );
  };


  private onEnter = (hasContent: boolean) => {
    // if content is empty and item is last item in siblings, indent it.
    const { path, next, updateTree, edit } = this.props;
    const isLastItem = next.size < path.size;
    if (isLastItem && path.size > 1 && !hasContent) {
      this.unIndent();
    }
    else {
      const createPath = path.set(path.size - 1, path.last(-1) + 1);
      updateTree(tree => insert(tree, [createItem()], createPath), () => edit(createPath));
    }
  };


  swap = (direction: 'Prev' | 'Next') => {
    const { edit, next, prev, path, item, updateTree } = this.props;
    let target: Path;
    if (direction === 'Prev' && path.last(0) !== 0)
      target = prev;
    else if (direction === 'Next' && path.size === next.size)
      target = next;
    else
      return;
    updateTree(
      tree => insert(remove(tree, path), [item], target),
      () => edit(target)
    );
  };

  navigateNext = () => {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0 && item.expand)
      edit(path.push(0)); // enter next level
    else if (!path.isEmpty() && next.isEmpty()) return;
    else {
      edit(next)
    }
  };

  navigatePrev = () => {
    const { edit, prev } = this.props;
    edit(prev);
  };

  constructor(props: Props) {
    super(props);
    this.state = { loadChildren: true };
    if (!props.item.children.isEmpty() && props.item.expand) {
      this.state = { loadChildren: false };
      setTimeout(() => {
        this.setState({ loadChildren: true });
        this.forceUpdate();
      }, 0);
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    const { editing, path, item } = this.props;
    return (
      item.expand !== nextProps.item.expand
      || item.children !== nextProps.item.children
      || isSubPathOf(nextProps.path, nextProps.editing)
      || isSubPathOf(path, editing)
      || item.source !== nextProps.item.source
    );
  }

  render() {
    const { item, path, editing, edit } = this.props;
    const isEditing = path.equals(editing);
    const className = classNames('ItemContainer', { editing: isEditing });
    const children = item.expand ? (<div className='children'>{ item.children.map(this.displayChild) }</div>) : null;
    return (
      <div className={ className }>
        <div>
          <Bullet expand={ item.expand } hasChild={ !item.children.isEmpty() }/>
          <Zoom id={ item.id }/>
          <Line
            source={ item.source }
            onChange={ (source, callback) => this.update({ ...item, source }, callback) }
            isEditing={ isEditing }
            edit={ callback => edit(path, callback) }
            exit={ callback => edit(undefined, callback) }
            navigateNext={ this.navigateNext }
            navigatePrev={ this.navigatePrev }
            indent={ this.indent }
            unIndent={ this.unIndent }
            remove={ this.remove }
            toggle={ this.toggle }
            onEnter={ this.onEnter }
            swap={ this.swap }
          />
        </div>
        { this.state.loadChildren ? children : <p>loading...</p> }
      </div>
    );
  }

}

