import { get, writable } from "svelte/store";

const initialState = {
  nodesById: {},
  rootIds: [],
};

const cacheStore = writable(initialState);

export const bookmarkCache = { subscribe: cacheStore.subscribe };

function normalizeNode(node, { includeChildren = false } = {}) {
  const hasExplicitChildren = Array.isArray(node.children);
  const children = hasExplicitChildren ? [...node.children] : [];
  const sortedChildren = includeChildren
    ? children.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    : [];
  const folderChildren = children.filter((child) => !child.url);
  const hasFolderChildren = folderChildren.length > 0;
  return {
    id: node.id,
    parentId: node.parentId ?? null,
    title: node.title ?? "",
    url: node.url ?? null,
    index: typeof node.index === "number" ? node.index : 0,
    isFolder: !node.url,
    childrenIds: includeChildren ? sortedChildren.map((child) => child.id) : [],
    childrenLoaded: includeChildren,
    hasChildren:
      !node.url &&
      (includeChildren || hasExplicitChildren ? hasFolderChildren : true),
  };
}

function setNodes(nodes) {
  cacheStore.update((state) => {
    const nodesById = { ...state.nodesById };
    let rootIds = [...state.rootIds];
    for (const node of nodes) {
      const existing = nodesById[node.id];
      nodesById[node.id] = existing ? { ...existing, ...node } : node;
      if (!node.parentId && !rootIds.includes(node.id)) {
        rootIds.push(node.id);
      }
    }
    rootIds.sort((a, b) => {
      const aNode = nodesById[a];
      const bNode = nodesById[b];
      return (aNode?.index ?? 0) - (bNode?.index ?? 0);
    });
    return { ...state, nodesById, rootIds };
  });
}

function updateParentChildren(parentId, childIds, markLoaded) {
  cacheStore.update((state) => {
    const nodesById = { ...state.nodesById };
    const parent = nodesById[parentId];
    if (!parent) {
      return state;
    }
    const uniqueChildIds = Array.from(new Set(childIds));
    uniqueChildIds.sort((a, b) => {
      const aNode = nodesById[a];
      const bNode = nodesById[b];
      return (aNode?.index ?? 0) - (bNode?.index ?? 0);
    });
    const hasFolderChildren = uniqueChildIds.some((childId) => nodesById[childId]?.isFolder);
    nodesById[parentId] = {
      ...parent,
      childrenIds: uniqueChildIds,
      childrenLoaded: markLoaded ? true : parent.childrenLoaded,
      hasChildren: hasFolderChildren,
    };
    return { ...state, nodesById };
  });
}

export function resetBookmarkCache() {
  cacheStore.set(initialState);
}

export async function bootstrapBookmarkCache(chromeApi) {
  const tree = await chromeApi.bookmarks.getTree();
  const root = Array.isArray(tree) ? tree[0] : null;
  const topLevel = root?.children ?? [];
  const normalized = topLevel.map((node) => normalizeNode(node, { includeChildren: false }));
  cacheStore.set({
    nodesById: Object.fromEntries(normalized.map((node) => [node.id, node])),
    rootIds: normalized.map((node) => node.id),
  });
  return normalized.map((node) => node.id);
}

/**
 * Eagerly load the entire folder tree into the cache.
 * This eliminates lazy loading issues by ensuring all folder nodes
 * are available with their children information.
 */
export async function loadEntireFolderTree(chromeApi) {
  const tree = await chromeApi.bookmarks.getTree();
  const root = Array.isArray(tree) ? tree[0] : null;
  if (!root) {
    return [];
  }

  const allNodes = [];
  const rootIds = [];

  // Recursively process the entire tree
  function processNode(node, isRoot = false) {
    const hasChildren = Array.isArray(node.children);
    const children = hasChildren ? [...node.children] : [];
    const sortedChildren = children.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const folderChildren = sortedChildren.filter((child) => !child.url);
    
    const normalized = {
      id: node.id,
      parentId: node.parentId ?? null,
      title: node.title ?? "",
      url: node.url ?? null,
      index: typeof node.index === "number" ? node.index : 0,
      isFolder: !node.url,
      childrenIds: sortedChildren.map((child) => child.id),
      childrenLoaded: true, // Always true since we're loading everything
      hasChildren: folderChildren.length > 0,
    };

    if (!node.url) {
      allNodes.push(normalized);
      if (isRoot) {
        rootIds.push(node.id);
      }
    }

    // Recursively process folder children
    for (const child of folderChildren) {
      processNode(child, false);
    }
  }

  // Process top-level nodes (under the invisible root)
  const topLevel = root.children ?? [];
  for (const node of topLevel) {
    processNode(node, true);
  }

  // Update the store with all nodes at once
  cacheStore.set({
    nodesById: Object.fromEntries(allNodes.map((node) => [node.id, node])),
    rootIds: rootIds,
  });

  return rootIds;
}

