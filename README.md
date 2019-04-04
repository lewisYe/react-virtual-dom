# 前言

本文主要实现一个基本的Virtual Dom 算法,并阐述清楚算法思路。

# 算法实现

具体的实现步骤分为3个步骤：

1. 用 JS 对象结构表示 DOM 结构，根据 JS 对象结构渲染真实DOM
2. 发生变更时，重新构造对象树，对比新树和旧树，记录差异
3. 差异渲染，视图更新

## 步骤一 ：JS对象模拟对象树

用对象来表示一个DOM节点，那么你需要记录他的类型，属性，子节点等。

```
function Element (type,props,children){
  this.type = type;
  this.props = props || {};
  this.children = children
}
```

那么举个例子如何表示下述的dom结构

```
// 真实dom
<ul id='list'>
  <li class='item'>Item 1</li>
  <li class='item'>Item 2</li>
  <li class='item'>Item 3</li>
</ul>

// 代码实现

var ul = new Element('ul',{id:'list'},[
  el('li',{class:'item'},['Item 1']),
  el('li',{class:'item'},['Item 2']),
  el('li',{class:'item'},['Item 3'])
])
```

现在已经得到了JS对象表示的DOM结构，接下里的是渲染成真实DOM。

```
Element.prototype.render = function() {
  var el = document.createElement(this.type); // 根据类型创建节点
  var props = this.props
  // 遍历设置属性
  for (var propsName in props) {
    var propsValue = props[propsName];
    setAttr(el, propsName, propsValue);
  }

  var children = this.children || [];

  children.forEach(function (child) {
    var childEl = (child instanceof Element) ? child.render() : document.createTextNode(child);
    el.appendChild(childEl)
  })

  return el
}

var root = ul.render()
document.body.appendChild(root)
```

这样就可以转换为真实DOM 渲染啦。

完整的代码见 [element.js](https://github.com/lewisYe/react-virtual-dom/blob/master/src/element.js)

## 步骤二 ：Diff 算法

该部分是virtual dom 的核心，当数据变更时查找出前后2棵js对象树的差异。如果你要完整的对比两颗树的差异，那么你需要的时间复杂度是O(n ^ 3)，但是React 中的Diff算法时间复杂度 O(n )，它进行了一系列的优化。

优化：

1.同一层级的节点只会在同一层比较，不会垮层级。这样就可以达到了O(n)

2.使用key值来表示同级的子节点

具体的内容可以查看[官网文档](https://reactjs.org/docs/reconciliation.html)

### 树的深度优先遍历

具体代码实现，会对树进行深度优先遍历，每遍历到一个节点时就把该节点和新节点对比，如果有差异的话记录到一个对象中。

新旧节点的对比可能有以下几种情况

- 节点type 或者key 改变了，这就直接替换旧节点，也不需要遍历子节点
- 新旧节点type 或者key 相同时，比较props是否改变 和 遍历子节点
- 没有新节点，不需要操作

代码实现

```
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

```

####  节点属性变更的判断

1. 遍历旧的属性列表，查看每个属性是否还存在于新的属性列表中或者值发生改变
2. 遍历新属性列表，看属性是否都存在于旧属性列表中

```
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
```

#### 列表节点差异算法

该算法的关键在于要拥有唯一的标识key值。

假设现在可以英文字母唯一地标识每一个子节点：

旧的节点顺序：

```
a b c d e f g h i
```

现在对节点进行了删除、插入、移动的操作。新增`j`节点，删除`e`节点，移动`h`节点：

新的节点顺序：

```
a b c h d f g i j
```

现在知道了新旧的顺序，求最小的插入、删除操作（移动可以看成是删除和插入操作的结合）。这个问题抽象出来其实是字符串的最小编辑距离问题（[Edition Distance](https://en.wikipedia.org/wiki/Edit_distance)），最常见的解决算法是 [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)，通过动态规划求解，时间复杂度为 O(M * N)。但是我们并不需要真的达到最小的操作，我们只需要优化一些比较常见的移动情况，牺牲一定DOM操作，让算法时间复杂度达到线性的（O(max(M, N))。

代码主要步骤

1. 对比旧的节点礼拜中的节点是否已经在新的节点列表中被去除
2. 遍历新节点看节点顺序是否移动

完整代码[listdiff.js](https://github.com/lewisYe/react-virtual-dom/blob/master/src/listdiff.js)

### 遍历所有子节点

```
function diffChildren(oldChildren, newChildren, index, patches, currentPatch) {
  var diffs = listDiff(oldChildren, newChildren, 'key'); // 在 listdiff 文件
  newChildren = diffs.children;  //得到列表对比后的节点列表
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
```

完整代码[diff.js](https://github.com/lewisYe/react-virtual-dom/blob/master/src/diff.js)

## 步骤三：差异渲染到真实DOM

经过步骤二我们已经得到了所有的差异`patches`对象，这时我们只需要遍历DOM树，将对应节点的差异局部更新就可以了。

```
function patch(node, patches) {
  var walker = { index: 0 };
  dfsWalk(node, walker, patches)
}

function dfsWalk(node, walker, patches) {
  var currentPatches = patches[walker.index];

  var len = node.childNodes ? node.childNodes.length : 0;

  for (var i = 0; i < len; i++) {
    var child = node.childNodes[i];
    walker.index++;
    dfsWalk(child, walker, patches);
  }

  if (currentPatches) {
    applyPatches(node, currentPatches)
  }
}

function applyPatches(node, currentPatches) {
  currentPatches.forEach(function (currentPatch) {
    switch (currentPatch.type) {
      case 'REPLACE':
        var newNode = (typeof currentPatch.node === 'string') ? document.createTextNode(currentPatch.node) : currentPatch.node.render()
        node.parentNode.replaceChild(newNode, node);
        break;
      case 'REORDER':
        reorderChildren(node, currentPatch.moves)
        break;
      case 'PROPS':
        setProps(node, currentPatch.props)
        break;
      case 'TEXT':
        if (node.textContent) {
          node.textContent = currentPatch.content;
        } else {
          node.nodeValue = currentPatch.content;
        }
        break
      default:
        throw new Error('Unknown patch type' + currentPatch.type)
        break;
    }
  })
}

```

完整代码可见 [patch.js](https://github.com/lewisYe/react-virtual-dom/blob/master/src/patch.js)。

# 总结

到这里一个简单的具有基本功能的virtual dom 就实现了，当然还有很多细节需要优化。

### 思考问题

1.为什么产生深度优先遍历 而不是广度优先遍历

个人理解

深度优先搜素算法：不全部保留结点，占用空间少；有回溯操作(即有入栈、出栈操作)，运行速度慢。

广度优先搜索算法：保留全部结点，占用空间大； 无回溯操作(即无入栈、出栈操作)，运行速度快。

所以，当搜索树的结点较多，用其它方法易产生内存溢出时，深度优先搜索不失为一种有效的求解方法。 　

### 参考资料

[如何实现一个 Virtual DOM 算法](https://github.com/livoras/blog/issues/13)

[Reconciliation](https://reactjs.org/docs/reconciliation.html)



