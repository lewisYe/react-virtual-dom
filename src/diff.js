
function diff(oldTree, newTree) {
  var index = 0;
  var patches = {};
  dfswalk(oldTree, newTree, index, patches)
  return patches;
}

function dfswalk(oldNode, newNode, index, patches) {
  var currentPatch = [];

  if (newNode === null) {
    // 没有新节点不需要做anything
  } else if (isString(oldNode) && isString(newNode)) { // 如果新旧节点都是文本节点
    if (oldNode !== newNode) {
      currentPatch.push({ type: 'TEXT', content: newNode })
    }
  } else if (oldNode.type === newNode.type && oldNode.key === newNode.key) { // 如果新旧节点类型 和 key 都没有改变
    var propsPatches = diffProps(oldNode, newNode);// 比较新旧节点的属性差异
    if (propsPatches.length) {
      currentPatch.push({ type: 'PROPS', props: propsPatches })
    }
    diffChildren(oldNode.children, newNode.children, index, patches, currentPatch)
  } else {
    currentPatch.push({ type: 'REPLACE', node: newNode })
  }

  if (currentPatch.length) {
    patches[index] = currentPatch;
  }
}

function diffChildren(oldChildren, newChildren, index, patches, currentPatch) {
  var diffs = listDiff(oldChildren, newChildren, 'key'); // 在 listdiff 文件
  newChildren = diffs.children;
  if (diffs.moves.length) {
    var reorderPatch = { type: 'REORDER', moves: diffs.moves }
    currentPatch.push(reorderPatch)
  }

  var leftNode = null;
  var currentNodeIndex = index; // 简单的说就是深度优先遍历的第几个元素
  oldChildren.forEach(function (child, i) {
    var newChild = newChildren[i];
    currentNodeIndex = (leftNode && leftNode.count) ? currentNodeIndex + leftNode.count + 1 : currentNodeIndex + 1;
    dfswalk(child, newChild, currentNodeIndex, patches);
    leftNode = child
  })
}

// 比较新旧节点的props值是否改变
function diffProps(oldNode, newNode) {
  var count = 0; // 用于统计是否有变更
  var oldProps = oldNode.props;
  var newProps = newNode.props;

  var key, value;
  var propsPatches = {};

  // 遍历旧节点的props值
  for (key in oldProps) {
    value = oldProps[key];
    if (newProps[key] !== value) { // 比较新节点中对应的值是否改变
      count++;
      propsPatches[key] = newProps[key]; // 将新值放入patches中
    }
  }

  // 遍历新属性
  for (key in newProps) {
    value = newProps[key];
    if (!oldProps.hasOwnProperty(key)) { // 判断在旧节点中是否存在该属性
      count++;
      propsPatches[key] = newProps[key]; // 不存在时将新值放入patches中
    }
  }

  if (count === 0) {
    return null
  }

  return propsPatches;
}

function isString(str) {
  return typeof str === 'string'
}