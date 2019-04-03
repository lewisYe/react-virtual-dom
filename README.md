## 前言

本文主要实现一个基本的Virtual Dom 算法,并阐述清楚算法思路。

## 算法实现

具体的实现步骤分为3个步骤：

1. 用 JS 对象结构表示 DOM 结构，根据 JS 对象结构渲染真实DOM
2. 发生变更时，重新构造对象树，对比新树和旧树，记录差异
3. 差异渲染，视图更新

### 步骤一 ：JS对象模拟对象树

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

### 步骤二 ：Diff 算法

该部分是virtual dom 的核心，当数据变更时查找出前后2棵js对象树的差异。如果你要完整的对比两颗树的差异，那么你需要的时间复杂度是O(n ^ 3)，但是React 中的Diff算法时间复杂度 O(n )，它进行了一系列的优化。

优化：

1.同一层级的节点只会在同一层比较，不会垮层级。这样就可以达到了O(n)

2.使用key值来表示同级的子节点

具体的内容可以查看[官网文档](https://reactjs.org/docs/reconciliation.html)

### 树的深度遍历

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

