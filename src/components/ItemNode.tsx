import * as React from 'react';
import { Item, Path, UpdateItem } from "../item";
import './ItemNode.css';
import 'draft-js/dist/Draft.css';
import { Bullet } from "./Bullet";
import { Line } from "./Line";
import { EditState } from "./ItemList";
import { Select } from "../utils";
import { Toggle } from "./Toggle";
import { List } from "immutable";
import { deleteItem, IS_LOCAL, postChangedItems } from "../api";
import { EditorState } from "draft-js";
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
  loading: boolean;
}


export class ItemNode extends React.Component<Props, State> {
  submitTimer: Timer | null = null;
  submitRecord: UpdateItem;

  private update(item: Item, callback?: () => void) {
    const { updateTree, path } = this.props;
    updateTree(tree => Item.modify(tree, path, () => item), callback)
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
      tree => Item.modify(
        Item.remove(tree, path),
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
    if (path.size < 2) {
      return;
    }
    const parent = path.pop();
    const next = parent.update(parent.size - 1, x => x + 1);
    updateTree(
      tree => Item.insert(Item.remove(tree, path), [item], next),
      () => edit({ path: next })
    );
  };

  private remove = (skipChildrenCheck?: boolean) => {
    const { updateTree, path, edit, prev, item } = this.props;
    const index = path.last(null);
    if (index === null || (skipChildrenCheck !== true && !item.children.isEmpty())) return;
    const focus = { column: -1, row: -1 };
    const editing: EditState = { path: prev, selection: { focus } };
    updateTree(tree => Item.remove(tree, path), () => edit(editing));
    if (!IS_LOCAL) {
      deleteItem(this.props.item.id).catch(console.warn);
    }
  };

  private onEnter = (hasContent: boolean) => {
    // if content is empty and item is last item in siblings, indent it.
    const { path, next, updateTree, edit, item } = this.props;
    const isLastItem = next.size < path.size;
    if (isLastItem && path.size > 1 && !hasContent) {
      return this.unIndent();
    }
    let items = [Item.create()];
    let createPath: Path;
    if (item.children.isEmpty()) {
      createPath = path.set(path.size - 1, path.last(-1) + 1);
    } else {
      createPath = path.push(0);
    }
    updateTree(
      tree => Item.insert(tree, items, createPath),
      () => edit({ path: createPath })
    );
  };

  swap = (direction: 'Prev' | 'Next') => {
    const { edit, next, prev, path, item, updateTree } = this.props;
    let target: Path;
    if (direction === 'Prev' && path.last(0) !== 0) {
      target = prev;
    } else if (direction === 'Next' && path.size === next.size) {
      target = next;
    } else {
      return;
    }
    updateTree(
      tree => Item.insert(Item.remove(tree, path), [item], target),
      () => edit({ path: target })
    );
  };

  navigateNext = (selection?: Select) => {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0 && item.expand) {
      edit({ path: path.push(0), selection }); // enter next level
    } else if (!path.isEmpty() && next.isEmpty()) {
      return;
    }
    else {
      edit({ path: next, selection });
    }
  };

  navigatePrev = (selection?: Select) => {
    const { edit, prev } = this.props;
    edit({ path: prev, selection });
  };

  constructor(props: Props) {
    super(props);
    const { item, parentId, previousId } = props;
    this.submitRecord = UpdateItem.fromItem(item, parentId, previousId);
    let loading = false;
    this.state = { loading };
  }

  submitChanged = () => {
    const { item, parentId, previousId } = this.props;
    const newItem = UpdateItem.fromItem(item, parentId, previousId);
    if (!UpdateItem.isSame(this.submitRecord, newItem)) {
      postChangedItems([newItem])
        .then(() => {
          this.submitRecord = newItem;
        });
    }
  };

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    const { editing, path, item, start, prev } = this.props;
    return (
      item.expand !== nextProps.item.expand
      || item.children !== nextProps.item.children
      || nextProps.editing !== undefined && Path.isSubPathOf(nextProps.path, nextProps.editing.path)
      || editing !== undefined && Path.isSubPathOf(path, editing.path)
      || !prev.equals(nextProps.prev)
      || item.editor !== nextProps.item.editor
      || start !== nextProps.start
    );
  }

  componentDidUpdate() {
    if (!IS_LOCAL) {
      if (this.submitTimer !== null) {
        clearTimeout(this.submitTimer);
      }
      this.submitTimer = setTimeout(this.submitChanged, 750);
    }
  }

  dispatch(start: Path) {
    const { item, path, editing, edit, updateTree } = this.props;
    if (!Path.isSubPathOf(path, start)) {
      return null;
    }

    const emptyPath = List();
    return item.children.map((child, index) => {
      const childPath = path.push(index);
      return (
        <ItemNode
          item={ child } key={ child.id } edit={ edit }
          updateTree={ updateTree } start={ start } editing={ editing }
          path={ childPath } prev={ emptyPath } next={ childPath }
          parentId={ item.id } previousId={ null }
        />
      )
    });
  }

  handleChange = (editor: EditorState, callback: () => void) => {
    const source = editor.getCurrentContent().getPlainText();
    this.update({ ...this.props.item, editor, source }, callback);
  };

  lineEdit = (selection: Select, callback: () => void) => {
    return this.props.edit({ path: this.props.path, selection }, callback);
  };

  exit = (callback: () => void) => {
    this.props.edit(undefined, callback)
  };

  renderChildren() {
    const { path, item, next, updateTree, edit, editing } = this.props;
    let items = [];
    let index = 0;
    let prevItem: Item | null = null;
    let prevPath = path; // move to parent
    for (let child of item.children) {
      let previousId = null;

      if (index !== 0 && prevItem !== null) {
        previousId = prevItem.id;
        if (prevItem.expand) {
          prevPath = Item.tail(prevPath, prevItem);
        }
      }
      const nextPath = index < item.children.size - 1 ? path.push(index + 1) : next;
      const thisPath = path.push(index);
      items.push(
        <ItemNode
          item={ child } key={ child.id } editing={ editing }
          path={ thisPath } prev={ prevPath } next={ nextPath } edit={ edit }
          updateTree={ updateTree } start="started"
          parentId={ item.id } previousId={ previousId }
        />
      );
      index += 1;
      prevItem = child;
      prevPath = thisPath;
    }
    return <div className='children'>{ items }</div>;
  }

  renderLoading() {
    return (
      <div className="item-loading">
        <p>loading...</p>
      </div>
    )
  }

  render() {
    const { item, path, editing, start } = this.props;
    if (start !== "started" && !start.equals(path)) {
      return this.dispatch(start);
    }
    const isEditing = editing !== undefined && path.equals(editing.path);
    const hasChild = !item.children.isEmpty();
    return (
      <div className='ItemContainer'>
        <div className="item-content">
          { hasChild ? <Toggle toggle={ this.toggle } isExpanded={ item.expand }/> : null }
          <Bullet id={ item.id } expand={ item.expand } hasChild={ hasChild } path={ path }/>
          <Line
            onChange={ this.handleChange }
            editor={ item.editor } isEditing={ isEditing } source={ item.source }
            edit={ this.lineEdit }
            exit={ this.exit }
            onEnter={ this.onEnter }
            navigateNext={ this.navigateNext } navigatePrev={ this.navigatePrev }
            indent={ this.indent } unIndent={ this.unIndent }
            remove={ this.remove } toggle={ this.toggle } swap={ this.swap }
          />
        </div>
        { item.expand ? (this.state.loading ? this.renderLoading() : this.renderChildren()) : null }
      </div>
    );
  }
}