export function getBookmarkCacheState() {
  return get(cacheStore);
}

export function getNodeById(id) {
  return get(cacheStore).nodesById[id];
}

export function subscribeBookmarkCache(run) {
  return cacheStore.subscribe(run);
}

export async function ensureChildrenLoaded(chromeApi, nodeId) {
  const state = get(cacheStore);
  const current = state.nodesById[nodeId];
  if (!current || !current.isFolder || current.childrenLoaded) {
    return current?.childrenIds?.map((childId) => state.nodesById[childId]).filter(Boolean) ?? [];
  }
  const children = await chromeApi.bookmarks.getChildren(nodeId);
  const sorted = [...children].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const normalizedChildren = sorted.map((child) => normalizeNode(child, { includeChildren: false }));
  setNodes(normalizedChildren);
  updateParentChildren(nodeId, normalizedChildren.map((child) => child.id), true);
  return normalizedChildren;
}

export async function loadSubtree(chromeApi, nodeId) {
  const subtree = await chromeApi.bookmarks.getSubTree(nodeId);
  const root = Array.isArray(subtree) ? subtree[0] : null;
  if (!root) {
    return { folderIds: [] };
  }
  const queue = [root];
  const processed = [];
  const folderIds = [];
  while (queue.length) {
    const node = queue.shift();
    const includeChildren = Array.isArray(node.children);
    const normalized = normalizeNode(node, { includeChildren });
    processed.push(normalized);
    if (!node.url) {
      folderIds.push(node.id);
    }
    if (includeChildren) {
      queue.push(...node.children);
    }
  }
  setNodes(processed);
  processed.forEach((node) => {
    if (node.isFolder) {
      updateParentChildren(node.id, node.childrenIds, true);
    }
    if (node.parentId) {
      const state = get(cacheStore);
      const parent = state.nodesById[node.parentId];
      if (parent) {
        const childIds = parent.childrenIds ? [...parent.childrenIds] : [];
        childIds.push(node.id);
        updateParentChildren(node.parentId, childIds, parent.childrenLoaded);
      }
    }
  });
  return { folderIds };
}

export function collectLoadedFolderDescendants(id, includeSelf = false) {
  const state = get(cacheStore);
  const node = state.nodesById[id];
  if (!node || !node.isFolder) {
    return [];
  }
  const result = [];
  if (includeSelf) {
    result.push(id);
  }
  const stack = [...(node.childrenIds ?? [])].filter((childId) => {
    const childNode = state.nodesById[childId];
    return childNode?.isFolder;
  });
  while (stack.length) {
    const nextId = stack.pop();
    const nextNode = state.nodesById[nextId];
    if (!nextNode) {
      continue;
    }
    if (nextNode.isFolder) {
      result.push(nextId);
      if (nextNode.childrenIds?.length) {
        nextNode.childrenIds.forEach((childId) => {
          const childNode = state.nodesById[childId];
          if (childNode?.isFolder) {
            stack.push(childId);
          }
        });
      }
    }
  }
  return result;
}

export function getFolderPath(id) {
  const state = get(cacheStore);
  const path = [];
  let current = state.nodesById[id];
  while (current) {
    if (current.title) {
      path.unshift(current.title);
    }
    if (!current.parentId) {
      break;
    }
    current = state.nodesById[current.parentId];
  }
  return path;
}

