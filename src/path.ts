import { List } from "immutable";

export type Path = List<number>;


export const isSubPathOf = (subPath: Path, path: Path): boolean => {
  if (path.size < subPath.size) {
    return false;
  }
  else {
    const xs = path.zipWith((a, b) => a === b, subPath);
    return xs.indexOf(false) === -1;
  }
};
