import * as React from 'react';
import { createItem, insert, isSubPathOf, Item, itemTail, mapLocation, Path, remove } from "../item";
import './ItemContainer.css';
import 'draft-js/dist/Draft.css';
import { Bullet } from "./Bullet";
import { Line } from "./Line";
import { EditState } from "./ItemList";
import { Select } from "../utils";
import { Toggle } from "./Toggle";
import { List } from "immutable";
import Timer = NodeJS.Timer;


interface Props {
  item: Item,
  path: Path;
  next: Path;
  prev: Path;
  parentId: string | null;
  previousId: string | null;
  // start render at this path.
  start: Path | 'started';
  editing?: EditState;
  edit: (state?: EditState, callback?: () => void) => void;
  updateTree: (mapper: (prev: Item) => Item, callback?: () => void) => void;
}


interface State {
  loadChildren: boolean;
  source: string;
}


interface NewItem {
  id: string,
  content: string,
  parent: string | null,
  previous: string | null,
  metadata: object,
}


export class ItemContainer extends React.Component<Props, State> {
  submitTimer: Timer | null = null;

  private update(item: Item, callback?: () => void) {
    const { updateTree, path } = this.props;
    updateTree(tree => mapLocation(tree, path, () => item), callback)
  }

  private toggle = (setExpand?: boolean) => {
    const { item, path, edit } = this.props;
    const expand = setExpand === undefined ? !item.expand : setExpand;
    this.update({ ...item, expand }, () => edit({ path }));
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
      () => edit({ path: sibling.push(newIndex) })
    );
  };

  private unIndent = () => {
    const { updateTree, path, item, edit } = this.props;
    if (path.size < 2) return;
    const parent = path.pop();
    const next = parent.update(parent.size - 1, x => x + 1);
    updateTree(
      tree => insert(remove(tree, path), [item], next),
      () => edit({ path: next })
    );
  };

  private remove = (skipChildrenCheck?: boolean) => {
    const { updateTree, path, edit, prev, item } = this.props;
    const index = path.last(null);
    if (index === null || (skipChildrenCheck !== true && !item.children.isEmpty())) return;
    const focus = { column: -1, row: -1 };
    const editing: EditState = { path: prev, selection: { focus } };
    updateTree(tree => remove(tree, path), () => edit(editing));
  };

  private displayChild = (currentItem: Item, index: number) => {
    const { path, item, prev, next, updateTree, edit, editing } = this.props;

    let prevPath = prev;
    let previousId = null;
    const prevItem = item.children.get(index - 1);

    if (index === 0) {
      prevPath = path; // move to parent
    }
    else if (prevItem !== undefined) {
      previousId = prevItem.id;
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
        updateTree={ updateTree } start="started"
        parentId={ item.id } previousId={ previousId }
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
      updateTree(
        tree => insert(tree, [createItem()], createPath),
        () => edit({ path: createPath })
      );
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
      () => edit({ path: target })
    );
  };

  navigateNext = (selection?: Select) => {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0 && item.expand)
      edit({ path: path.push(0), selection }); // enter next level
    else if (!path.isEmpty() && next.isEmpty()) return;
    else {
      edit({ path: next, selection })
    }
  };

  navigatePrev = (selection?: Select) => {
    const { edit, prev } = this.props;
    edit({ path: prev, selection });
  };

  constructor(props: Props) {
    super(props);
    const source = props.item.editor.getCurrentContent().getPlainText();
    this.state = { loadChildren: true, source };
    if (!props.item.children.isEmpty() && props.item.expand) {
      this.state = { loadChildren: false, source };
      setTimeout(() => {
        this.setState({ loadChildren: true });
        this.forceUpdate();
      }, 0);
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    const { editing, path, item, start } = this.props;
    return (
      item.expand !== nextProps.item.expand
      || item.children !== nextProps.item.children
      || nextProps.editing !== undefined && isSubPathOf(nextProps.path, nextProps.editing.path)
      || editing !== undefined && isSubPathOf(path, editing.path)
      || item.editor !== nextProps.item.editor
      || start !== nextProps.start
    );
  }

  componentDidUpdate() {
    if (this.submitTimer !== null) {
      clearTimeout(this.submitTimer);
    }
    this.submitTimer = setTimeout(() => {
      const source = this.props.item.editor.getCurrentContent().getPlainText();
      if (this.state.source !== source) {
        const { id } = this.props.item;
        const { previousId, parentId } = this.props;
        const newItem: NewItem = {
          id: id,
          content: source,
          metadata: {},
          parent: parentId,
          previous: previousId,
        };
        const HOST = process.env.HOST as string;
        fetch(
          HOST + "/item/",
          {
            method: "POST",
            body: JSON.stringify([newItem]),
            headers: { 'content-type': 'application/json' }
          },
        ).catch(console.error);
        this.setState({ source });
      }
    }, 250);
  }

  dispatch(start: Path) {
    const { item, path, editing, edit, updateTree } = this.props;
    if (!isSubPathOf(path, start)) {
      return null;
    }

    const emptyPath = List();
    return item.children.map((child, index) => {
      const childPath = path.push(index);
      return (
        <ItemContainer
          item={ child } key={ child.id } edit={ edit }
          updateTree={ updateTree } start={ start } editing={ editing }
          path={ childPath } prev={ emptyPath } next={ childPath }
          parentId={ item.id } previousId={ null }
        />
      )
    });
  }

  render() {
    const { item, path, editing, edit, start } = this.props;
    if (start !== "started" && !start.equals(path)) {
      return this.dispatch(start);
    }
    const isEditing = editing !== undefined && path.equals(editing.path);
    const children = item.expand ? (<div className='children'>{ item.children.map(this.displayChild) }</div>) : null;
    const hasChild = !item.children.isEmpty();
    return (
      <div className='ItemContainer'>
        <div className="item-content">
          { hasChild ? <Toggle toggle={ () => this.toggle() } isExpanded={ item.expand }/> : null }
          <Bullet id={ item.id } expand={ item.expand } hasChild={ hasChild } path={ path }/>
          <Line
            onChange={ (editor, callback) => this.update({ ...item, editor }, callback) }
            editor={ item.editor } isEditing={ isEditing }
            edit={ (selection, callback) => edit({ path, selection }, callback) }
            exit={ callback => edit(undefined, callback) }
            onEnter={ this.onEnter }
            navigateNext={ this.navigateNext } navigatePrev={ this.navigatePrev }
            indent={ this.indent } unIndent={ this.unIndent }
            remove={ this.remove } toggle={ this.toggle } swap={ this.swap }
          />
        </div>
        { this.state.loadChildren ? children : <p>loading...</p> }
      </div>
    );
  }

}