export function applyCreatedNode(node) {
  const normalized = normalizeNode(node, { includeChildren: false });
  setNodes([normalized]);
  if (normalized.parentId) {
    const parent = getNodeById(normalized.parentId);
    const childIds = parent?.childrenIds ? [...parent.childrenIds] : [];
    childIds.splice(normalized.index ?? childIds.length, 0, normalized.id);
    updateParentChildren(normalized.parentId, childIds, parent?.childrenLoaded);
  }
}

export function applyChangedNode(id, changes) {
  cacheStore.update((state) => {
    const target = state.nodesById[id];
    if (!target) {
      return state;
    }
    const nodesById = { ...state.nodesById, [id]: { ...target, ...changes } };
    return { ...state, nodesById };
  });
}

export function applyMovedNode(id, { parentId, oldParentId, index }) {
  cacheStore.update((state) => {
    const nodesById = { ...state.nodesById };
    const node = nodesById[id];
    if (!node) {
      return state;
    }
    const updated = { ...node, parentId, index: typeof index === "number" ? index : node.index };
    nodesById[id] = updated;

    if (oldParentId && nodesById[oldParentId]) {
      const prevParent = nodesById[oldParentId];
      const filtered = (prevParent.childrenIds ?? []).filter((childId) => childId !== id);
      const hasFolderChildren = filtered.some((childId) => nodesById[childId]?.isFolder);
      nodesById[oldParentId] = {
        ...prevParent,
        childrenIds: filtered,
        hasChildren: hasFolderChildren,
      };
    }

    if (parentId && nodesById[parentId]) {
      const nextParent = nodesById[parentId];
      const nextChildren = [...(nextParent.childrenIds ?? [])];
      if (!nextChildren.includes(id)) {
        nextChildren.splice(index ?? nextChildren.length, 0, id);
      }
      const hasFolderChildren = nextChildren.some((childId) => nodesById[childId]?.isFolder);
      nodesById[parentId] = {
        ...nextParent,
        childrenIds: nextChildren,
        hasChildren: hasFolderChildren,
      };
    }

    return { ...state, nodesById };
  });
}

export function applyRemovedNode(id, { parentId }) {
  cacheStore.update((state) => {
    const nodesById = { ...state.nodesById };
    const toRemove = new Set([id]);
    const queue = [id];
    while (queue.length) {
      const current = queue.pop();
      const node = nodesById[current];
      if (!node) {
        continue;
      }
      if (node.childrenIds?.length) {
        node.childrenIds.forEach((childId) => {
          if (!toRemove.has(childId)) {
            toRemove.add(childId);
            queue.push(childId);
          }
        });
      }
    }
    toRemove.forEach((nodeId) => {
      delete nodesById[nodeId];
    });
    let rootIds = state.rootIds;
    if (rootIds.includes(id)) {
      rootIds = rootIds.filter((rootId) => rootId !== id);
    }
    if (parentId && nodesById[parentId]) {
      const parent = nodesById[parentId];
      const filtered = (parent.childrenIds ?? []).filter((childId) => childId !== id);
      const hasFolderChildren = filtered.some((childId) => nodesById[childId]?.isFolder);
      nodesById[parentId] = {
        ...parent,
        childrenIds: filtered,
        hasChildren: hasFolderChildren,
      };
    }
    return { ...state, nodesById, rootIds };
  });
}

export function getDescendantFolderIds(id) {
  const state = get(cacheStore);
  const result = [];
  const stack = [id];
  while (stack.length) {
    const currentId = stack.pop();
    const node = state.nodesById[currentId];
    if (!node) {
      continue;
    }
    if (node.isFolder) {
      result.push(currentId);
      if (node.childrenIds?.length) {
        node.childrenIds.forEach((childId) => {
          const childNode = state.nodesById[childId];
          if (childNode?.isFolder) {
            stack.push(childId);
          }
        });
      }
    }
  }
  return result;
}

export function buildSearchIndex() {
  const state = get(cacheStore);
  return Object.values(state.nodesById)
    .filter((node) => node.isFolder)
    .map((node) => ({
      id: node.id,
      title: node.title ?? "",
      path: getFolderPath(node.id),
    }));
}
